/**
 * Imitação do Google e do GitHub para testar instalador/Codigo.gs no Node (sem rede).
 * Cada chamada de UrlFetchApp é registrada em `chamadas`. O Google falso guarda projetos,
 * versões e implantações de verdade, para os testes olharem o resultado e não só as chamadas.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sha256 = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
export const plano = (x) => JSON.parse(JSON.stringify(x));

const RAW = 'https://raw.githubusercontent.com/bsdesenv/bsdesenv-financas/';
const CDN = 'https://cdn.jsdelivr.net/gh/bsdesenv/bsdesenv-financas@';
const FONTES = { Codigo: 'SERVER_JS', Index: 'HTML', Estilos: 'HTML', App: 'HTML', appsscript: 'JSON' };

/** Monta uma versão publicada: { manifesto, arquivos: { caminho: texto } }. */
export function criarVersao(versao = '2.7.0', { novidades = ['Instalador'] } = {}) {
  const arquivos = {};
  const lista = Object.entries(FONTES).map(([nome, tipo]) => {
    const caminho = nome === 'Codigo' ? 'src/Codigo.gs' : nome === 'appsscript' ? 'src/appsscript.json' : `src/${nome}.html`;
    arquivos[caminho] = nome === 'Codigo' ? `// bsdesenv-financas\nvar VERSAO_APP = '${versao}';\n`
      : nome === 'appsscript' ? '{"runtimeVersion":"V8"}\n' : `<p>${nome} ${versao}</p>\n`;
    return { nome, tipo, caminho, editor: nome, bytes: arquivos[caminho].length, sha256: sha256(arquivos[caminho]) };
  });
  const manifesto = { app: 'bsdesenv-financas', versao, ref: 'v' + versao, data: '2026-11-24', novidades, arquivos: lista };
  return { manifesto, arquivos };
}

// ID do próprio projeto do instalador (scriptId real tem 57 caracteres).
export const ID_INSTALADOR = 'INSTALADOR' + '0'.repeat(47);
const MSG_USERSETTINGS = 'User has not enabled the Apps Script API. Enable it by visiting https://script.google.com/home/usersettings then retry.';

