/**
 * Instalador do Finanças (bsdesenv) — projeto Apps Script separado.
 *
 * Roda como a pessoa que abre a página (executeAs: USER_ACCESSING) e, com a API do
 * Apps Script, instala o Finanças no Drive dela ou atualiza uma instalação existente.
 *
 * Decisões de segurança:
 *  - Escopos mínimos (ver appsscript.json): só projetos e implantações de script, requisições
 *    externas e drive.file (arquivos criados por este app). Nada de SpreadsheetApp, DriveApp
 *    ou Session: o instalador nunca lê os dados da pessoa nem outras planilhas.
 *  - O código instalado vem só do repositório público bsdesenv/bsdesenv-financas e é
 *    conferido por sha256 contra o versao.json da mesma versão (tag) antes de qualquer escrita.
 *  - Antes de atualizar, o instalador guarda uma versão (cópia de segurança) do projeto.
 *  - Antes de criar algo, confere autorização, a chave da API e os arquivos; se um passo da
 *    instalação falhar mesmo assim, a planilha criada vai para a lixeira.
 *  - Os parâmetros da URL (script, implantacao) são validados por padrão antes do uso.
 */

var REPO = 'bsdesenv/bsdesenv-financas';
var API_SCRIPT = 'https://script.googleapis.com/v1/';
var API_DRIVE = 'https://www.googleapis.com/drive/v3/files';
var RE_ID_GOOGLE = /^[A-Za-z0-9_-]{20,120}$/;
var RE_VERSAO = /^\d+\.\d+\.\d+$/;
var RE_REF = /^[A-Za-z0-9._-]+$/;
var RE_NOME = /^[A-Za-z0-9_-]+$/;

/* ================================================================
   Página
   ================================================================ */

/** Serve a página. Os parâmetros só passam se tiverem cara de ID do Google. */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var modelo = HtmlService.createTemplateFromFile('Index');
  modelo.script = RE_ID_GOOGLE.test(p.script || '') ? p.script : '';
  modelo.implantacao = RE_ID_GOOGLE.test(p.implantacao || '') ? p.implantacao : '';
  // Sem setXFrameOptionsMode(ALLOWALL): ninguém precisa embutir o instalador em outro site.
  return modelo.evaluate()
    .setTitle('Instalador do Finanças')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/* ================================================================
   API chamada pela página (google.script.run)
   ================================================================ */

/**
 * Diagnóstico para a página: falta autorizar?, API ligada?, versão publicada e, com
 * scriptId, o estado da instalação. Nunca lança erro: cada falha vira um campo.
 */
function estado(scriptId, implantacaoId) {
  var r = { autorizar: urlAutorizacao_(), apiLigada: true, versao: null, alvo: null };
  // Sem as permissões (a tela do Google é granular e vem com as caixas desmarcadas),
  // nenhuma outra consulta funcionaria: a página só mostra o botão de autorizar.
  if (r.autorizar) return r;
  r.apiLigada = apiLigada_();
  var id = RE_ID_GOOGLE.test(scriptId || '') ? scriptId : '';
  try {
    var pub = versaoPublicada_();
    r.versao = { versao: pub.versao, ref: pub.ref, data: pub.data, novidades: pub.novidades };
  } catch (err) {
    r.versaoErro = err.message;
  }
  if (id && r.apiLigada) {
    try {
      var alvo = lerAlvo_(id);
      r.alvo = {
        titulo: alvo.titulo, versaoAtual: alvo.versaoAtual, ehFinancas: alvo.ehFinancas,
        implantacoes: implantacoesWeb_(listarImplantacoes_(id)).map(function (d) {
          return { id: d.deploymentId, url: urlWeb_(d), versaoNumero: d.deploymentConfig.versionNumber };
        }),
      };
    } catch (err) {
      r.alvoErro = err.message;
    }
  }
  return r;
}

