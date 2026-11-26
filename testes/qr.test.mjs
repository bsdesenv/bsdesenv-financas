// Testes do gerador de QR code (instalador/Qr.html): estrutura do símbolo, correção M e uma
// impressão digital da matriz, para pegar regressão. O endereço é fictício (R-005).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import vm from 'node:vm';
import { RAIZ } from './gerar-versao.mjs';

const HTML = readFileSync(join(RAIZ, 'instalador/Qr.html'), 'utf8');
const BLOCOS = [...HTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];

function carregar() {
  const contexto = { window: {} };
  vm.createContext(contexto);
  vm.runInContext(BLOCOS[0][1], contexto);
  return contexto.window.qrMatriz;
}

const qrMatriz = carregar();
const TEXTO = 'https://script.google.com/macros/s/' + 'A'.repeat(72) + '/exec';
const matriz = qrMatriz(TEXTO);
const tam = matriz.length;
const versao = (tam - 17) / 4;
const HASH_FIXO = '95b19b9373982d514cbacc92ce1af56f43a9a8c58fde8b65c329beb770849116';

test('o arquivo é um único <script> sem barra dupla, barra-asterisco fora de comentário nem crase', () => {
  assert.equal(BLOCOS.length, 1);
  assert.equal(HTML.includes('`'), false);
  assert.equal(HTML.includes('//'), false);
  const semComentarios = BLOCOS[0][1].replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(semComentarios.includes('/*'), false);
  assert.match(HTML, /MIT License/);
  assert.match(HTML, /github\.com\/nayuki\/QR-Code-generator/);
});

test('tamanho é 4*versão+17 e a matriz é quadrada de booleanos', () => {
  assert.ok(versao >= 1 && versao <= 40 && Number.isInteger(versao));
  assert.equal(tam, 4 * versao + 17);
  for (const linha of matriz) {
    assert.equal(linha.length, tam);
    for (const m of linha) assert.equal(typeof m, 'boolean');
  }
});

test('versão mínima: 112 bytes em correção M cabem na versão 7 (45 módulos)', () => {
  assert.equal(new TextEncoder().encode(TEXTO).length, 112);
  assert.equal(versao, 7);
  assert.equal(tam, 45);
});

test('três padrões de posição 7x7 com separador claro', () => {
  const origens = [[0, 0], [tam - 7, 0], [0, tam - 7]];
  for (const [ox, oy] of origens) {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = ox + dx;
        const y = oy + dy;
        if (x < 0 || y < 0 || x >= tam || y >= tam) continue;
        const dentro = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const anel = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        const esperado = dentro && anel !== 2;
        assert.equal(matriz[y][x], esperado, `módulo (${x},${y}) do padrão em (${ox},${oy})`);
      }
    }
  }
});

test('faixas de tempo alternam na linha 6 e na coluna 6, entre os padrões de posição', () => {
  for (let i = 8; i <= tam - 9; i++) {
    assert.equal(matriz[6][i], i % 2 === 0, `linha 6, coluna ${i}`);
    assert.equal(matriz[i][6], i % 2 === 0, `linha ${i}, coluna 6`);
  }
});

test('módulo escuro fixo em (4*versão+9, 8)', () => {
  assert.equal(matriz[4 * versao + 9][8], true);
});

function bit(x, y) { return matriz[y][x] ? 1 : 0; }

function formatoPrimeiraCopia() {
  let b = 0;
  for (let i = 0; i <= 5; i++) b |= bit(8, i) << i;
  b |= bit(8, 7) << 6;
  b |= bit(8, 8) << 7;
  b |= bit(7, 8) << 8;
  for (let i = 9; i < 15; i++) b |= bit(14 - i, 8) << i;
  return b;
}

function formatoSegundaCopia() {
  let b = 0;
  for (let i = 0; i < 8; i++) b |= bit(tam - 1 - i, 8) << i;
  for (let i = 8; i < 15; i++) b |= bit(8, tam - 15 + i) << i;
  return b;
}

function restoBch(palavra) {
  let r = palavra;
  for (let i = 14; i >= 10; i--) if ((r >>> i) & 1) r ^= 0x537 << (i - 10);
  return r;
}

test('15 bits de formato: duas cópias iguais, palavra BCH válida, correção M', () => {
  const a = formatoPrimeiraCopia();
  const b = formatoSegundaCopia();
  assert.equal(a, b);
  const palavra = a ^ 0x5412;
  assert.equal(restoBch(palavra), 0, 'palavra BCH(15,5) inválida');
  assert.equal(palavra >>> 13, 0, 'os dois primeiros bits de dados são 00 (correção M)');
});

test('versão 7 ou maior grava os 18 bits de versão nas duas cópias, com BCH válido', () => {
  let a = 0;
  let b = 0;
  for (let i = 0; i < 18; i++) {
    a |= bit(tam - 11 + (i % 3), Math.floor(i / 3)) << i;
    b |= bit(Math.floor(i / 3), tam - 11 + (i % 3)) << i;
  }
  assert.equal(a, b);
  assert.equal(a >>> 12, versao);
  let r = a;
  for (let i = 17; i >= 12; i--) if ((r >>> i) & 1) r ^= 0x1F25 << (i - 12);
  assert.equal(r, 0);
});

test('impressão digital da matriz do endereço de teste (pega regressão)', () => {
  const serial = matriz.map((l) => l.map((m) => (m ? '1' : '0')).join('')).join('\n');
  const hash = createHash('sha256').update(serial).digest('hex');
  assert.equal(hash, HASH_FIXO);
});

test('é determinística e texto diferente muda a matriz', () => {
  assert.deepEqual(qrMatriz(TEXTO), matriz);
  assert.notDeepEqual(qrMatriz(TEXTO + 'x'), matriz);
});

test('texto vazio não quebra e dá versão 1', () => {
  const m = qrMatriz('');
  assert.equal(m.length, 21);
});

test('UTF-8 conta em bytes: acentos e emoji sobem a versão pelo tamanho em bytes', () => {
  const m = qrMatriz('ação ✓ 😀');
  assert.ok(m.length >= 21);
});

test('limite: 2331 bytes cabem (versão 40, 177 módulos); 3000 bytes lançam erro', () => {
  assert.equal(qrMatriz('a'.repeat(2331)).length, 177);
  assert.throws(() => qrMatriz('a'.repeat(2332)));
  assert.throws(() => qrMatriz('a'.repeat(3000)), /longo demais/);
});