export function criarAmbiente({ apiLigada = true, autorizado = true, props = {} } = {}) {
  const env = {
    chamadas: [],      // { host, metodo, url, corpo }
    esperas: 0,
    arquivosGit: {},   // ref -> { caminho: texto }
    falhas: [],        // { casar(req), codigo, corpo, vezes } — vencem as rotas normais
    projetos: {},      // scriptId -> { title, files, versions, deployments }
    apiLigada,
    autorizado,        // false: ScriptApp pede autorização (consentimento granular não dado)
    planilhas: [],
    props: { ...props },
  };
  let seq = 0;

  env.publicar = (ref, versao, principal = false) => {
    env.arquivosGit[ref] = { ...versao.arquivos, 'versao.json': JSON.stringify(versao.manifesto) };
    if (principal) env.arquivosGit.main = { 'versao.json': JSON.stringify(versao.manifesto) };
  };
  env.projeto = (id, { titulo = 'Finanças', arquivos, implantacoes } = {}) => {
    env.projetos[id] = { title: titulo, files: arquivos || [], versions: [], deployments: implantacoes || [] };
    return env.projetos[id];
  };
  env.escritas = () => env.chamadas.filter((c) => c.host === 'google' && c.metodo !== 'GET');

  const resp = (codigo, corpo) => ({
    getResponseCode: () => codigo,
    getContentText: () => (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)),
  });

  function google(metodo, url, corpo) {
    if (url.startsWith('https://www.googleapis.com/drive/v3/files')) {
      if (metodo === 'PATCH') {
        const pl = env.planilhas.find((x) => x.id === url.split('/').pop());
        if (!pl) return resp(404, { error: { message: 'File not found' } });
        if (corpo.trashed) pl.trashed = true;
        return resp(200, { id: pl.id });
      }
      if (metodo === 'GET') {
        const pl = env.planilhas.find((x) => x.id === url.split('?')[0].split('/').pop());
        return pl ? resp(200, { name: pl.name, createdTime: pl.createdTime, appProperties: pl.appProperties }) : resp(404, { error: { message: 'File not found' } });
      }
      const id = 'PLANILHA' + String(++seq).padStart(14, '0');
      env.planilhas.push({ id, createdTime: new Date().toISOString(), ...corpo });
      return resp(200, { id, webViewLink: `https://docs.google.com/spreadsheets/d/${id}/edit` });
    }
    // Chave "API Google Apps Script" desligada: toda chamada ao script.googleapis.com volta o 403 do usersettings.
    if (!env.apiLigada) {
      return resp(403, { error: { code: 403, status: 'PERMISSION_DENIED', message: MSG_USERSETTINGS } });
    }
    const [rota, consulta = ''] = url.replace('https://script.googleapis.com/v1/', '').split('?');
    const query = Object.fromEntries(new URLSearchParams(consulta));
    const m = /^projects\/([^/]+)(?:\/(content|versions|deployments)(?:\/([^/]+))?)?$/.exec(rota);
    // Com a chave ligada, o próprio instalador existe mas a pessoa não tem acesso ao projeto dele.
    if (metodo === 'GET' && rota === 'projects/' + ID_INSTALADOR) {
      return resp(403, { error: { code: 403, status: 'PERMISSION_DENIED', message: 'The caller does not have permission' } });
    }
    if (metodo === 'POST' && rota === 'projects') {
      const id = 'SCRIPTNOVO' + String(++seq).padStart(14, '0');
      env.projeto(id, { titulo: corpo.title });
      env.projetos[id].parentId = corpo.parentId;
      return resp(200, { scriptId: id, title: corpo.title });
    }
    const p = m && env.projetos[m[1]];
    if (!p) return resp(404, { error: { message: 'Requested entity was not found.' } });
    const [, id, sub, depId] = m;
    if (!sub) return resp(200, { scriptId: id, title: p.title });
    if (sub === 'content') {
      if (metodo === 'PUT') p.files = plano(corpo.files);
      if (query.versionNumber) {
        const v = p.versions[Number(query.versionNumber) - 1];
        return v ? resp(200, { files: plano(v.files) }) : resp(404, { error: { message: 'Version not found' } });
      }
      return resp(200, { scriptId: id, files: plano(p.files) });
    }
    if (sub === 'versions') {
      if (metodo === 'GET') {
        // Páginas de `pageSize` versões; o pageToken é o índice da próxima.
        const de = Number(query.pageToken || 0), tam = Number(query.pageSize || 50);
        const lista = p.versions.map((v, i) => ({ versionNumber: i + 1, description: v.descricao }));
        const pagina = { versions: lista.slice(de, de + tam) };
        if (de + tam < lista.length) pagina.nextPageToken = String(de + tam);
        return resp(200, pagina);
      }
      p.versions.push({ descricao: corpo.description, files: plano(p.files) });
      return resp(200, { scriptId: id, versionNumber: p.versions.length, description: corpo.description });
    }
    if (metodo === 'GET') return resp(200, { deployments: plano(p.deployments) });
    if (metodo === 'POST') {
      const d = {
        deploymentId: 'IMPL' + String(++seq).padStart(20, '0'),
        deploymentConfig: { scriptId: id, versionNumber: corpo.versionNumber, description: corpo.description },
        entryPoints: [{ entryPointType: 'WEB_APP', webApp: { url: `https://script.google.com/macros/s/NOVA${seq}/exec` } }],
      };
      p.deployments.push(d);
      return resp(200, plano(d));
    }
    const d = p.deployments.find((x) => x.deploymentId === depId);
    if (!d) return resp(404, {});
    d.deploymentConfig = { ...d.deploymentConfig, versionNumber: corpo.deploymentConfig.versionNumber, description: corpo.deploymentConfig.description };
    return resp(200, plano(d));
  }

  function git(url) {
    const rawOuCdn = url.startsWith(RAW) ? url.slice(RAW.length) : url.slice(CDN.length);
    const barra = rawOuCdn.indexOf('/');
    const ref = url.startsWith(RAW) ? rawOuCdn.slice(0, barra) : rawOuCdn.slice(0, barra);
    const caminho = rawOuCdn.slice(barra + 1);
    const texto = (env.arquivosGit[ref] || {})[caminho];
    return texto === undefined ? resp(404, 'Not Found') : resp(200, texto);
  }

  function rotear(req) {
    const metodo = (req.method || 'get').toUpperCase();
    const url = req.url;
    const host = url.startsWith(RAW) ? 'raw' : url.startsWith(CDN) ? 'cdn' : 'google';
    const corpo = req.payload ? JSON.parse(req.payload) : undefined;
    env.chamadas.push({ host, metodo, url, corpo, auth: req.headers && req.headers.Authorization });
    for (const f of env.falhas) {
      if (f.vezes !== 0 && f.casar({ host, metodo, url, corpo })) {
        if (f.vezes > 0) f.vezes--;
        return resp(f.codigo, f.corpo === undefined ? {} : f.corpo);
      }
    }
    return host === 'google' ? google(metodo, url, corpo) : git(url);
  }

  const contexto = {
    console: { error() {}, log() {} },
    JSON, Array, Object, String, Number, RegExp, Error, Date, encodeURIComponent,
    UrlFetchApp: { fetch: (url, opcoes) => rotear({ ...opcoes, url }), fetchAll: (reqs) => reqs.map(rotear) },
    ScriptApp: {
      getOAuthToken: () => 'token-falso',
      getScriptId: () => ID_INSTALADOR,
      AuthMode: { FULL: 'FULL' },
      AuthorizationStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED' },
      getAuthorizationInfo: () => ({
        getAuthorizationStatus: () => (env.autorizado ? 'NOT_REQUIRED' : 'REQUIRED'),
        getAuthorizationUrl: () => 'https://accounts.google.com/autorizar-falso',
      }),
    },
    Utilities: {
      Charset: { UTF_8: 'UTF_8' },
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      // O Apps Script devolve bytes com sinal (-128..127), como aqui.
      computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(texto, 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
      sleep: () => { env.esperas++; },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in env.props ? env.props[k] : null) }) },
    HtmlService: {
      createHtmlOutputFromFile: (nome) => ({ getContent: () => `<script>/* ${nome} */</script>` }),
      createTemplateFromFile: (nome) => {
        const modelo = { nome };
        modelo.evaluate = () => {
          const saida = { nome, titulo: null, metas: {}, valores: { script: modelo.script, implantacao: modelo.implantacao }, ajustes: [] };
          saida.setTitle = (t) => { saida.titulo = t; return saida; };
          saida.addMetaTag = (k, v) => { saida.metas[k] = v; return saida; };
          saida.setFaviconUrl = (u) => { saida.favicon = u; return saida; };
          saida.setXFrameOptionsMode = (m) => { saida.ajustes.push('xframe:' + m); return saida; };
          env.ultimaPagina = saida;
          return saida;
        };
        return modelo;
      },
    },
  };
  vm.createContext(contexto);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'instalador', 'Codigo.gs'), 'utf8'), contexto, { filename: 'instalador/Codigo.gs' });
  env.ctx = contexto;
  return env;
}
