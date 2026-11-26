/**
 * Imitação mínima das APIs do Google Apps Script usadas pelo src/Codigo.gs,
 * para rodar o servidor de verdade dentro do Node (testes e harness do navegador).
 *
 * A planilha falsa imita o que importa do Google Sheets:
 *  - texto que parece número vira número ao ser gravado;
 *  - texto que começa com "=" vira fórmula (aqui marcado como "#FORMULA#...");
 *  - texto que começa com apóstrofo é guardado como texto, sem o apóstrofo.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(RAIZ, 'src');

function comoSheets(v) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') return v;
  if (v.startsWith('=')) return '#FORMULA#' + v;
  if (v.startsWith("'")) return v.slice(1);
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

export function criarPlanilha(abasIniciais = {}) {
  const abas = new Map();

  /** Contadores de custo: leituras e gravações feitas pelo servidor (não mudam o comportamento). */
  const contagem = { leituras: 0, gravacoes: 0, linhasLidas: 0, linhasGravadas: 0, abasGravadas: {} };
  const zerarContagem = () => {
    contagem.leituras = contagem.gravacoes = contagem.linhasLidas = contagem.linhasGravadas = 0;
    for (const nome of Object.keys(contagem.abasGravadas)) delete contagem.abasGravadas[nome];
  };
  /** Conta uma gravação de `linhas` linhas na aba `a` (setValues e clearContent). */
  const contar = (a, linhas) => {
    contagem.gravacoes++;
    contagem.linhasGravadas += linhas;
    contagem.abasGravadas[a.nome] = (contagem.abasGravadas[a.nome] || 0) + 1;
  };

  for (const [nome, linhas] of Object.entries(abasIniciais)) {
    abas.set(nome, { nome, dados: linhas.map((l) => l.map(comoSheets)) });
  }

  function faixa(a, r, c, nr, nc) {
    const f = {
      getValues: () => {
        contagem.leituras++;
        contagem.linhasLidas += nr;
        return Array.from({ length: nr }, (_, i) =>
          Array.from({ length: nc }, (_, j) => {
            const v = (a.dados[r - 1 + i] || [])[c - 1 + j];
            return v === undefined || v === null ? '' : v;
          }));
      },
      setValues: (m) => {
        if (m.length !== nr || m.some((l) => l.length !== nc)) throw new Error(`setValues: dimensões ${m.length}x${m[0]?.length} ≠ ${nr}x${nc}`);
        contar(a, nr);
        m.forEach((l, i) => {
          const linha = a.dados[r - 1 + i] || (a.dados[r - 1 + i] = []);
          l.forEach((v, j) => { linha[c - 1 + j] = comoSheets(v); });
        });
        return f;
      },
      clearContent: () => {
        contar(a, nr);
        for (let i = 0; i < nr; i++) {
          const linha = a.dados[r - 1 + i];
          if (linha) for (let j = 0; j < nc; j++) linha[c - 1 + j] = '';
        }
        return f;
      },
      setFontWeight: () => f,
      setNumberFormat: () => f,
      getSheet: () => folha(a),
    };
    return f;
  }

  function folha(a) {
    return {
      getName: () => a.nome,
      getLastRow: () => {
        let n = a.dados.length;
        while (n > 0 && (a.dados[n - 1] || []).every((v) => v === '' || v === null || v === undefined)) n--;
        return n;
      },
      getRange: (r, c, nr = 1, nc = 1) => faixa(a, r, c, nr, nc),
      setFrozenRows: () => {},
      appendRow: (l) => { a.dados.push(l.map(comoSheets)); },
    };
  }

  const ss = {
    getSheetByName: (n) => (abas.has(n) ? folha(abas.get(n)) : null),
    insertSheet: (n) => { abas.set(n, { nome: n, dados: [] }); return folha(abas.get(n)); },
    getId: () => 'planilha-de-teste',
    getName: () => 'Finanças (teste)',
    getUrl: () => 'https://docs.google.com/spreadsheets/d/planilha-de-teste/edit',
  };

  /** Linhas de dados (sem cabeçalho) de uma aba, para conferência nos testes. */
  const ler = (nome) => {
    const a = abas.get(nome);
    if (!a) return [];
    const n = folha(a).getLastRow();
    return a.dados.slice(1, n);
  };
  return { ss, abas, ler, contagem, zerarContagem };
}

function avaliarTemplate(nome, incluir) {
  const html = fs.readFileSync(path.join(SRC, nome + '.html'), 'utf8');
  return html.replace(/<\?!=\s*incluir\('(\w+)'\);?\s*\?>/g, (_, arq) => incluir(arq));
}

/** Carrega o src/Codigo.gs num contexto isolado, com as APIs falsas. */
export function criarServidor(abasIniciais = {}, opcoes = {}) {
  const planilha = criarPlanilha(abasIniciais);
  const meta = [];
  const saida = (conteudo) => {
    const o = {
      getContent: () => conteudo,
      setTitle: (t) => { o.titulo = t; return o; },
      addMetaTag: (n, v) => { meta.push([n, v]); return o; },
      setFaviconUrl: (u) => { o.favicon = u; return o; },
      setXFrameOptionsMode: () => o,
    };
    return o;
  };
  const ctx = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => planilha.ss, flush: () => {} },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    ScriptApp: {
      getScriptId: () => 'ID_DO_PROJETO_DE_TESTE',
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/ID_DA_IMPLANTACAO_DE_TESTE/exec' }),
    },
    Utilities: { getUuid: () => crypto.randomUUID() },
    HtmlService: {
      createHtmlOutputFromFile: (n) => saida(fs.readFileSync(path.join(SRC, n + '.html'), 'utf8')),
      createTemplateFromFile: (n) => ({ evaluate: () => saida(avaliarTemplate(n, (arq) => ctx.incluir(arq))) }),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(opcoes.codigo ?? fs.readFileSync(path.join(SRC, 'Codigo.gs'), 'utf8'), ctx, { filename: 'Codigo.gs' });
  return { ctx, planilha, meta, contagem: planilha.contagem, zerarContagem: planilha.zerarContagem };
}

/** Converte um JSON de backup (v1 ou v2) em linhas de abas no formato da v1. */
export function abasDoBackup(d) {
  const lanc = [['id', 'ano', 'mes', 'dia', 'categoriaId', 'descricao', 'valor']];
  const orc = [['ano', 'categoriaId', 'mes', 'valor']];
  for (const [ano, bloco] of Object.entries(d.anos)) {
    for (const l of bloco.lancamentos || []) lanc.push([l.id, ano, l.mes, l.dia ?? '', l.categoriaId, l.descricao || '', l.valor]);
    for (const [cid, meses] of Object.entries(bloco.orcamento || {})) {
      for (const [mes, v] of Object.entries(meses)) orc.push([ano, cid, Number(mes), v]);
    }
  }
  return {
    lancamentos: lanc,
    categorias: [['id', 'nome', 'grupo', 'ordem'], ...d.categorias.map((c) => [c.id, c.nome, c.grupo, c.ordem])],
    orcamento: orc,
    config: [['chave', 'valor'], ['titular', d.titular || d.nome || ''], ['atualizadoEm', d.atualizadoEm || ''], ['versao', '1']],
  };
}