/** Instala do zero: planilha + projeto vinculado + versão + publicação. */
function instalar(opcoes) {
  var nome = String((opcoes && opcoes.nome) || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Finanças';
  // Tudo o que pode falhar antes é conferido antes: assim um erro não deixa planilha para trás.
  exigirPreparo_();
  var pub = versaoPublicada_();
  var arquivos = baixarArquivos_(pub); // confere os hashes antes de criar qualquer coisa
  var planilha = null;
  try {
    planilha = api_('POST', API_DRIVE + '?fields=id,webViewLink', { name: nome, mimeType: 'application/vnd.google-apps.spreadsheet' });
    var scriptId = api_('POST', 'projects', { title: 'Finanças', parentId: planilha.id }).scriptId;
    api_('PUT', 'projects/' + scriptId + '/content', { files: arquivos });
    var v = api_('POST', 'projects/' + scriptId + '/versions', { description: 'Finanças ' + pub.versao });
    var d = api_('POST', 'projects/' + scriptId + '/deployments', {
      versionNumber: v.versionNumber, manifestFileName: 'appsscript', description: 'Finanças ' + pub.versao,
    });
    return { versao: pub.versao, planilhaUrl: planilha.webViewLink, appUrl: urlWeb_(d), editorUrl: editorUrl_(scriptId), scriptId: scriptId };
  } catch (err) {
    console.error('instalar falhou: ' + (err.detalhe || err.message));
    // A planilha foi criada por este instalador (drive.file permite mexer só nela): vai para a
    // lixeira junto com o projeto vinculado, e a pessoa não fica com uma instalação pela metade.
    var limpou = false;
    if (planilha) {
      try { api_('PATCH', API_DRIVE + '/' + planilha.id, { trashed: true }); limpou = true; } catch (e) { limpou = false; }
    }
    throw new Error('A instalação não terminou: ' + err.message +
      (planilha && !limpou ? ' Apague a planilha "' + nome + '" que ficou no seu Drive e tente de novo.' : ' Nada ficou no seu Drive.'));
  }
}

/** Atualiza uma instalação existente, mantendo o endereço do app e os arquivos extras. */
function atualizar(scriptId, implantacaoId, versaoEsperada) {
  if (!RE_ID_GOOGLE.test(scriptId || '')) throw new Error('Endereço do projeto inválido. Abra o link de atualização pelo Finanças.');
  exigirPreparo_();
  var alvo = lerAlvo_(scriptId);
  if (!alvo.ehFinancas) throw new Error('Este projeto não parece ser o Finanças; nada foi alterado.');
  var pub = versaoPublicada_();
  if (versaoEsperada && versaoEsperada !== pub.versao) {
    throw new Error('Saiu outra versão enquanto você olhava (' + pub.versao + '). Recarregue a página e confira as novidades.');
  }
  if (compararVersoes_(pub.versao, alvo.versaoAtual) <= 0) return { jaAtual: true, versaoAtual: alvo.versaoAtual };

  var novos = baixarArquivos_(pub);
  // Descobre as implantações antes de escrever: sem app da Web, nada é alterado.
  var web = implantacoesWeb_(listarImplantacoes_(scriptId));
  var escolhidas = web;
  if (implantacaoId) {
    var uma = web.filter(function (d) { return d.deploymentId === implantacaoId; });
    if (uma.length) escolhidas = uma;
  }
  if (!escolhidas.length) {
    throw new Error('Este projeto ainda não tem um app da Web publicado. Publique uma vez pelo editor (Implantar › Nova implantação › App da Web) e tente de novo.');
  }

  // Cópia de segurança: uma versão do estado atual, que a pessoa pode reativar no editor.
  var copia = api_('POST', 'projects/' + scriptId + '/versions', { description: 'Cópia antes de atualizar para ' + pub.versao });

  // Arquivos que a pessoa criou ficam como estão. "Código" (com acento, do guia manual) é
  // trocado por "Codigo"; os dois nunca podem coexistir, senão as funções duplicam.
  var nomesNovos = novos.map(function (a) { return a.name; });
  var extras = alvo.arquivos.filter(function (a) {
    return nomesNovos.indexOf(a.name) < 0 && ['Código', 'Codigo', 'appsscript'].indexOf(a.name) < 0;
  });
  api_('PUT', 'projects/' + scriptId + '/content', { files: novos.concat(extras) });
  var v = api_('POST', 'projects/' + scriptId + '/versions', { description: 'Finanças ' + pub.versao });
  var urls = escolhidas.map(function (d) {
    // O PUT mantém o mesmo endereço /exec; só muda a versão apontada.
    api_('PUT', 'projects/' + scriptId + '/deployments/' + d.deploymentId, {
      deploymentConfig: { scriptId: scriptId, versionNumber: v.versionNumber, manifestFileName: 'appsscript', description: 'Finanças ' + pub.versao },
    });
    return urlWeb_(d);
  });
  return {
    versaoAnterior: alvo.versaoAtual,
    versaoNova: pub.versao,
    copiaSeguranca: copia.versionNumber,
    implantacoes: urls,
    extrasMantidos: extras.map(function (a) { return a.name; }),
  };
}

/* ================================================================
   Preparo: autorização e a chave da API do Apps Script
   ================================================================ */

/** URL para autorizar o que falta, ou '' quando todas as permissões já foram dadas. */
function urlAutorizacao_() {
  var info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  return info.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED ? info.getAuthorizationUrl() : '';
}

/**
 * A chave "API Google Apps Script" (script.google.com/home/usersettings) está ligada?
 * Consulta o próprio instalador: com a chave desligada o Google responde 403 apontando para
 * usersettings; com ela ligada, qualquer outra resposta (200, 403 sem acesso, 404) serve.
 */
function apiLigada_() {
  try {
    api_('GET', 'projects/' + ScriptApp.getScriptId());
    return true;
  } catch (err) {
    return !err.apiDesligada;
  }
}

function exigirPreparo_() {
  if (urlAutorizacao_()) throw new Error('Falta autorizar o instalador. Recarregue a página e marque todas as permissões.');
  if (!apiLigada_()) throw new Error('Ligue a API do Apps Script em script.google.com/home/usersettings e tente de novo.');
}

/* ================================================================
   Projeto alvo e implantações
   ================================================================ */

function lerAlvo_(scriptId) {
  var projeto = api_('GET', 'projects/' + scriptId);
  var arquivos = api_('GET', 'projects/' + scriptId + '/content').files || [];
  var versaoAtual = null;
  arquivos.forEach(function (a) {
    if (a.type !== 'SERVER_JS' || (a.name !== 'Codigo' && a.name !== 'Código')) return;
    var m = /var VERSAO_APP = '(\d+\.\d+\.\d+)'/.exec(a.source || '');
    if (m && (a.source || '').indexOf('bsdesenv-financas') >= 0) versaoAtual = m[1];
  });
  return { titulo: projeto.title, arquivos: arquivos, versaoAtual: versaoAtual, ehFinancas: versaoAtual !== null };
}

function listarImplantacoes_(scriptId) {
  return api_('GET', 'projects/' + scriptId + '/deployments').deployments || [];
}

/** Implantações de app da Web com versão fixa (a "principal"/HEAD não tem versionNumber). */
function implantacoesWeb_(lista) {
  return lista.filter(function (d) {
    return d.deploymentConfig && d.deploymentConfig.versionNumber && urlWeb_(d);
  });
}

function urlWeb_(d) {
  var pontos = (d && d.entryPoints) || [];
  for (var i = 0; i < pontos.length; i++) {
    if (pontos[i].entryPointType === 'WEB_APP' && pontos[i].webApp) return pontos[i].webApp.url || '';
  }
  return '';
}

function editorUrl_(scriptId) {
  return 'https://script.google.com/home/projects/' + scriptId + '/edit';
}

/* ================================================================
   Canal de versões (o mesmo do app: versao.json no GitHub)
   ================================================================ */

/**
 * Resolve a versão a instalar: o versao.json da main aponta a tag; o versao.json DA TAG
 * descreve os arquivos dela (com sha256). A propriedade de script REF_TESTE (só o dono do
 * instalador consegue definir) troca a tag por outra ref para testar antes de publicar;
 * a conferência de hash continua valendo.
 */
function versaoPublicada_() {
  var teste = PropertiesService.getScriptProperties().getProperty('REF_TESTE');
  var ref = teste, principal = null;
  if (teste) {
    if (!RE_REF.test(teste)) throw erroFormato_();
  } else {
    var a = baixar_(['versao.json'], 'main')[0];
    if (!a.ok) throw erroGitHub_();
    principal = validarManifesto_(lerJson_(a.texto));
    ref = principal.ref;
  }
  var b = baixar_(['versao.json'], ref)[0];
  if (!b.ok) throw b.status === 404 && principal ? erroAindaPublicando_(principal.versao) : erroGitHub_();
  var m = validarManifesto_(lerJson_(b.texto));
  if (principal && m.versao !== principal.versao) throw erroAindaPublicando_(principal.versao);
  return { ref: ref, versao: m.versao, data: m.data || '', novidades: m.novidades || [], arquivos: m.arquivos };
}

/** Baixa os arquivos da versão, confere o sha256 de cada um e devolve no formato da API. */
function baixarArquivos_(pub) {
  var res = baixar_(pub.arquivos.map(function (a) { return a.caminho; }), pub.ref);
  return pub.arquivos.map(function (a, i) {
    if (!res[i].ok) throw new Error('Não consegui baixar "' + a.caminho + '" do GitHub. Tente de novo em instantes.');
    // Se o arquivo não bate com o versao.json, nada é escrito: pode ser CDN com cópia velha ou adulterada.
    if (sha256Hex_(res[i].texto) !== a.sha256) throw new Error('O arquivo baixado não confere com a versão publicada; nada foi alterado.');
    return { name: a.nome, type: a.tipo, source: res[i].texto };
  });
}

function erroGitHub_() {
  return new Error('Não consegui consultar a versão publicada no GitHub. Tente de novo em instantes.');
}

/** Valida o versao.json. Tudo que vira nome de arquivo, caminho ou URL passa por padrão fechado. */
function validarManifesto_(m) {
  var tipos = ['SERVER_JS', 'HTML', 'JSON'];
  var ok = m && m.app === 'bsdesenv-financas' && RE_VERSAO.test(m.versao || '') &&
    RE_REF.test(m.ref || '') && Array.isArray(m.arquivos) && m.arquivos.length > 0;
  var nomes = {}, manifestos = 0;
  if (ok) {
    m.arquivos.forEach(function (a) {
      if (!a || tipos.indexOf(a.tipo) < 0 || !RE_NOME.test(a.nome || '') || nomes[a.nome] ||
          typeof a.caminho !== 'string' || a.caminho.indexOf('src/') !== 0 || a.caminho.indexOf('..') >= 0 ||
          !/^[0-9a-f]{64}$/.test(a.sha256 || '')) ok = false;
      else {
        nomes[a.nome] = true;
        if (a.nome === 'appsscript' && a.tipo === 'JSON') manifestos++;
      }
    });
  }
  if (!ok || manifestos !== 1) throw erroFormato_();
  return m;
}

function erroFormato_() {
  return new Error('A versão publicada no GitHub está em formato inesperado; nada foi alterado.');
}

function erroAindaPublicando_(versao) {
  return new Error('A versão ' + versao + ' ainda está sendo publicada. Tente de novo em alguns minutos.');
}

function lerJson_(texto) {
  try { return JSON.parse(texto); } catch (e) { throw erroFormato_(); }
}

/**
 * Baixa caminhos de uma ref: tenta o raw.githubusercontent e, para o que falhar, o jsDelivr.
 * Até 2 rodadas, com espera curta. 404 nas duas fontes é definitivo e não repete.
 * Devolve [{ ok, status, texto }] na ordem de `caminhos`.
 */
function baixar_(caminhos, ref) {
  var fontes = [
    function (c) { return 'https://raw.githubusercontent.com/' + REPO + '/' + ref + '/' + c; },
    function (c) { return 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + ref + '/' + c; },
  ];
  var res = caminhos.map(function () { return { ok: false, status: 0, texto: null }; });
  var pendentes = caminhos.map(function (c, i) { return i; });
  for (var rodada = 0; rodada < 2 && pendentes.length; rodada++) {
    if (rodada) Utilities.sleep(800);
    fontes.forEach(function (url) {
      if (!pendentes.length) return;
      var respostas = UrlFetchApp.fetchAll(pendentes.map(function (i) {
        return { url: url(caminhos[i]), muteHttpExceptions: true, followRedirects: true };
      }));
      var faltam = [];
      pendentes.forEach(function (i, k) {
        var codigo = respostas[k].getResponseCode();
        res[i].status = codigo;
        if (codigo === 200) { res[i].ok = true; res[i].texto = respostas[k].getContentText(); }
        else faltam.push(i);
      });
      pendentes = faltam;
    });
    pendentes = pendentes.filter(function (i) { return res[i].status !== 404; });
  }
  return res;
}

function sha256Hex_(texto) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ((b < 0 ? b + 256 : b) + 0x100).toString(16).slice(1); }).join('');
}

