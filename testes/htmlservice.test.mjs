// O HtmlService do Google tira os comentários dos <script> antes de servir a página. O leitor
// que ele usa não entende crases (template literals) e, depois delas, pode se perder: passa a
// achar que está fora de uma string quando está dentro, e vice-versa. Perdido, ele trata a barra
// dupla de um endereço como começo de comentário e corta o resto da linha. Foi o que travou a
// 2.7.0 em "Abrindo sua planilha…": a linha virou  const URL_INSTALADOR = 'https:  e o script
// inteiro deixou de rodar. Os testes no navegador não pegam isso, porque servem os arquivos crus.
//
// Regra (vale com o leitor do Google certo ou perdido): ele só consegue cortar o que começa com
// barra dupla ou barra-asterisco. Então essas duas sequências só aparecem para abrir um
// comentário de verdade, e o texto dos comentários não as contém:
//   - comentário de linha: a linha inteira, começando por barra dupla (sem barra-asterisco no texto);
//   - comentário de bloco: começa no início da linha (ou como  { /* texto */ }  num catch vazio),
//     sem barra dupla nem barra-asterisco no texto;
//   - em código, strings, crases e regex: nunca. Escreva https:\/\/ (o JavaScript lê como a barra
//     dupla), use [/] numa regex ou startsWith.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './gerar-versao.mjs';

const PAGINAS = ['src/Index.html', 'src/App.html', 'src/Estilos.html', 'instalador/Index.html'];
const PERIGO = /\/\/|\/\*/;
const COMENTARIO_EM_CATCH = /\{ \/\*[^*/]*\*\/ \}/g;

/** Trechos entre <script ...> e </script>, com a linha (1 = primeira) onde cada um começa. */
export function scriptsDoHtml(html) {
  const blocos = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const inicio = m.index + m[0].indexOf('>') + 1;
    blocos.push({ linha: html.slice(0, inicio).split('\n').length, codigo: m[1] });
  }
  return blocos;
}

/** Linhas (numeradas a partir de `linha`) com barra dupla ou barra-asterisco fora do lugar. */
export function trechosPerigosos(codigo, linha = 1) {
  const achados = [];
  let emBloco = false;
  codigo.split('\n').forEach((texto, i) => {
    const marcar = () => achados.push({ linha: linha + i, texto: texto.trim().slice(0, 120) });
    let resto = texto;
    if (emBloco) {
      const fim = resto.indexOf('*/');
      if (PERIGO.test(fim < 0 ? resto : resto.slice(0, fim))) return marcar();
      if (fim < 0) return;
      emBloco = false;
      resto = resto.slice(fim + 2);
    }
    const t = resto.trimStart();
    if (t.startsWith('//')) {
      if (t.includes('/*')) marcar();
      return;
    }
    if (t.startsWith('/*')) {
      const fim = t.indexOf('*/', 2);
      if (PERIGO.test(fim < 0 ? t.slice(2) : t.slice(2, fim))) return marcar();
      if (fim < 0) { emBloco = true; return; }
      resto = t.slice(fim + 2);
    }
    if (PERIGO.test(resto.replace(COMENTARIO_EM_CATCH, '{ }'))) marcar();
  });
  return achados;
}

