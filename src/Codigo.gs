/** @OnlyCurrentDoc */
/**
 * bsdesenv-financas — servidor (Google Apps Script)
 *
 * A planilha é a fonte da verdade, em abas comuns que dá para abrir e ler:
 *   lancamentos  id | ano | mes | dia | categoriaId | descricao | valor
 *   categorias   id | nome | grupo | ordem
 *   orcamento    ano | categoriaId | mes | valor      (o "plano" de cada mês)
 *   config       chave | valor
 *
 * O formato das abas é o mesmo da versão 1: atualizar o código não mexe nos dados.
 *
 * Sincronização: o app nunca envia a base inteira. Ele envia operações (salvar ou
 * apagar um lançamento, uma categoria, um valor de plano...) e o servidor as aplica
 * sobre o que está na planilha naquele momento, dentro de uma trava. Assim o
 * celular e o computador não apagam o trabalho um do outro.
 *
 * A anotação @OnlyCurrentDoc acima restringe a permissão pedida ao Google a
 * "somente esta planilha".
 */

var VERSAO_APP = '2.8.0';
var ICONE_URL = 'https://raw.githubusercontent.com/bsdesenv/bsdesenv-financas/main/docs/img/icone-192.png';

var CABECALHOS = {
  lancamentos: ['id', 'ano', 'mes', 'dia', 'categoriaId', 'descricao', 'valor'],
  categorias: ['id', 'nome', 'grupo', 'ordem'],
  orcamento: ['ano', 'categoriaId', 'mes', 'valor'],
  config: ['chave', 'valor'],
};
var GRUPOS = ['fixo', 'variavel', 'renda'];
var TEMAS = ['auto', 'claro', 'escuro'];
var RE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,59}$/;
var MAX_OPS = 500;

/* ================================================================
   Página
   ================================================================ */

/** Serve o app. Os parâmetros da URL (atalhos) são lidos no navegador. */
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Finanças')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .setFaviconUrl(ICONE_URL);
}

