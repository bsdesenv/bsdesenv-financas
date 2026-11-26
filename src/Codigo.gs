/** @OnlyCurrentDoc */
/**
 * bsdesenv-financas — servidor (Google Apps Script).
 *
 * A planilha é a fonte da verdade. O app envia operações (salvar, apagar), não a
 * base inteira; o servidor as aplica dentro de uma trava, sobre o que a planilha
 * tem naquele momento.
 *
 * Detalhes: docs/ARQUITETURA.md (Dados, Sincronização, Segurança).
 */

var VERSAO_APP = '3.3.0';
var ICONE_URL = 'https://raw.githubusercontent.com/bsdesenv/bsdesenv-financas/main/docs/img/icone-192.png';

var CABECALHOS = {
  lancamentos: ['id', 'ano', 'mes', 'dia', 'categoriaId', 'descricao', 'valor'],
  categorias: ['id', 'nome', 'grupo', 'ordem'],
  orcamento: ['ano', 'categoriaId', 'mes', 'valor'],
  config: ['chave', 'valor'],
  recorrencias: ['id', 'categoriaId', 'descricao', 'valor', 'dia', 'inicio', 'fim', 'ativa', 'automatico'],
  cartoes: ['id', 'nome', 'fechamento', 'vencimento', 'limite', 'ativo'],
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
    var importacao = null;

    ops.forEach(function (op, i) {
      try {
        var ret = aplicarOp_(m, op);
        aplicadas++;
        if (op && op.t === 'importar') { importou = true; importacao = ret || null; }
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
    if (importacao) resposta.importacao = importacao;
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
  return dadosAba_(aba_(nome), nome);
}

/** Como linhas_, mas para aba opcional: se ela não existe, devolve [] sem criá-la. */
function linhasOpcionais_(nome) {
  var aba = planilha_().getSheetByName(nome);
  return aba ? dadosAba_(aba, nome) : [];
}

function dadosAba_(aba, nome) {
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

  var rec = linhasOpcionais_('recorrencias')
    .filter(function (l) { return l[0] !== '' && l[0] !== null; })
    .map(function (l) {
      return {
        id: String(l[0]),
        categoriaId: String(l[1]),
        descricao: texto_(l[2]),
        valor: arred_(num_(l[3])),
        dia: (l[4] === '' || l[4] === null) ? null : Number(l[4]),
        inicio: Number(l[5]),
        fim: (l[6] === '' || l[6] === null) ? null : Number(l[6]),
        ativa: flagLida_(l[7], 1),
        automatico: flagLida_(l[8], 0),
      };
    });

  var cartoes = linhasOpcionais_('cartoes')
    .filter(function (l) { return l[0] !== '' && l[0] !== null; })
    .map(function (l) {
      return {
        id: String(l[0]),
        nome: texto_(l[1]),
        fechamento: Number(l[2]),
        vencimento: Number(l[3]),
        limite: (l[4] === '' || l[4] === null) ? null : arred_(num_(l[4])),
        ativo: flagLida_(l[5], 1),
      };
    });

  return { cfg: lerConfig_(), cats: cats, lanc: lanc, orc: orc, rec: rec, cartoes: cartoes, sujo: {} };
}

/** Sim/não da planilha: vazio vale o padrão; checkbox (true) e 1 valem 1. */
function flagLida_(v, padrao) {
  if (v === '' || v === null || v === undefined) return padrao;
  return (v === true || Number(v) === 1) ? 1 : 0;
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
  if (m.sujo.recorrencias) {
    escrever_('recorrencias', m.rec.map(function (r) {
      return [r.id, r.categoriaId, celulaTexto_(r.descricao), r.valor, r.dia === null ? '' : r.dia,
        r.inicio, r.fim === null ? '' : r.fim, r.ativa, r.automatico];
    }));
  }
  if (m.sujo.cartoes) {
    escrever_('cartoes', m.cartoes.map(function (c) {
      return [c.id, celulaTexto_(c.nome), c.fechamento, c.vencimento, c.limite === null ? '' : c.limite, c.ativo];
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
    marcas: marcas_(m.cfg, m.rec),
    fechados: fechados_(m.cfg),
    categoriaGuardar: m.cfg.categoriaGuardar || '',
    categoriaSobra: m.cfg.categoriaSobra || '',
    atualizadoEm: m.cfg.atualizadoEm || '',
    categorias: m.cats.slice().sort(function (a, b) { return a.ordem - b.ordem; }),
    recorrencias: m.rec.map(function (r) {
      return {
        id: r.id, categoriaId: r.categoriaId, descricao: r.descricao, valor: r.valor, dia: r.dia,
        inicio: r.inicio, fim: r.fim, ativa: r.ativa === 1, automatico: r.automatico === 1,
      };
    }),
    cartoes: m.cartoes.map(function (c) {
      return {
        id: c.id, nome: c.nome, fechamento: c.fechamento, vencimento: c.vencimento,
        limite: c.limite, ativo: c.ativo === 1,
      };
    }),
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
    case 'rec': return salvarRec_(m, op.r);
    case 'rec-': return apagarRec_(m, op.id);
    case 'cartao': return salvarCartao_(m, op.c);
    case 'cartao-': return apagarCartao_(m, op.id);
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

/** Ano e mês no formato aaaamm (ex.: 202611), como número. */
function aaaamm_(v, nome) {
  var n = Number(v);
  if (v === null || v === undefined || v === '' || !isFinite(n) || Math.floor(n) !== n) throw new Error(nome + ' inválido: ' + v);
  var ano = Math.floor(n / 100);
  var mes = n % 100;
  if (ano < 1900 || ano > 2200 || mes < 1 || mes > 12) throw new Error(nome + ' inválido: ' + v);
  return n;
}

/** Sim/não vindo do app: vazio vale o padrão; 1, 0, true ou false. */
function flag_(v, padrao, nome) {
  if (v === null || v === undefined || v === '') return padrao;
  if (v === 1 || v === '1' || v === true) return 1;
  if (v === 0 || v === '0' || v === false) return 0;
  throw new Error(nome + ' inválido: ' + v);
}

/** Valida uma recorrência (cobrança mensal fixa) e devolve o registro pronto para a aba. */
function validarRec_(r, idsCategoria) {
  if (!r || typeof r !== 'object') throw new Error('recorrência vazia');
  var id = String(r.id);
  if (!RE_ID.test(id)) throw new Error('id de recorrência inválido');
  var descricao = texto_(r.descricao).trim().slice(0, 300);
  var valor = arred_(Number(r.valor));
  if (!isFinite(valor) || valor <= 0 || valor >= 1e9) throw new Error('valor inválido');
  var dia = (r.dia === null || r.dia === undefined || r.dia === '') ? null : inteiro_(r.dia, 1, 31, 'dia');
  var inicio = aaaamm_(r.inicio, 'início');
  var fim = (r.fim === null || r.fim === undefined || r.fim === '') ? null : aaaamm_(r.fim, 'fim');
  if (fim !== null && fim < inicio) throw new Error('fim anterior ao início');
  var ativa = flag_(r.ativa, 1, 'ativa');
  var automatico = flag_(r.automatico, 0, 'automático');
  var cid = String(r.categoriaId);
  if (!idsCategoria[cid]) throw new Error('categoria inexistente: ' + cid);
  return {
    id: id, categoriaId: cid, descricao: descricao, valor: valor, dia: dia,
    inicio: inicio, fim: fim, ativa: ativa, automatico: automatico,
  };
}

function salvarRec_(m, r) {
  var novo = validarRec_(r, mapaIds_(m.cats));
  var i = indice_(m.rec, 'id', novo.id);
  if (i >= 0) m.rec[i] = novo; else m.rec.push(novo);
  m.sujo.recorrencias = true;
}

/** Apaga a recorrência e as marcas "pular" dela. Id que não existe não é erro. */
function apagarRec_(m, id) {
  id = String(id);
  var i = indice_(m.rec, 'id', id);
  if (i >= 0) {
    m.rec.splice(i, 1);
    m.sujo.recorrencias = true;
  }
  apagarPulares_(m, [id]);
}

/** Valida um cartão de crédito e devolve o registro pronto para a aba. */
function validarCartao_(c) {
  if (!c || typeof c !== 'object') throw new Error('cartão vazio');
  var id = String(c.id);
  if (!/^k[a-z0-9]{10}$/.test(id)) throw new Error('id de cartão inválido');
  var nome = texto_(c.nome).trim().slice(0, 60);
  if (!nome) throw new Error('nome do cartão obrigatório');
  var fechamento = inteiro_(c.fechamento, 1, 31, 'fechamento');
  var vencimento = inteiro_(c.vencimento, 1, 31, 'vencimento');
  var limite = (c.limite === null || c.limite === undefined || c.limite === '') ? null : arred_(Number(c.limite));
  if (limite !== null && (!isFinite(limite) || limite <= 0 || limite >= 1e10)) throw new Error('limite inválido');
  var ativo = flag_(c.ativo, 1, 'ativo');
  return { id: id, nome: nome, fechamento: fechamento, vencimento: vencimento, limite: limite, ativo: ativo };
}

function salvarCartao_(m, c) {
  var novo = validarCartao_(c);
  var i = indice_(m.cartoes, 'id', novo.id);
  if (i >= 0) m.cartoes[i] = novo; else m.cartoes.push(novo);
  m.sujo.cartoes = true;
}

/** Apaga o cartão sem lançamentos. Com lançamentos, recusa: nada some em massa. */
function apagarCartao_(m, id) {
  id = String(id);
  var prefixo = id + '_';
  if (m.lanc.some(function (l) { return l.id.indexOf(prefixo) === 0; })) {
    throw new Error('O cartão tem lançamentos; arquive em vez de apagar.');
  }
  var i = indice_(m.cartoes, 'id', id);
  if (i >= 0) {
    m.cartoes.splice(i, 1);
    m.sujo.cartoes = true;
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
  if (i >= 0 && m.cats[i].grupo !== nova.grupo) {
    var antes = m.cats[i].grupo;
    if (nova.grupo === 'renda' && m.cfg.categoriaGuardar === nova.id) {
      throw new Error('a categoria de economia não pode virar renda');
    }
    if (nova.grupo !== 'renda' && m.cfg.categoriaSobra === nova.id) {
      throw new Error('a categoria da sobra transportada precisa ser de renda');
    }
    if ((antes === 'renda') !== (nova.grupo === 'renda')) {
      var usada = m.lanc.some(function (l) { return l.categoriaId === nova.id; });
      if (usada) throw new Error('a categoria tem lançamentos e não pode mudar entre renda e gasto');
    }
  }
  if (i >= 0) m.cats[i] = nova; else m.cats.push(nova);
  m.sujo.categorias = true;
}

function apagarCat_(m, id) {
  id = String(id);
  var usada = m.lanc.some(function (l) { return l.categoriaId === id; });
  if (m.cfg.categoriaGuardar && m.cfg.categoriaGuardar === id) throw new Error('a categoria de economia não pode ser apagada');
  if (m.cfg.categoriaSobra && m.cfg.categoriaSobra === id) throw new Error('a categoria da sobra transportada não pode ser apagada');
  if (usada) throw new Error('a categoria tem lançamentos e não pode ser apagada');
  var recsCat = m.rec.filter(function (r) { return r.categoriaId === id; });
  if (recsCat.length) {
    m.rec = m.rec.filter(function (r) { return r.categoriaId !== id; });
    m.sujo.recorrencias = true;
    apagarPulares_(m, recsCat.map(function (r) { return r.id; }));
  }
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

/** Marca "pular": esta recorrência não vem só neste mês (chave na aba config). */
var RE_PULAR = /^pular:(\d{4})-(0[1-9]|1[0-2]):([A-Za-z0-9][A-Za-z0-9_-]{0,59})$/;

/** A chave parece uma marca "pular" (mesmo que o formato esteja errado)? */
function ehPular_(chave) {
  return typeof chave === 'string' && chave.indexOf('pular:') === 0;
}

/** Interpreta uma chave "pular": { ano, mes, recId } ou null se não for válida. */
function lerPular_(chave) {
  var r = RE_PULAR.exec(String(chave));
  if (!r) return null;
  var ano = Number(r[1]);
  if (ano < 1900 || ano > 2200) return null;
  return { ano: ano, mes: Number(r[2]), recId: r[3] };
}

/** Todas as marcas presentes na configuração: { chave: '1' }. As "pular" só valem com a recorrência existente. */
function marcas_(cfg, recs) {
  var out = {};
  var idsRec = (recs || []).map(function (r) { return r.id; });
  Object.keys(cfg).forEach(function (k) {
    if (cfg[k] !== '1') return;
    if (ehMarca_(k) && lerMarca_(k)) out[k] = '1';
    else if (ehPular_(k) && lerPular_(k) && idsRec.indexOf(lerPular_(k).recId) >= 0) out[k] = '1';
  });
  return out;
}

/** Apaga as marcas "pular" das recorrências dadas (ids). */
function apagarPulares_(m, ids) {
  var apagou = false;
  Object.keys(m.cfg).forEach(function (k) {
    var p = ehPular_(k) ? lerPular_(k) : null;
    if (p && ids.indexOf(p.recId) >= 0) {
      delete m.cfg[k];
      apagou = true;
    }
  });
  if (apagou) m.sujo.config = true;
}

/** Fechamento do mês: chave "fechado:AAAA-MM", valor = sobra realizada (texto numérico). */
var RE_FECHADO = /^fechado:(\d{4})-(0[1-9]|1[0-2])$/;
var RE_VALOR_FECHADO = /^-?\d{1,9}(\.\d{1,2})?$/;

/** A chave parece um fechamento (mesmo que o formato esteja errado)? */
function ehFechado_(chave) {
  return typeof chave === 'string' && chave.indexOf('fechado:') === 0;
}

/** A chave é um fechamento válido (formato e ano entre 1900 e 2200)? */
function chaveFechadoOk_(chave) {
  var r = RE_FECHADO.exec(String(chave));
  if (!r) return false;
  var ano = Number(r[1]);
  return ano >= 1900 && ano <= 2200;
}

/** Valor do fechamento como texto válido, ou null. */
function valorFechado_(v) {
  if (typeof v === 'number' && isFinite(v)) v = String(v);
  if (typeof v !== 'string') return null;
  return RE_VALOR_FECHADO.test(v) ? v : null;
}

/** Todos os fechamentos válidos da configuração: { 'AAAA-MM': 'valor' }. */
function fechados_(cfg) {
  var out = {};
  Object.keys(cfg).forEach(function (k) {
    if (ehFechado_(k) && chaveFechadoOk_(k) && valorFechado_(cfg[k]) !== null) out[k.slice(8)] = cfg[k];
  });
  return out;
}

function salvarCfg_(m, chave, valor) {
  if (ehFechado_(chave)) {
    if (!chaveFechadoOk_(chave)) throw new Error('fechamento inválido: ' + chave);
    if (valor === '' || valor === null || valor === undefined) {
      delete m.cfg[chave];
    } else {
      var vf = valorFechado_(valor);
      if (vf === null) throw new Error('valor de fechamento inválido');
      m.cfg[chave] = vf;
    }
  } else if (ehMarca_(chave)) {
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
  } else if (ehPular_(chave)) {
    var pular = lerPular_(chave);
    if (!pular) throw new Error('marca inválida: ' + chave);
    var vazioPular = valor === '' || valor === null || valor === undefined || valor === false || valor === 0;
    if (vazioPular) {
      delete m.cfg[chave];
    } else if (valor === '1' || valor === true || valor === 1) {
      if (indice_(m.rec, 'id', pular.recId) < 0) throw new Error('recorrência inexistente: ' + pular.recId);
      m.cfg[chave] = '1';
    } else {
      throw new Error('valor de marca inválido');
    }
  } else if (chave === 'nome') {
    m.cfg.nome = texto_(valor).trim().slice(0, 60);
  } else if (chave === 'categoriaGuardar') {
    var v = texto_(valor).trim();
    if (!v) {
      delete m.cfg.categoriaGuardar;
    } else {
      var ic = indice_(m.cats, 'id', v);
      if (ic < 0 || m.cats[ic].grupo === 'renda') throw new Error('categoria de economia inválida: ' + v);
      m.cfg.categoriaGuardar = v;
    }
  } else if (chave === 'categoriaSobra') {
    var vs = texto_(valor).trim();
    if (!vs) {
      delete m.cfg.categoriaSobra;
    } else {
      if (!ehRenda_(m, vs)) throw new Error('categoria da sobra inválida: ' + vs);
      m.cfg.categoriaSobra = vs;
    }
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
 * Devolve um resumo do que foi aceito e do que foi ignorado (com motivos).
 */
function importar_(m, op) {
  if (op.confirmado !== true) throw new Error('a importação precisa ser confirmada');
  var d = op.dados;
  if (!d || !Array.isArray(d.categorias) || !d.anos || typeof d.anos !== 'object') {
    throw new Error('arquivo sem categorias ou anos');
  }
  var mesclar = op.modo === 'mesclar';

  var resumo = {
    categorias: { aceitas: 0, ignoradas: 0 },
    lancamentos: { aceitos: 0, ignorados: 0 },
    planos: { aceitos: 0, ignorados: 0 },
    recorrencias: { aceitas: 0, ignoradas: 0 },
    cartoes: { aceitas: 0, ignoradas: 0 },
    motivos: [],
  };
  function motivo_(texto) { if (resumo.motivos.length < 5) resumo.motivos.push(texto); }
  function msg_(e) { return String((e && e.message) || e); }

  var cats = [];
  d.categorias.forEach(function (c, i) {
    try {
      cats.push(validarCat_(c, i + 1));
      resumo.categorias.aceitas++;
    } catch (e) {
      resumo.categorias.ignoradas++;
      motivo_('categoria ' + ((c && typeof c === 'object' && c.id !== undefined) ? c.id : '#' + (i + 1)) + ': ' + msg_(e));
    }
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
        resumo.lancamentos.aceitos++;
      } catch (e) {
        resumo.lancamentos.ignorados++;
        motivo_('lançamento ' + ((l && typeof l === 'object') ? l.id : '?') + ' (' + a + '): ' + msg_(e));
      }
    });
    var o = bloco.orcamento || {};
    Object.keys(o).forEach(function (cid) {
      if (!o[cid] || typeof o[cid] !== 'object') return;
      Object.keys(o[cid]).forEach(function (mes) {
        var rotulo = 'plano ' + cid + ' ' + a + '/' + mes;
        function ignora_(porque) { resumo.planos.ignorados++; motivo_(rotulo + ': ' + porque); }
        var bruto = o[cid][mes];
        if (bruto === null || bruto === undefined || bruto === '' || Number(bruto) === 0) return;
        var v = arred_(Number(bruto));
        var nMes = Number(mes);
        if (!ids[cid]) return ignora_('categoria inexistente');
        if (!(nMes >= 1 && nMes <= 12) || Math.floor(nMes) !== nMes) return ignora_('mês inválido');
        if (!isFinite(v) || v < 0 || v >= 1e9) return ignora_('valor inválido');
        orc.push({ ano: String(Number(a)), categoriaId: cid, mes: nMes, valor: v });
        resumo.planos.aceitos++;
      });
    });
  });

  var recs = [];
  (Array.isArray(d.recorrencias) ? d.recorrencias : []).forEach(function (r, i) {
    try {
      var rec = validarRec_(r, ids);
      var j = indice_(recs, 'id', rec.id);
      if (j >= 0) recs[j] = rec; else recs.push(rec);
      resumo.recorrencias.aceitas++;
    } catch (e) {
      resumo.recorrencias.ignoradas++;
      motivo_('recorrência ' + ((r && typeof r === 'object' && r.id !== undefined) ? r.id : '#' + (i + 1)) + ': ' + msg_(e));
    }
  });

  var cartoes = [];
  (Array.isArray(d.cartoes) ? d.cartoes : []).forEach(function (c, i) {
    try {
      var cartao = validarCartao_(c);
      var k = indice_(cartoes, 'id', cartao.id);
      if (k >= 0) cartoes[k] = cartao; else cartoes.push(cartao);
      resumo.cartoes.aceitas++;
    } catch (e) {
      resumo.cartoes.ignoradas++;
      motivo_('cartão ' + ((c && typeof c === 'object' && c.id !== undefined) ? c.id : '#' + (i + 1)) + ': ' + msg_(e));
    }
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
    recs.forEach(function (r) {
      var i = indice_(m.rec, 'id', r.id);
      if (i >= 0) m.rec[i] = r; else m.rec.push(r);
    });
    cartoes.forEach(function (c) {
      var i = indice_(m.cartoes, 'id', c.id);
      if (i >= 0) m.cartoes[i] = c; else m.cartoes.push(c);
    });
  } else {
    m.cats = cats;
    m.lanc = lanc;
    m.orc = orc;
    m.rec = recs;
    m.cartoes = cartoes;
    Object.keys(m.cfg).forEach(function (k) { if (ehMarca_(k) || ehFechado_(k) || ehPular_(k)) delete m.cfg[k]; });
  }
  var fechados = d.config && d.config.fechados;
  if (fechados && typeof fechados === 'object') {
    Object.keys(fechados).forEach(function (k) {
      var chave = 'fechado:' + k;
      var vf = valorFechado_(fechados[k]);
      if (!chaveFechadoOk_(chave) || vf === null) return motivo_('fechamento ' + k + ': inválido');
      if (mesclar && m.cfg[chave] !== undefined) return;
      m.cfg[chave] = vf;
    });
  }
  var marcas = d.config && d.config.marcas;
  if (marcas && typeof marcas === 'object') {
    var idsFinais = mapaIds_(m.cats);
    var idsRecFinais = m.rec.map(function (r) { return r.id; });
    Object.keys(marcas).forEach(function (k) {
      if (String(marcas[k]) !== '1') return;
      var mc = lerMarca_(k);
      var mp = lerPular_(k);
      if (mc && idsFinais[mc.categoriaId]) m.cfg[k] = '1';
      else if (mp && idsRecFinais.indexOf(mp.recId) >= 0) m.cfg[k] = '1';
    });
  }
  var guardar = d.config && texto_(d.config.categoriaGuardar).trim();
  var cGuardar = guardar ? m.cats[indice_(m.cats, 'id', guardar)] : null;
  var guardarOk = !!cGuardar && cGuardar.grupo !== 'renda';
  if (mesclar) {
    if (!m.cfg.categoriaGuardar && guardarOk) m.cfg.categoriaGuardar = guardar;
  } else if (guardarOk) {
    m.cfg.categoriaGuardar = guardar;
  } else if (m.cfg.categoriaGuardar && indice_(m.cats, 'id', m.cfg.categoriaGuardar) < 0) {
    delete m.cfg.categoriaGuardar;
  }
  var sobra = d.config && texto_(d.config.categoriaSobra).trim();
  if (sobra && ehRenda_(m, sobra) && (!mesclar || !m.cfg.categoriaSobra)) {
    m.cfg.categoriaSobra = sobra;
  } else if (m.cfg.categoriaSobra && !ehRenda_(m, m.cfg.categoriaSobra)) {
    delete m.cfg.categoriaSobra;
  }
  var nome = texto_(d.nome || d.titular).trim();
  var nomeAtual = m.cfg.nome || m.cfg.titular;
  if (nome && (!mesclar || !nomeAtual)) m.cfg.nome = nome.slice(0, 60);
  var tema = d.config && d.config.tema;
  if (!mesclar && TEMAS.indexOf(tema) >= 0) m.cfg.tema = tema;
  m.sujo.categorias = m.sujo.lancamentos = m.sujo.orcamento = m.sujo.recorrencias = m.sujo.cartoes = m.sujo.config = true;
  return resumo;
}

/* ================================================================
   Utilidades
   ================================================================ */

function indice_(lista, campo, valor) {
  for (var i = 0; i < lista.length; i++) if (lista[i][campo] === valor) return i;
  return -1;
}

/** A categoria existe e é de renda? */
function ehRenda_(m, id) {
  var i = indice_(m.cats, 'id', id);
  return i >= 0 && m.cats[i].grupo === 'renda';
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
