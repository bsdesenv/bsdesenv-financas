// Gera o versao.json (canal de versões lido pelo app para avisar e conferir atualizações).
//   node testes/gerar-versao.mjs             grava o versao.json
//   node testes/gerar-versao.mjs --conferir  sai com 1 se o versao.json estiver desatualizado
//   node testes/gerar-versao.mjs --notas     imprime as notas da versão atual (para o Release)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

export const ARQUIVOS = [
  { nome: 'Codigo', tipo: 'SERVER_JS', caminho: 'src/Codigo.gs', editor: 'Código.gs' },
  { nome: 'Index', tipo: 'HTML', caminho: 'src/Index.html', editor: 'Index.html' },
  { nome: 'Estilos', tipo: 'HTML', caminho: 'src/Estilos.html', editor: 'Estilos.html' },
  { nome: 'App', tipo: 'HTML', caminho: 'src/App.html', editor: 'App.html' },
  { nome: 'appsscript', tipo: 'JSON', caminho: 'src/appsscript.json', editor: 'appsscript.json' },
];

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Devolve { data, corpo } da seção "## <versao> — <data>" do changelog, ou null.
export function secaoDoChangelog(changelog, versao) {
  const m = new RegExp(`^## ${escapar(versao)} [—-] (\\d{4}-\\d{2}-\\d{2})[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm').exec(changelog);
  return m ? { data: m[1], corpo: m[2].trim() } : null;
}

// Títulos em negrito dos itens, sem markdown e sem ponto final (no máximo 5).
export function extrairNovidades(corpo, maximo = 5) {
  const titulos = [];
  for (const linha of corpo.split('\n')) {
    const m = /^\s*[-*]\s+\*\*(.+?)\*\*/.exec(linha);
    if (m) titulos.push(m[1].replace(/[`*_]/g, '').replace(/\.+$/, '').trim());
  }
  return titulos.slice(0, maximo);
}

export function descreverArquivo(arquivo, raiz = RAIZ) {
  const bytes = readFileSync(join(raiz, arquivo.caminho));
  return { ...arquivo, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export function montarVersao(raiz = RAIZ, hoje = new Date().toISOString().slice(0, 10)) {
  const { version: versao } = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
  const secao = secaoDoChangelog(readFileSync(join(raiz, 'CHANGELOG.md'), 'utf8'), versao);
  return {
    app: 'bsdesenv-financas',
    versao,
    ref: `v${versao}`,
    data: secao ? secao.data : hoje,
    novidades: secao ? extrairNovidades(secao.corpo) : [],
    arquivos: ARQUIVOS.map((a) => descreverArquivo(a, raiz)),
  };
}

export const serializar = (versao) => JSON.stringify(versao, null, 2) + '\n';

function principal(args) {
  const destino = join(RAIZ, 'versao.json');
  const modo = args[0];
  if (modo === '--notas') {
    const { version } = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
    const secao = secaoDoChangelog(readFileSync(join(RAIZ, 'CHANGELOG.md'), 'utf8'), version);
    if (!secao) { console.error(`CHANGELOG.md não tem seção para a versão ${version}.`); return 1; }
    console.log(secao.corpo);
    return 0;
  }
  let atual = '';
  try { atual = readFileSync(destino, 'utf8'); } catch { /* ainda não existe */ }
  const esperado = montarVersao(RAIZ, atual ? safeData(atual) : undefined);
  const texto = serializar(esperado);
  if (modo === '--conferir') {
    if (atual === texto) { console.log(`versao.json em dia (${esperado.versao}).`); return 0; }
    console.error('versao.json está desatualizado. Rode: npm run versao');
    return 1;
  }
  writeFileSync(destino, texto);
  console.log(`versao.json gravado (${esperado.versao}, ${esperado.arquivos.length} arquivos).`);
  return 0;
}

// Sem seção no changelog, mantém a data já gravada para o --conferir não variar de dia para dia.
function safeData(texto) {
  try { return JSON.parse(texto).data; } catch { return undefined; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = principal(process.argv.slice(2));
}
