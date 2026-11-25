// Confere o canal de versões: versao.json em dia com o código, o package.json e o CHANGELOG.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ARQUIVOS, RAIZ, descreverArquivo, extrairNovidades, secaoDoChangelog } from './gerar-versao.mjs';

const ler = (c) => readFileSync(join(RAIZ, c), 'utf8');
const pacote = JSON.parse(ler('package.json'));
const versao = JSON.parse(ler('versao.json'));

test('versao.json existe, é JSON válido e identifica o app', () => {
  assert.equal(versao.app, 'bsdesenv-financas');
  assert.match(versao.data, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(versao.novidades) && versao.novidades.length <= 5);
});

test('versão igual no versao.json, no package.json e no Codigo.gs', () => {
  const noCodigo = /var VERSAO_APP = '([^']+)'/.exec(ler('src/Codigo.gs'))?.[1];
  assert.equal(versao.versao, pacote.version, 'rode: npm run versao');
  assert.equal(noCodigo, pacote.version);
  assert.equal(versao.ref, 'v' + versao.versao);
});

test('lista de arquivos é a esperada, na ordem', () => {
  assert.deepEqual(versao.arquivos.map(({ nome, tipo, caminho, editor }) => ({ nome, tipo, caminho, editor })), ARQUIVOS);
});

test('sha256 e bytes conferem com os arquivos atuais', () => {
  for (const a of versao.arquivos) {
    const real = descreverArquivo(a);
    assert.equal(a.sha256, real.sha256, `${a.caminho} mudou: rode npm run versao`);
    assert.equal(a.bytes, real.bytes, `${a.caminho} mudou: rode npm run versao`);
    assert.match(a.sha256, /^[0-9a-f]{64}$/);
  }
});

test('CHANGELOG tem seção para a versão atual', () => {
  assert.ok(secaoDoChangelog(ler('CHANGELOG.md'), pacote.version), `falta "## ${pacote.version} — AAAA-MM-DD" no CHANGELOG.md`);
});

const exemplo = `# Changelog

## 2.7.0 — 2026-11-24

### Novo
- **Aviso de versão nova.** Texto longo.
- **Atualização \`assistida\`** sem ponto
  continuação da linha.

### Mudou
- Item sem negrito.
- **Terceiro**: x
- **Quarto.** x
- **Quinto.** x
- **Sexto.** x

## 2.6.2 — 2026-11-22

- **Antiga.** x
`;

test('secaoDoChangelog acha a seção certa e a data', () => {
  const s = secaoDoChangelog(exemplo, '2.7.0');
  assert.equal(s.data, '2026-11-24');
  assert.ok(!s.corpo.includes('Antiga'));
  assert.equal(secaoDoChangelog(exemplo, '2.6.2').corpo, '- **Antiga.** x');
  assert.equal(secaoDoChangelog(exemplo, '9.9.9'), null);
});

test('extrairNovidades tira markdown e ponto final e limita a 5', () => {
  const novidades = extrairNovidades(secaoDoChangelog(exemplo, '2.7.0').corpo);
  assert.deepEqual(novidades, ['Aviso de versão nova', 'Atualização assistida', 'Terceiro', 'Quarto', 'Quinto']);
  assert.deepEqual(extrairNovidades('texto solto'), []);
});