/** Compara maior.menor.correção numericamente: -1, 0 ou 1. */
function compararVersoes_(a, b) {
  var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (var i = 0; i < 3; i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0) ? -1 : 1;
  }
  return 0;
}

/* ================================================================
   API do Apps Script e do Drive
   ================================================================ */

/** Chama a API como a pessoa que abriu a página (token dela, só os escopos do manifesto). */
function api_(metodo, url, corpo) {
  var opcoes = {
    method: metodo.toLowerCase(),
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
  };
  if (corpo !== undefined) opcoes.payload = JSON.stringify(corpo);
  var r = UrlFetchApp.fetch(url.indexOf('https://') === 0 ? url : API_SCRIPT + url, opcoes);
  var codigo = r.getResponseCode(), texto = r.getContentText();
  if (codigo >= 300) throw erroApi_(codigo, texto);
  try { return texto ? JSON.parse(texto) : {}; } catch (e) { return {}; }
}

/** Traduz erro HTTP em mensagem amigável; o texto técnico fica em `detalhe` (e no log). */
function erroApi_(codigo, texto) {
  var msg;
  var desligada = codigo === 403 && /usersettings|has not enabled the Apps Script API/i.test(texto || '');
  if (desligada) msg = 'Ligue a API do Apps Script em script.google.com/home/usersettings e tente de novo.';
  else if (codigo === 401 || codigo === 403) msg = 'O instalador não tem permissão para isso. Autorize de novo.';
  else if (codigo === 404) msg = 'Não encontrei o projeto (ou você não tem acesso a ele).';
  else if (codigo === 429 || codigo >= 500) msg = 'O Google está ocupado; tente de novo em instantes.';
  else msg = 'O Google recusou o pedido. Tente de novo.';
  var e = new Error(msg);
  e.codigo = codigo;
  e.apiDesligada = desligada;
  e.detalhe = String(texto || '').slice(0, 500);
  return e;
}