/** Usado pelo Index.html para juntar os arquivos de estilo e de script. */
function incluir(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/* ================================================================
   API chamada pelo app (google.script.run)
   ================================================================ */

/** Tudo o que o app precisa para abrir, como texto JSON. */
function carregar() {
  return JSON.stringify(paraCliente_(lerModelo_()));
}

/** Consulta barata: só a revisão atual, para o app saber se há novidade. */
function estado() {
  return { revisao: Number(lerConfig_().revisao) || 0 };
}

/**
 * Aplica uma lista de operações e devolve a nova revisão.
 * Se o app estava desatualizado (outra aba ou aparelho gravou antes), ou se
 * alguma operação foi recusada, devolve também os dados completos para o app
 * se realinhar.
 */
function sincronizar(revisaoCliente, opsTexto) {
  var ops = JSON.parse(opsTexto || '[]');
  if (!Array.isArray(ops)) throw new Error('Formato inválido: era esperada uma lista de operações.');
  if (ops.length > MAX_OPS) throw new Error('Muitas operações de uma vez (máximo ' + MAX_OPS + ').');

  var trava = LockService.getScriptLock();
  trava.waitLock(25000);
  try {
    var m = lerModelo_();
    var revAntes = Number(m.cfg.revisao) || 0;
    var rejeitadas = [];
    var aplicadas = 0;
    var importou = false;

    ops.forEach(function (op, i) {
      try {
        aplicarOp_(m, op);
        aplicadas++;
        if (op && op.t === 'importar') importou = true;
      } catch (e) {
        rejeitadas.push({ i: i, motivo: String((e && e.message) || e) });
      }
    });

    if (aplicadas) {
      m.cfg.revisao = String(revAntes + 1);
      m.cfg.atualizadoEm = new Date().toISOString();
      m.sujo.config = true;
      gravarModelo_(m);
    }

    var resposta = { revisao: Number(m.cfg.revisao) || 0, aplicadas: aplicadas, rejeitadas: rejeitadas };
    if (Number(revisaoCliente) !== revAntes || rejeitadas.length || importou) {
      resposta.dados = JSON.stringify(paraCliente_(m));
    }
    return JSON.stringify(resposta);
  } finally {
    trava.releaseLock();
  }
}

/**
 * Gatilho simples: edição feita à mão nas abas de dados aumenta a revisão,
 * para o app aberto perceber e recarregar.
 */
function onEdit(e) {
  try {
    var nome = e && e.range && e.range.getSheet().getName();
    if (!nome || !CABECALHOS[nome] || nome === 'config') return;
    var cfg = lerConfig_();
    cfg.revisao = String((Number(cfg.revisao) || 0) + 1);
    escreverConfig_(cfg);
  } catch (err) {
    // gatilho simples não tem onde avisar; o app recarrega na próxima abertura
  }
}

/* ================================================================
   Leitura e escrita das abas
   ================================================================ */

function planilha_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** Devolve a aba, criando-a com cabeçalho se ainda não existir. */
function aba_(nome) {
  var ss = planilha_();
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.getRange(1, 1, 1, CABECALHOS[nome].length).setValues([CABECALHOS[nome]]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

/** Linhas de dados (sem o cabeçalho). */
function linhas_(nome) {
  var aba = aba_(nome);
  var ultima = aba.getLastRow();
  if (ultima < 2) return [];
  return aba.getRange(2, 1, ultima - 1, CABECALHOS[nome].length).getValues();
}

/**
 * Regrava os dados de uma aba numa única escrita e só depois limpa as linhas
 * que sobraram: nunca existe um momento em que a aba fica vazia.
 */
function escrever_(nome, matriz) {
  var aba = aba_(nome);
  var colunas = CABECALHOS[nome].length;
  var antes = Math.max(0, aba.getLastRow() - 1);
  if (matriz.length) aba.getRange(2, 1, matriz.length, colunas).setValues(matriz);
  if (antes > matriz.length) aba.getRange(2 + matriz.length, 1, antes - matriz.length, colunas).clearContent();
}

function lerConfig_() {
  var cfg = {};
  linhas_('config').forEach(function (l) {
    if (l[0] !== '' && l[0] !== null) cfg[String(l[0])] = texto_(l[1]);
  });
  return cfg;
}

function escreverConfig_(cfg) {
  escrever_('config', Object.keys(cfg).map(function (k) { return [k, celulaTexto_(cfg[k])]; }));
}

function lerModelo_() {
  var cats = linhas_('categorias')
    .filter(function (l) { return l[0] !== '' && l[0] !== null; })
    .map(function (l) {
      var grupo = String(l[2]);
      return {
        id: String(l[0]),
        nome: texto_(l[1]) || String(l[0]),
        grupo: GRUPOS.indexOf(grupo) >= 0 ? grupo : 'variavel',
        ordem: Number(l[3]) || 0,
      };
    });

  var lanc = linhas_('lancamentos')
    .filter(function (l) { return l[0] !== '' && l[0] !== null && l[1] !== '' && l[2] !== ''; })
    .map(function (l) {
      return {
        id: String(l[0]),
        ano: String(Number(l[1]) || l[1]),
        mes: Number(l[2]),
        dia: (l[3] === '' || l[3] === null) ? null : Number(l[3]),
        categoriaId: String(l[4]),
        descricao: texto_(l[5]),
        valor: arred_(num_(l[6])),
      };
    });

  var orc = linhas_('orcamento')
    .filter(function (l) { return l[1] !== '' && l[1] !== null; })
    .map(function (l) {
      return { ano: String(Number(l[0]) || l[0]), categoriaId: String(l[1]), mes: Number(l[2]), valor: arred_(num_(l[3])) };
    });

  return { cfg: lerConfig_(), cats: cats, lanc: lanc, orc: orc, sujo: {} };
}

function gravarModelo_(m) {
  if (m.sujo.categorias) {
    escrever_('categorias', m.cats.map(function (c) {
      return [c.id, celulaTexto_(c.nome), c.grupo, c.ordem];
    }));
  }
  if (m.sujo.lancamentos) {
    escrever_('lancamentos', m.lanc.map(function (l) {
      return [l.id, Number(l.ano), l.mes, l.dia === null ? '' : l.dia, l.categoriaId, celulaTexto_(l.descricao), l.valor];
    }));
  }
  if (m.sujo.orcamento) {
    escrever_('orcamento', m.orc.map(function (o) {
      return [Number(o.ano), o.categoriaId, o.mes, o.valor];
    }));
  }
  if (m.sujo.config) escreverConfig_(m.cfg);
  SpreadsheetApp.flush();
}

/** Identificador do projeto, para o app montar o link do editor ('' se não der). */
function idScript_() {
  try { return String(ScriptApp.getScriptId() || ''); } catch (e) { return ''; }
}

/** Endereço publicado do app, para o link "Recarregar" ('' se não der). */
function urlApp_() {
  try { return String(ScriptApp.getService().getUrl() || ''); } catch (e) { return ''; }
}

/** Formato que o app usa: lançamentos e planos agrupados por ano. */
function paraCliente_(m) {
  var anos = {};
  function ano_(a) {
    if (!anos[a]) anos[a] = { lancamentos: [], orcamento: {} };
    return anos[a];
  }
  m.lanc.forEach(function (l) {
    ano_(l.ano).lancamentos.push({
      id: l.id, mes: l.mes, dia: l.dia, categoriaId: l.categoriaId, descricao: l.descricao, valor: l.valor,
    });
  });
  m.orc.forEach(function (o) {
    var orc = ano_(o.ano).orcamento;
    if (!orc[o.categoriaId]) orc[o.categoriaId] = {};
    orc[o.categoriaId][String(o.mes)] = o.valor;
  });
  var ss = planilha_();
  return {
    versaoApp: VERSAO_APP,
    scriptId: idScript_(),
    urlApp: urlApp_(),
    planilha: { id: ss.getId(), nome: ss.getName(), url: ss.getUrl() },
    revisao: Number(m.cfg.revisao) || 0,
    nome: m.cfg.nome || m.cfg.titular || '',
    tema: TEMAS.indexOf(m.cfg.tema) >= 0 ? m.cfg.tema : 'auto',
    marcas: marcas_(m.cfg),
    atualizadoEm: m.cfg.atualizadoEm || '',
    categorias: m.cats.slice().sort(function (a, b) { return a.ordem - b.ordem; }),
    anos: anos,
  };
}

/* ================================================================
   Operações
   ================================================================ */

function aplicarOp_(m, op) {
  if (!op || typeof op !== 'object') throw new Error('operação vazia');
  switch (op.t) {
    case 'lanc': return salvarLanc_(m, op.l);
    case 'lanc-': return apagarLanc_(m, op.id);
    case 'cat': return salvarCat_(m, op.c);
    case 'cat-': return apagarCat_(m, op.id);
    case 'orc': return salvarOrc_(m, op);
    case 'cfg': return salvarCfg_(m, op.k, op.v);
    case 'importar': return importar_(m, op);
    default: throw new Error('operação desconhecida: ' + op.t);
  }
}

function validarLanc_(l, ano, idsCategoria) {
  if (!l || typeof l !== 'object') throw new Error('lançamento vazio');
  var id = String(l.id);
  if (!RE_ID.test(id)) throw new Error('id de lançamento inválido');
  var a = inteiro_(ano, 1900, 2200, 'ano');
  var mes = inteiro_(l.mes, 1, 12, 'mês');
  var dia = (l.dia === null || l.dia === undefined || l.dia === '') ? null : inteiro_(l.dia, 1, 31, 'dia');
  if (dia !== null && dia > diasNoMes_(a, mes)) throw new Error('dia inválido para o mês: ' + dia);
  var cid = String(l.categoriaId);
  if (!idsCategoria[cid]) throw new Error('categoria inexistente: ' + cid);
  var valor = arred_(Number(l.valor));
  if (!isFinite(valor) || valor === 0 || Math.abs(valor) >= 1e9) throw new Error('valor inválido');
  return {
    id: id, ano: String(a), mes: mes, dia: dia, categoriaId: cid,
    descricao: texto_(l.descricao).trim().slice(0, 300), valor: valor,
  };
}

function mapaIds_(cats) {
  var ids = {};
  cats.forEach(function (c) { ids[c.id] = true; });
  return ids;
}

function salvarLanc_(m, l) {
  var novo = validarLanc_(l, l && l.ano, mapaIds_(m.cats));
  var i = indice_(m.lanc, 'id', novo.id);
  if (i >= 0) m.lanc[i] = novo; else m.lanc.push(novo);
  m.sujo.lancamentos = true;
}

function apagarLanc_(m, id) {
  var i = indice_(m.lanc, 'id', String(id));
  if (i >= 0) {
    m.lanc.splice(i, 1);
    m.sujo.lancamentos = true;
  }
}

function validarCat_(c, ordemPadrao) {
  if (!c || typeof c !== 'object') throw new Error('categoria vazia');
  var id = String(c.id);
  if (!RE_ID.test(id)) throw new Error('id de categoria inválido');
  var nome = texto_(c.nome).trim().slice(0, 60);
  if (!nome) throw new Error('nome de categoria vazio');
  var grupo = String(c.grupo);
  if (GRUPOS.indexOf(grupo) < 0) throw new Error('grupo inválido: ' + grupo);
  var ordem = Number(c.ordem);
  return { id: id, nome: nome, grupo: grupo, ordem: isFinite(ordem) ? ordem : ordemPadrao };
}

function salvarCat_(m, c) {
  var maior = m.cats.reduce(function (mx, x) { return Math.max(mx, x.ordem); }, 0);
  var nova = validarCat_(c, maior + 1);
  var i = indice_(m.cats, 'id', nova.id);
  if (i >= 0) m.cats[i] = nova; else m.cats.push(nova);
  m.sujo.categorias = true;
}

function apagarCat_(m, id) {
  id = String(id);
  var usada = m.lanc.some(function (l) { return l.categoriaId === id; });
  if (usada) throw new Error('a categoria tem lançamentos e não pode ser apagada');
  var i = indice_(m.cats, 'id', id);
  if (i < 0) return;
  m.cats.splice(i, 1);
  m.sujo.categorias = true;
  var antes = m.orc.length;
  m.orc = m.orc.filter(function (o) { return o.categoriaId !== id; });
  if (m.orc.length !== antes) m.sujo.orcamento = true;
}

function salvarOrc_(m, op) {
  var ano = String(inteiro_(op.ano, 1900, 2200, 'ano'));
  var mes = inteiro_(op.mes, 1, 12, 'mês');
  var cid = String(op.categoriaId);
  if (!mapaIds_(m.cats)[cid]) throw new Error('categoria inexistente: ' + cid);
  var vazio = op.valor === null || op.valor === undefined || op.valor === '' || Number(op.valor) === 0;
  var valor = vazio ? 0 : arred_(Number(op.valor));
  if (!vazio && (!isFinite(valor) || valor < 0 || valor >= 1e9)) throw new Error('valor de plano inválido');

  var i = -1;
  for (var k = 0; k < m.orc.length; k++) {
    var o = m.orc[k];
    if (o.ano === ano && o.categoriaId === cid && o.mes === mes) { i = k; break; }
  }
  if (vazio) {
    if (i >= 0) m.orc.splice(i, 1);
  } else if (i >= 0) {
    m.orc[i].valor = valor;
  } else {
    m.orc.push({ ano: ano, categoriaId: cid, mes: mes, valor: valor });
  }
  m.sujo.orcamento = true;
}

/** Marca "encerrada": categoria dada como resolvida num mês (chave na aba config). */
var RE_MARCA = /^encerrada:(\d{4})-(0[1-9]|1[0-2]):([A-Za-z0-9][A-Za-z0-9_-]{0,59})$/;

/** A chave parece uma marca (mesmo que o formato esteja errado)? */
function ehMarca_(chave) {
  return typeof chave === 'string' && chave.indexOf('encerrada:') === 0;
}

/** Interpreta uma chave de marca: { ano, mes, categoriaId } ou null se não for válida. */
function lerMarca_(chave) {
  var r = RE_MARCA.exec(String(chave));
  if (!r) return null;
  var ano = Number(r[1]);
  if (ano < 1900 || ano > 2200) return null;
  return { ano: ano, mes: Number(r[2]), categoriaId: r[3] };
}

/** Todas as marcas presentes na configuração: { chave: '1' }. */
function marcas_(cfg) {
  var out = {};
  Object.keys(cfg).forEach(function (k) {
    if (ehMarca_(k) && lerMarca_(k) && cfg[k] === '1') out[k] = '1';
  });
  return out;
}

function salvarCfg_(m, chave, valor) {
  if (ehMarca_(chave)) {
    var marca = lerMarca_(chave);
    if (!marca) throw new Error('marca inválida: ' + chave);
    var vazio = valor === '' || valor === null || valor === undefined || valor === false || valor === 0;
    if (vazio) {
      delete m.cfg[chave];
    } else if (valor === '1' || valor === true || valor === 1) {
      if (!mapaIds_(m.cats)[marca.categoriaId]) throw new Error('categoria inexistente: ' + marca.categoriaId);
      m.cfg[chave] = '1';
    } else {
      throw new Error('valor de marca inválido');
    }
  } else if (chave === 'nome') {
    m.cfg.nome = texto_(valor).trim().slice(0, 60);
  } else if (chave === 'tema') {
    if (TEMAS.indexOf(valor) < 0) throw new Error('tema inválido');
    m.cfg.tema = valor;
  } else {
    throw new Error('configuração desconhecida: ' + chave);
  }
  m.sujo.config = true;
}

/**
 * Importa um backup JSON (formato da versão 1 ou 2).
 * modo "substituir" troca tudo; "mesclar" acrescenta e atualiza pelo id.
 */
function importar_(m, op) {
  if (op.confirmado !== true) throw new Error('a importação precisa ser confirmada');
  var d = op.dados;
  if (!d || !Array.isArray(d.categorias) || !d.anos || typeof d.anos !== 'object') {
    throw new Error('arquivo sem categorias ou anos');
  }
  var mesclar = op.modo === 'mesclar';

  var cats = [];
  d.categorias.forEach(function (c, i) {
    try { cats.push(validarCat_(c, i + 1)); } catch (e) { /* categoria torta é ignorada */ }
  });
  if (!cats.length) throw new Error('o arquivo não tem categorias válidas');

  var ids = mapaIds_(mesclar ? m.cats.concat(cats) : cats);
  var lanc = [];
  var orc = [];
  Object.keys(d.anos).forEach(function (a) {
    var bloco = d.anos[a] || {};
    (bloco.lancamentos || []).forEach(function (l) {
      try {
        var item = Object.assign({}, l);
        if (!RE_ID.test(String(item.id))) item.id = 'i' + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
        lanc.push(validarLanc_(item, a, ids));
      } catch (e) { /* lançamento torto é ignorado */ }
    });
    var o = bloco.orcamento || {};
    Object.keys(o).forEach(function (cid) {
      if (!ids[cid] || !o[cid]) return;
      Object.keys(o[cid]).forEach(function (mes) {
        var v = arred_(Number(o[cid][mes]));
        var nMes = Number(mes);
        if (isFinite(v) && v > 0 && nMes >= 1 && nMes <= 12) orc.push({ ano: String(Number(a)), categoriaId: cid, mes: nMes, valor: v });
      });
    });
  });

  if (mesclar) {
    cats.forEach(function (c) {
      var i = indice_(m.cats, 'id', c.id);
      if (i >= 0) m.cats[i] = c; else m.cats.push(c);
    });
    lanc.forEach(function (l) {
      var i = indice_(m.lanc, 'id', l.id);
      if (i >= 0) m.lanc[i] = l; else m.lanc.push(l);
    });
    orc.forEach(function (o) { salvarOrc_(m, { ano: o.ano, categoriaId: o.categoriaId, mes: o.mes, valor: o.valor }); });
  } else {
    m.cats = cats;
    m.lanc = lanc;
    m.orc = orc;
    Object.keys(m.cfg).forEach(function (k) { if (ehMarca_(k)) delete m.cfg[k]; });
  }
  var marcas = d.config && d.config.marcas;
  if (marcas && typeof marcas === 'object') {
    var idsFinais = mapaIds_(m.cats);
    Object.keys(marcas).forEach(function (k) {
      var mc = lerMarca_(k);
      if (mc && String(marcas[k]) === '1' && idsFinais[mc.categoriaId]) m.cfg[k] = '1';
    });
  }
  var nome = texto_(d.nome || d.titular).trim();
  var nomeAtual = m.cfg.nome || m.cfg.titular;
  if (nome && (!mesclar || !nomeAtual)) m.cfg.nome = nome.slice(0, 60);
  var tema = d.config && d.config.tema;
  if (!mesclar && TEMAS.indexOf(tema) >= 0) m.cfg.tema = tema;
  m.sujo.categorias = m.sujo.lancamentos = m.sujo.orcamento = m.sujo.config = true;
}

/* ================================================================
   Utilidades
   ================================================================ */

function indice_(lista, campo, valor) {
  for (var i = 0; i < lista.length; i++) if (lista[i][campo] === valor) return i;
  return -1;
}

function diasNoMes_(ano, mes) {
  if (mes === 2) {
    var bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
    return bissexto ? 29 : 28;
  }
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
}

function inteiro_(v, min, max, nome) {
  var n = Number(v);
  if (!isFinite(n) || Math.floor(n) !== n || n < min || n > max) throw new Error(nome + ' inválido: ' + v);
  return n;
}

function arred_(v) {
  return Math.round(v * 100) / 100;
}

function texto_(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  return s.charAt(0) === "'" ? s.slice(1) : s;
}

/** Texto que começa com = + - @ viraria fórmula na planilha: o apóstrofo força texto. */
function celulaTexto_(v) {
  var s = texto_(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Número tolerante a texto: "1.234,56", "1.500", "12.5", "R$ 89,90". */
function num_(v) {
  if (typeof v === 'number') return v;
  var t = String(v === null || v === undefined ? '' : v).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!t) return 0;
  if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  var n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}