test('a regra pega o caso que travou a 2.7.0 e aceita os comentários do projeto', () => {
  assert.equal(trechosPerigosos("const URL = 'https://script.google.com/x';").length, 1);
  assert.equal(trechosPerigosos('const u = (r) => `https://raw.githubusercontent.com/${r}`;').length, 1);
  assert.equal(trechosPerigosos('const ok = /^https:\\/\\/a\\.com\\//.test(x);').length, 1);
  assert.equal(trechosPerigosos("const s = '/* não */';").length, 1);
  assert.equal(trechosPerigosos('/* um endereço https://x no fim */').length, 1);
  assert.equal(trechosPerigosos('/* começo\n   meio com https://x\n*/').length, 1);
  assert.equal(trechosPerigosos('// comentário com /* dentro').length, 1);

  const bom = [
    "const URL = 'https:\\/\\/script.google.com/x';",
    'const u = (r) => `https:\\/\\/raw.githubusercontent.com/${r}`;',
    "const ok = /^https:\\/\\/a\\.com[/]/.test(x) || String(x).startsWith('https:\\/\\/b.com/');",
    '// comentário de linha, até com https://exemplo',
    '  /* bloco de uma linha */',
    '/* bloco',
    '   de várias linhas */ const depois = 1;',
    'try { f(); } catch (e) { /* ignora */ }',
  ].join('\n');
  assert.deepEqual(trechosPerigosos(bom), []);
});

test('nenhum <script> servido pelo HtmlService tem barra dupla ou barra-asterisco fora de comentário', () => {
  const problemas = [];
  for (const pagina of PAGINAS) {
    for (const bloco of scriptsDoHtml(readFileSync(join(RAIZ, pagina), 'utf8'))) {
      for (const a of trechosPerigosos(bloco.codigo, bloco.linha)) problemas.push(`${pagina}:${a.linha}  ${a.texto}`);
    }
  }
  assert.deepEqual(problemas, [], 'O Google pode cortar estas linhas ao servir a página (veja o topo deste teste):\n' + problemas.join('\n'));
});

test('o app tem script para conferir (a extração dos <script> funciona)', () => {
  const app = scriptsDoHtml(readFileSync(join(RAIZ, 'src/App.html'), 'utf8'));
  assert.equal(app.length, 1);
  assert.match(app[0].codigo, /function iniciar\(\)/);
  const instalador = scriptsDoHtml(readFileSync(join(RAIZ, 'instalador/Index.html'), 'utf8'));
  assert.ok(instalador.some((b) => /URL_CONFIG/.test(b.codigo)));
});

// Origens externas do app. Lista espelhada em docs/SEGURANCA.md (seção "Política de conteúdo (CSP)").
const ORIGENS_PERMITIDAS = new Set([
  'cdn.jsdelivr.net',
  'github.com',
  'raw.githubusercontent.com',
  'script.google.com',
  'www.googleapis.com',
]);
const ARQUIVOS_DE_ORIGEM = ['src/Index.html', 'src/App.html', 'src/Estilos.html', 'src/Codigo.gs'];
const ORIGEM_URL = /https?:(\\?\/){2}[a-zA-Z0-9.-]+/g;
const CARREGA_DE_FORA = [
  /<script\b[^>]*\ssrc\s*=\s*["']?(?:https?:)?\/\//i,
  /<link\b[^>]*\shref\s*=\s*["']?(?:https?:)?\/\//i,
  /@import\s+url\(\s*["']?(?:https?:)?\/\//i,
];

test('origens externas do app: só os hosts fixados em docs/SEGURANCA.md', () => {
  const hosts = new Set();
  for (const arquivo of ARQUIVOS_DE_ORIGEM) {
    const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
    for (const m of texto.matchAll(ORIGEM_URL)) hosts.add(m[0].replace(/^https?:(\\?\/){2}/, ''));
  }
  assert.ok(hosts.has('script.google.com'), 'a varredura não achou o host do Apps Script');
  for (const host of hosts) {
    assert.ok(ORIGENS_PERMITIDAS.has(host), `origem externa nova: ${host}; atualize docs/SEGURANCA.md e este teste`);
  }
});

test('nenhum script, link ou @import das páginas carrega arquivo de fora', () => {
  const problemas = [];
  for (const arquivo of ARQUIVOS_DE_ORIGEM.filter((a) => a.endsWith('.html'))) {
    const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
    for (const re of CARREGA_DE_FORA) if (re.test(texto)) problemas.push(`${arquivo}  ${re.source}`);
  }
  assert.deepEqual(problemas, [], 'o app não carrega código nem fonte de terceiros');
});
