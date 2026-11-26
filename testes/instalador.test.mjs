// Testa instalador/Codigo.gs no Node, com o Google e o GitHub falsos (testes/instalador-mock.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAmbiente, criarVersao, plano, sha256, ID_INSTALADOR } from './instalador-mock.mjs';

const ID = 'AAAAAAAAAAAAAAAAAAAAAAAA';       // 24 caracteres: parece ID do Google
const IMPL_A = 'IMPLANTACAO_A_0000000000';
const IMPL_B = 'IMPLANTACAO_B_0000000000';

function ambiente(opcoes = {}) {
  const env = criarAmbiente(opcoes);
  env.publicar('v2.7.0', criarVersao('2.7.0'));
  env.publicar('main', criarVersao('2.7.0'));
  env.publicar('main', { manifesto: criarVersao('2.7.0').manifesto, arquivos: {} }, true);
  return env;
}
const c = (env, fn, ...args) => plano(env.ctx[fn](...args));
const web = (id, versao, url) => ({
  deploymentId: id,
  deploymentConfig: { scriptId: ID, versionNumber: versao },
  entryPoints: [{ entryPointType: 'WEB_APP', webApp: { url } }],
});

// Instalação feita pelo guia manual: arquivo "Código" com acento e um arquivo extra da pessoa.
function instalacao(env, { codigo, versao = '2.6.2' } = {}) {
  const fonte = codigo ?? `// bsdesenv-financas\nvar VERSAO_APP = '${versao}';\n`;
  return env.projeto(ID, {
    arquivos: [
      { name: 'Código', type: 'SERVER_JS', source: fonte },
      { name: 'Index', type: 'HTML', source: 'velho' },
      { name: 'Extra', type: 'HTML', source: 'meu arquivo' },
      { name: 'appsscript', type: 'JSON', source: '{}' },
    ],
    implantacoes: [
      { deploymentId: 'HEAD', deploymentConfig: { scriptId: ID }, entryPoints: [{ entryPointType: 'WEB_APP', webApp: { url: 'https://script.google.com/macros/s/dev/dev' } }] },
      web(IMPL_A, 3, 'https://script.google.com/macros/s/AAA/exec'),
      web(IMPL_B, 2, 'https://script.google.com/macros/s/BBB/exec'),
    ],
  });
}

/* ---------------- página ---------------- */

test('doGet: só repassa script/implantacao válidos, sem ALLOWALL', () => {
  const env = ambiente();
  env.ctx.doGet({ parameter: { script: ID, implantacao: 'curto' } });
  assert.deepEqual(plano(env.ultimaPagina.valores), { script: ID, implantacao: '' });
  assert.equal(env.ultimaPagina.titulo, 'Instalador do Finanças');
  assert.match(env.ultimaPagina.metas.viewport, /width=device-width/);
  assert.deepEqual(env.ultimaPagina.ajustes, []);
  assert.match(env.ultimaPagina.favicon, /^https:\/\/raw\.githubusercontent\.com\/bsdesenv\/bsdesenv-financas\/main\/docs\/img\/icone-192\.png$/);
  env.ctx.doGet({ parameter: { script: '"><script>alert(1)</script>' } });
  assert.equal(env.ultimaPagina.valores.script, '');
  env.ctx.doGet();
  assert.equal(env.ultimaPagina.valores.script, '');
});

test('incluir_: só aceita o arquivo Qr', () => {
  const env = ambiente();
  assert.match(env.ctx.incluir_('Qr'), /Qr/);
  assert.throws(() => env.ctx.incluir_('Index'), /não permitido/);
  assert.throws(() => env.ctx.incluir_('../Codigo'), /não permitido/);
});

/* ---------------- canal ---------------- */

test('canal: baixa pelo main, lê o versao.json da tag e confere os hashes', () => {
  const env = ambiente();
  const arquivos = c(env, 'baixarArquivos_', env.ctx.versaoPublicada_());
  assert.deepEqual(arquivos.map((a) => a.name), ['Codigo', 'Index', 'Estilos', 'App', 'appsscript']);
  assert.equal(arquivos[0].type, 'SERVER_JS');
  assert.match(arquivos[0].source, /VERSAO_APP = '2.7.0'/);
  assert.equal(env.chamadas[0].url, 'https://raw.githubusercontent.com/bsdesenv/bsdesenv-financas/main/versao.json');
  assert.ok(env.chamadas.some((x) => x.url.endsWith('/v2.7.0/versao.json')));
});

test('canal: hash errado recusa e não escreve nada', () => {
  const env = ambiente();
  env.arquivosGit['v2.7.0']['src/App.html'] = 'adulterado';
  assert.throws(() => env.ctx.baixarArquivos_(env.ctx.versaoPublicada_()), /não confere com a versão publicada; nada foi alterado/);
  assert.throws(() => env.ctx.instalar({}), /não confere/);
  assert.equal(env.escritas().length, 0);
});

test('canal: raw com 429 cai para o jsDelivr', () => {
  const env = ambiente();
  env.falhas.push({ casar: (r) => r.host === 'raw', codigo: 429, vezes: -1 });
  const pub = env.ctx.versaoPublicada_();
  assert.equal(pub.versao, '2.7.0');
  assert.ok(env.chamadas.some((x) => x.host === 'cdn' && x.url.includes('@main/versao.json')));
  assert.ok(env.chamadas.some((x) => x.host === 'cdn' && x.url.includes('@v2.7.0/versao.json')));
});

test('canal: falha passageira repete na segunda rodada, com espera', () => {
  const env = ambiente();
  env.falhas.push({ casar: (r) => r.host !== 'google', codigo: 503, vezes: 2 }); // raw e cdn falham uma vez
  assert.equal(env.ctx.versaoPublicada_().versao, '2.7.0');
  assert.equal(env.esperas, 1);
});

test('canal: tag que ainda não existe vira "ainda sendo publicada"', () => {
  const env = ambiente();
  delete env.arquivosGit['v2.7.0'];
  assert.throws(() => env.ctx.versaoPublicada_(), /2\.7\.0 ainda está sendo publicada/);
});

test('canal: REF_TESTE usa a ref indicada e ignora o main', () => {
  const env = criarAmbiente({ props: { REF_TESTE: 'teste-1' } });
  env.publicar('teste-1', criarVersao('2.8.0'));
  const pub = plano(env.ctx.versaoPublicada_());
  assert.equal(pub.versao, '2.8.0');
  assert.ok(!env.chamadas.some((x) => x.url.includes('/main/')));
});

test('canal: REF_TESTE sem versao.json é erro, sem caminho alternativo', () => {
  const env = criarAmbiente({ props: { REF_TESTE: 'antiga' } });
  env.arquivosGit.antiga = criarVersao('2.5.0').arquivos; // arquivos sem versao.json
  assert.throws(() => env.ctx.versaoPublicada_(), /Não consegui consultar a versão publicada no GitHub\. Tente de novo em instantes\./);
  assert.throws(() => env.ctx.instalar({}), /Não consegui consultar a versão publicada/);
  assert.equal(env.escritas().length, 0);
});

test('canal: REF_TESTE confere os hashes como a versão normal', () => {
  const env = criarAmbiente({ props: { REF_TESTE: 'teste-1' } });
  env.publicar('teste-1', criarVersao('2.8.0'));
  env.arquivosGit['teste-1']['src/App.html'] = 'adulterado';
  assert.throws(() => env.ctx.baixarArquivos_(env.ctx.versaoPublicada_()), /não confere com a versão publicada/);
});

test('canal: sem REF_TESTE, falta do versao.json da tag é erro (nunca cai na lista padrão)', () => {
  const env = ambiente();
  delete env.arquivosGit['v2.7.0']['versao.json'];
  assert.throws(() => env.ctx.versaoPublicada_(), /ainda está sendo publicada/);
});

test('validações do versao.json', () => {
  const casos = {
    'ref com ..': (m) => { m.ref = 'v1/../x'; },
    'ref com barra': (m) => { m.ref = 'a/b'; },
    'caminho fora de src/': (m) => { m.arquivos[1].caminho = 'docs/Index.html'; },
    'caminho com ..': (m) => { m.arquivos[1].caminho = 'src/../versao.json'; },
    'dois manifestos': (m) => { m.arquivos.push({ ...m.arquivos[4], nome: 'appsscript' }); },
    'sem manifesto': (m) => { m.arquivos.pop(); },
    'nome com ponto': (m) => { m.arquivos[1].nome = 'Index.html'; },
    'tipo desconhecido': (m) => { m.arquivos[1].tipo = 'PYTHON'; },
    'app errado': (m) => { m.app = 'outro'; },
    'versão torta': (m) => { m.versao = '2.7'; },
    'hash torto': (m) => { m.arquivos[1].sha256 = 'abc'; },
  };
  for (const [nome, estraga] of Object.entries(casos)) {
    const env = ambiente();
    const m = criarVersao('2.7.0').manifesto;
    estraga(m);
    env.arquivosGit.main['versao.json'] = JSON.stringify(m);
    assert.throws(() => env.ctx.versaoPublicada_(), /formato inesperado/, nome);
  }
  const env = criarAmbiente({ props: { REF_TESTE: '../x' } });
  assert.throws(() => env.ctx.versaoPublicada_(), /formato inesperado/);
});

test('auxiliares: sha256Hex_ e compararVersoes_', () => {
  const env = ambiente();
  assert.equal(env.ctx.sha256Hex_('Finanças ação'), sha256('Finanças ação'));
  const cmp = env.ctx.compararVersoes_;
  assert.equal(cmp('2.10.0', '2.9.9'), 1);
  assert.equal(cmp('2.6.2', '2.6.2'), 0);
  assert.equal(cmp('2.6.2', '3.0.0'), -1);
});

/* ---------------- estado ---------------- */

test('estado: sem autorização devolve só o link e não faz nenhuma requisição', () => {
  const env = ambiente({ autorizado: false });
  const e = c(env, 'estado', ID, IMPL_A);
  assert.deepEqual(e, { autorizar: 'https://accounts.google.com/autorizar-falso', apiLigada: true, versao: null, alvo: null });
  assert.equal(env.chamadas.length, 0);
});

test('estado: autorizado e API ligada, sem scriptId (sonda 403 sem acesso conta como ligada)', () => {
  const env = ambiente();
  const e = c(env, 'estado', '', '');
  assert.equal(e.autorizar, '');
  assert.equal(e.apiLigada, true);
  assert.equal(e.versao.versao, '2.7.0');
  assert.deepEqual(e.versao.novidades, ['Instalador']);
  assert.equal(e.alvo, null);
});

test('sonda: consulta o projeto do próprio instalador; 403 sem acesso = ligada, 403 usersettings = desligada', () => {
  assert.equal(ID_INSTALADOR.length, 57);
  const ligada = ambiente();
  assert.equal(ligada.ctx.apiLigada_(), true);
  const g = ligada.chamadas.filter((x) => x.host === 'google');
  assert.equal(g.length, 1);
  assert.equal(g[0].metodo, 'GET');
  assert.equal(g[0].url, 'https://script.googleapis.com/v1/projects/' + ID_INSTALADOR);
  const desligada = ambiente({ apiLigada: false });
  assert.equal(desligada.ctx.apiLigada_(), false);
  // 404 também vale como ligada.
  const outra = ambiente();
  outra.falhas.push({ casar: () => true, codigo: 404, vezes: 1 });
  assert.equal(outra.ctx.apiLigada_(), true);
});

test('estado: API desligada (403 usersettings), mesmo com scriptId, não lê o alvo', () => {
  const env = ambiente({ apiLigada: false });
  const e = c(env, 'estado', ID, '');
  assert.equal(e.apiLigada, false);
  assert.equal(e.versao.versao, '2.7.0');
  assert.equal(e.alvo, null);
  assert.equal(e.alvoErro, undefined);
});

test('estado: com scriptId lê o alvo e as implantações de app da Web com versão', () => {
  const env = ambiente();
  instalacao(env);
  const e = c(env, 'estado', ID, IMPL_A);
  assert.equal(e.apiLigada, true);
  assert.deepEqual(e.alvo, {
    titulo: 'Finanças', versaoAtual: '2.6.2', ehFinancas: true,
    implantacoes: [
      { id: IMPL_A, url: 'https://script.google.com/macros/s/AAA/exec', versaoNumero: 3 },
      { id: IMPL_B, url: 'https://script.google.com/macros/s/BBB/exec', versaoNumero: 2 },
    ],
    copia: null,
  });
});

test('estado: projeto que não existe vira alvoErro, e outro projeto não é Finanças', () => {
  const env = ambiente();
  const inexistente = 'B'.repeat(57); // formato de scriptId válido, mas não existe
  assert.match(c(env, 'estado', inexistente, '').alvoErro, /Não encontrei o projeto/);
  env.projeto(ID, { arquivos: [{ name: 'Código', type: 'SERVER_JS', source: 'var VERSAO_APP = "1";' }] });
  assert.equal(c(env, 'estado', ID, '').alvo.ehFinancas, false);
});

/* ---------------- instalar ---------------- */

test('instalar: caminho feliz, na ordem e com os corpos certos', () => {
  const env = ambiente();
  const r = c(env, 'instalar', { nome: '  Minhas   contas  ' });
  const g = env.escritas();
  assert.deepEqual(g.map((x) => x.metodo + ' ' + x.url.replace('https://script.googleapis.com/v1/', '')), [
    'POST https://www.googleapis.com/drive/v3/files?fields=id,webViewLink',
    'POST projects',
    `PUT projects/${r.scriptId}/content`,
    `POST projects/${r.scriptId}/versions`,
    `POST projects/${r.scriptId}/deployments`,
  ]);
  assert.deepEqual(g[0].corpo, { name: 'Minhas contas', mimeType: 'application/vnd.google-apps.spreadsheet' });
  assert.deepEqual(g[1].corpo, { title: 'Finanças', parentId: env.planilhas[0].id });
  assert.deepEqual(g[2].corpo.files.map((f) => f.name), ['Codigo', 'Index', 'Estilos', 'App', 'appsscript']);
  assert.deepEqual(g[3].corpo, { description: 'Finanças 2.7.0' });
  assert.deepEqual(g[4].corpo, { versionNumber: 1, manifestFileName: 'appsscript', description: 'Finanças 2.7.0' });
  assert.ok(g.every((x) => !x.auth || x.auth === 'Bearer token-falso'));
  assert.equal(r.versao, '2.7.0');
  assert.equal(r.planilhaUrl, `https://docs.google.com/spreadsheets/d/${env.planilhas[0].id}/edit`);
  assert.match(r.appUrl, /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/);
  assert.equal(r.editorUrl, `https://script.google.com/home/projects/${r.scriptId}/edit`);
});

test('instalar: nome vazio vira "Finanças" e nome longo é cortado em 80', () => {
  const env = ambiente();
  env.ctx.instalar({ nome: '   ' });
  env.ctx.instalar({ nome: 'x'.repeat(200) });
  assert.equal(env.planilhas[0].name, 'Finanças');
  assert.equal(env.planilhas[1].name.length, 80);
});

const pedidoCriarProjeto = (r) => r.metodo === 'POST' && r.url === 'https://script.googleapis.com/v1/projects';
const patches = (env) => env.chamadas.filter((x) => x.metodo === 'PATCH');

test('instalar: falha no meio manda a planilha para a lixeira e diz que nada ficou', () => {
  const env = ambiente();
  env.falhas.push({ casar: pedidoCriarProjeto, codigo: 500, vezes: 1 });
  assert.throws(() => env.ctx.instalar({}), (e) => {
    assert.equal(e.message, 'A instalação não terminou: O Google está ocupado; tente de novo em instantes. Nada ficou no seu Drive.');
    return true;
  });
  const p = patches(env);
  assert.equal(p.length, 1);
  assert.equal(p[0].url, `https://www.googleapis.com/drive/v3/files/${env.planilhas[0].id}`);
  assert.deepEqual(p[0].corpo, { trashed: true });
  assert.equal(env.planilhas[0].trashed, true);
});

test('instalar: falha tardia (PUT do código) também limpa a planilha', () => {
  const env = ambiente();
  env.falhas.push({ casar: (r) => r.metodo === 'PUT' && r.url.endsWith('/content'), codigo: 500, vezes: 1 });
  assert.throws(() => env.ctx.instalar({}), /Nada ficou no seu Drive\./);
  assert.equal(env.planilhas[0].trashed, true);
});

test('instalar: se a lixeira também falhar, a mensagem cita a planilha pelo nome', () => {
  const env = ambiente();
  env.falhas.push({ casar: pedidoCriarProjeto, codigo: 500, vezes: 1 });
  env.falhas.push({ casar: (r) => r.metodo === 'PATCH', codigo: 500, vezes: -1 });
  assert.throws(() => env.ctx.instalar({ nome: 'Minhas contas' }), (e) => {
    assert.match(e.message, /^A instalação não terminou: O Google está ocupado/);
    assert.match(e.message, /Apague a planilha "Minhas contas" que ficou no seu Drive e tente de novo\.$/);
    assert.doesNotMatch(e.message, /Nada ficou/);
    return true;
  });
  assert.ok(!env.planilhas[0].trashed);
});

test('instalar: sem autorização falha antes de baixar ou criar qualquer coisa', () => {
  const env = ambiente({ autorizado: false });
  assert.throws(() => env.ctx.instalar({}), /Falta autorizar o instalador\. Recarregue a página e marque todas as permissões\./);
  assert.equal(env.chamadas.length, 0);
  assert.equal(env.planilhas.length, 0);
});

test('instalar: com a API desligada manda ligar e não cria nada no Drive', () => {
  const env = ambiente({ apiLigada: false });
  assert.throws(() => env.ctx.instalar({}), /Ligue a API do Apps Script em script\.google\.com\/home\/usersettings e tente de novo\./);
  assert.equal(env.planilhas.length, 0);
  assert.equal(env.escritas().length, 0);
  assert.ok(!env.chamadas.some((x) => x.host !== 'google'), 'nem baixou arquivos do GitHub');
});

/* ---------------- atualizar ---------------- */

test('atualizar: projeto que não é Finanças é recusado sem nenhuma escrita', () => {
  const env = ambiente();
  instalacao(env, { codigo: 'function doGet() {}\nvar VERSAO_APP = "x";' });
  assert.throws(() => env.ctx.atualizar(ID, IMPL_A, '2.7.0'), /não parece ser o Finanças; nada foi alterado/);
  assert.equal(env.escritas().length, 0);
  // Tem "VERSAO_APP" certo mas não cita bsdesenv-financas: também recusa.
  instalacao(env, { codigo: "var VERSAO_APP = '9.9.9';" });
  assert.throws(() => env.ctx.atualizar(ID, IMPL_A, ''), /não parece ser o Finanças/);
  assert.equal(env.escritas().length, 0);
});

test('atualizar: id inválido é recusado antes de qualquer chamada', () => {
  const env = ambiente();
  assert.throws(() => env.ctx.atualizar('../x', '', ''), /inválido/);
  assert.equal(env.chamadas.length, 0);
});

test('atualizar: sem autorização ou com a API desligada falha sem escrever nada', () => {
  const sem = ambiente({ autorizado: false });
  instalacao(sem);
  assert.throws(() => sem.ctx.atualizar(ID, IMPL_A, '2.7.0'), /Falta autorizar o instalador/);
  assert.equal(sem.chamadas.length, 0);
  const off = ambiente({ apiLigada: false });
  instalacao(off);
  assert.throws(() => off.ctx.atualizar(ID, IMPL_A, '2.7.0'), /Ligue a API do Apps Script/);
  assert.equal(off.escritas().length, 0);
  assert.ok(!off.chamadas.some((x) => x.host !== 'google'));
});

test('atualizar: já na versão mais recente não escreve nada', () => {
  const env = ambiente();
  instalacao(env, { versao: '2.7.0' });
  assert.deepEqual(c(env, 'atualizar', ID, IMPL_A, '2.7.0'), { jaAtual: true, versaoAtual: '2.7.0' });
  instalacao(env, { versao: '2.10.0' });
  assert.equal(c(env, 'atualizar', ID, '', '').jaAtual, true);
  assert.equal(env.escritas().length, 0);
});

test('atualizar: versaoEsperada diferente da publicada é recusada', () => {
  const env = ambiente();
  instalacao(env);
  assert.throws(() => env.ctx.atualizar(ID, IMPL_A, '2.6.9'), /Recarregue a página/);
  assert.equal(env.escritas().length, 0);
});

test('atualizar: caminho feliz com cópia, troca de Código por Codigo, extras e só a implantação pedida', () => {
  const env = ambiente();
  const p = instalacao(env);
  const r = c(env, 'atualizar', ID, IMPL_B, '2.7.0');
  assert.deepEqual(r, {
    versaoAnterior: '2.6.2', versaoNova: '2.7.0', copiaSeguranca: 1,
    implantacoes: ['https://script.google.com/macros/s/BBB/exec'], extrasMantidos: ['Extra'],
  });
  const g = env.escritas();
  assert.deepEqual(g.map((x) => x.metodo + ' ' + x.url.replace(/^.*projects\/[^/]+\//, '')), [
    'POST versions', 'PUT content', 'POST versions', `PUT deployments/${IMPL_B}`,
  ]);
  assert.equal(g[0].corpo.description, 'Cópia antes de atualizar para 2.7.0');
  assert.deepEqual(g[2].corpo, { description: 'Finanças 2.7.0' });
  assert.deepEqual(g[3].corpo, { deploymentConfig: { scriptId: ID, versionNumber: 2, manifestFileName: 'appsscript', description: 'Finanças 2.7.0' } });
  // A cópia guarda o estado antigo; o projeto novo tem Codigo (sem acento), extras intactos.
  assert.ok(p.versions[0].files.some((f) => f.name === 'Código'));
  const nomes = p.files.map((f) => f.name);
  assert.deepEqual(nomes, ['Codigo', 'Index', 'Estilos', 'App', 'appsscript', 'Extra']);
  assert.ok(!nomes.includes('Código'));
  assert.equal(p.files.find((f) => f.name === 'Extra').source, 'meu arquivo');
  assert.match(p.files[0].source, /VERSAO_APP = '2.7.0'/);
  // Só a B mudou; a A continua na versão 3.
  assert.equal(p.deployments.find((d) => d.deploymentId === IMPL_B).deploymentConfig.versionNumber, 2);
  assert.equal(p.deployments.find((d) => d.deploymentId === IMPL_A).deploymentConfig.versionNumber, 3);
});

test('atualizar: sem implantacaoId atualiza todas as de app da Web com versão (não a HEAD)', () => {
  const env = ambiente();
  const p = instalacao(env);
  const r = c(env, 'atualizar', ID, '', '');
  assert.equal(r.implantacoes.length, 2);
  const puts = env.escritas().filter((x) => x.url.includes('/deployments/'));
  assert.deepEqual(puts.map((x) => x.url.split('/').pop()), [IMPL_A, IMPL_B]);
  assert.ok(p.deployments.filter((d) => d.deploymentId !== 'HEAD').every((d) => d.deploymentConfig.versionNumber === 2));
  assert.equal(p.deployments[0].deploymentConfig.versionNumber, undefined);
});

test('atualizar: sem app da Web publicado, explica e não altera nada', () => {
  const env = ambiente();
  const p = instalacao(env);
  p.deployments = [p.deployments[0]];
  assert.throws(() => env.ctx.atualizar(ID, '', ''), /publique uma vez pelo editor/i);
  assert.equal(env.escritas().length, 0);
});

test('atualizar: hash errado não escreve nada', () => {
  const env = ambiente();
  instalacao(env);
  env.arquivosGit['v2.7.0']['src/Index.html'] = 'adulterado';
  assert.throws(() => env.ctx.atualizar(ID, '', ''), /não confere/);
  assert.equal(env.escritas().length, 0);
});

/* ---------------- etapas da instalação ---------------- */

const PLANILHA = 'PLANILHA' + '0'.repeat(14);
const nomes = (env) => env.escritas().map((x) => x.metodo + ' ' + x.url.replace('https://script.googleapis.com/v1/', ''));

test('etapas: prepararInstalacao confere os arquivos e não escreve nada', () => {
  const env = ambiente();
  assert.deepEqual(c(env, 'prepararInstalacao'), { versao: '2.7.0', arquivos: 5 });
  assert.equal(env.escritas().length, 0);
  const sem = ambiente({ autorizado: false });
  assert.throws(() => sem.ctx.prepararInstalacao(), /Falta autorizar/);
  const ruim = ambiente();
  ruim.arquivosGit['v2.7.0']['src/App.html'] = 'adulterado';
  assert.throws(() => ruim.ctx.prepararInstalacao(), /não confere/);
});

test('etapas: criarPlanilha limpa o nome e devolve id, url e nome', () => {
  const env = ambiente();
  const r = c(env, 'criarPlanilha', '  Minhas   contas ');
  assert.deepEqual(r, { planilhaId: env.planilhas[0].id, planilhaUrl: `https://docs.google.com/spreadsheets/d/${env.planilhas[0].id}/edit`, nome: 'Minhas contas' });
  assert.deepEqual(env.escritas().map((x) => x.corpo), [{ name: 'Minhas contas', mimeType: 'application/vnd.google-apps.spreadsheet' }]);
  assert.equal(c(env, 'criarPlanilha', '').nome, 'Finanças');
});

test('etapas: criarProjeto cria o projeto vinculado e escreve o código conferido', () => {
  const env = ambiente();
  const r = c(env, 'criarProjeto', PLANILHA, '2.7.0');
  assert.match(r.scriptId, /^SCRIPTNOVO/);
  const g = env.escritas();
  assert.deepEqual(g.map((x) => x.metodo), ['POST', 'PUT']);
  assert.deepEqual(g[0].corpo, { title: 'Finanças', parentId: PLANILHA });
  assert.deepEqual(g[1].corpo.files.map((f) => f.name), ['Codigo', 'Index', 'Estilos', 'App', 'appsscript']);
  assert.match(g[1].corpo.files[0].source, /VERSAO_APP = '2.7.0'/);
  // Baixou e conferiu antes de escrever: o PUT vem depois do download.
  const iPut = env.chamadas.indexOf(env.chamadas.find((x) => x.metodo === 'PUT'));
  assert.ok(env.chamadas.slice(0, iPut).some((x) => x.host === 'raw' && x.url.endsWith('/src/Codigo.gs')));
});

test('etapas: criarProjeto valida argumentos antes de qualquer chamada', () => {
  const env = ambiente();
  assert.throws(() => env.ctx.criarProjeto('../x', '2.7.0'), /planilha inválido/);
  assert.throws(() => env.ctx.criarProjeto(PLANILHA, '2.7'), /Versão inválida/);
  assert.throws(() => env.ctx.criarProjeto(PLANILHA, ''), /Versão inválida/);
  assert.equal(env.chamadas.length, 0);
});

test('etapas: criarProjeto recusa se saiu outra versão ou o hash não bate, e limpa a planilha', () => {
  const env = ambiente();
  env.planilhas.push({ id: PLANILHA, name: 'X' });
  assert.throws(() => env.ctx.criarProjeto(PLANILHA, '2.6.0'), /A instalação não terminou: Saiu outra versão.*Nada ficou no seu Drive\./);
  assert.equal(env.planilhas[0].trashed, true);
  env.planilhas[0].trashed = false;
  env.arquivosGit['v2.7.0']['src/Index.html'] = 'adulterado';
  assert.throws(() => env.ctx.criarProjeto(PLANILHA, '2.7.0'), /não confere/);
  assert.equal(env.escritas().filter((x) => x.metodo === 'PUT' && x.url.endsWith('/content')).length, 0);
});

test('etapas: criarProjeto com falha manda a planilha para a lixeira', () => {
  const env = ambiente();
  env.planilhas.push({ id: PLANILHA, name: 'Minhas contas' });
  env.falhas.push({ casar: pedidoCriarProjeto, codigo: 500, vezes: 1 });
  assert.throws(() => env.ctx.criarProjeto(PLANILHA, '2.7.0'), (e) => {
    assert.equal(e.message, 'A instalação não terminou: O Google está ocupado; tente de novo em instantes. Nada ficou no seu Drive.');
    return true;
  });
  assert.equal(patches(env).length, 1);
  assert.deepEqual(patches(env)[0].corpo, { trashed: true });
  assert.equal(env.planilhas[0].trashed, true);
});

test('etapas: criarProjeto com falha e lixeira falhando cita o nome da planilha', () => {
  const env = ambiente();
  env.planilhas.push({ id: PLANILHA, name: 'Minhas contas' });
  env.falhas.push({ casar: pedidoCriarProjeto, codigo: 500, vezes: 1 });
  env.falhas.push({ casar: (r) => r.metodo === 'PATCH', codigo: 500, vezes: -1 });
  assert.throws(() => env.ctx.criarProjeto(PLANILHA, '2.7.0'), /Apague a planilha "Minhas contas" que ficou no seu Drive e tente de novo\.$/);
  assert.ok(!env.planilhas[0].trashed);
});

test('etapas: publicarApp cria a versão e a implantação e devolve os endereços', () => {
  const env = ambiente();
  const p = env.projeto(ID, { arquivos: [{ name: 'Codigo', type: 'SERVER_JS', source: 'x' }] });
  const r = c(env, 'publicarApp', PLANILHA, ID, '2.7.0');
  assert.deepEqual(nomes(env), [`POST projects/${ID}/versions`, `POST projects/${ID}/deployments`]);
  const g = env.escritas();
  assert.deepEqual(g[0].corpo, { description: 'Finanças 2.7.0' });
  assert.deepEqual(g[1].corpo, { versionNumber: 1, manifestFileName: 'appsscript', description: 'Finanças 2.7.0' });
  assert.equal(p.deployments.length, 1);
  assert.equal(r.versao, '2.7.0');
  assert.equal(r.planilhaUrl, `https://docs.google.com/spreadsheets/d/${PLANILHA}/edit`);
  assert.equal(r.editorUrl, `https://script.google.com/home/projects/${ID}/edit`);
  assert.equal(r.scriptId, ID);
  assert.match(r.appUrl, /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/);
});

test('etapas: publicarApp com falha manda a planilha para a lixeira', () => {
  const env = ambiente();
  env.projeto(ID, {});
  env.planilhas.push({ id: PLANILHA, name: 'X' });
  env.falhas.push({ casar: (r) => r.url.endsWith('/deployments') && r.metodo === 'POST', codigo: 500, vezes: 1 });
  assert.throws(() => env.ctx.publicarApp(PLANILHA, ID, '2.7.0'), /^Error: A instalação não terminou: O Google está ocupado; tente de novo em instantes\. Nada ficou no seu Drive\.$/);
  assert.equal(env.planilhas[0].trashed, true);
  assert.throws(() => env.ctx.publicarApp(PLANILHA, '../x', '2.7.0'), /projeto inválido/);
});

test('etapas: desfazerInstalacao manda a planilha para a lixeira e informa se limpou', () => {
  const env = ambiente();
  env.planilhas.push({ id: PLANILHA, name: 'X' });
  assert.deepEqual(c(env, 'desfazerInstalacao', PLANILHA), { limpou: true });
  assert.equal(patches(env)[0].url, `https://www.googleapis.com/drive/v3/files/${PLANILHA}`);
  assert.deepEqual(patches(env)[0].corpo, { trashed: true });
  assert.equal(env.planilhas[0].trashed, true);
  env.falhas.push({ casar: (r) => r.metodo === 'PATCH', codigo: 500, vezes: -1 });
  assert.deepEqual(c(env, 'desfazerInstalacao', PLANILHA), { limpou: false });
  assert.throws(() => env.ctx.desfazerInstalacao('curto'), /planilha inválido/);
});

/* ---------------- etapas da atualização ---------------- */

test('etapas: prepararAtualizacao devolve o que vai mudar e não escreve nada', () => {
  const env = ambiente();
  instalacao(env);
  assert.deepEqual(c(env, 'prepararAtualizacao', ID, IMPL_A, '2.7.0'), { jaAtual: false, versaoAtual: '2.6.2', versaoNova: '2.7.0', arquivos: 5 });
  assert.equal(env.escritas().length, 0);
});

test('etapas: prepararAtualizacao com jaAtual não baixa os arquivos nem escreve', () => {
  const env = ambiente();
  instalacao(env, { versao: '2.7.0' });
  assert.deepEqual(c(env, 'prepararAtualizacao', ID, '', '2.7.0'), { jaAtual: true, versaoAtual: '2.7.0' });
  assert.equal(env.escritas().length, 0);
  assert.ok(!env.chamadas.some((x) => x.url.endsWith('/src/Codigo.gs')));
});

test('etapas: prepararAtualizacao valida argumentos e recusa versão que saiu', () => {
  const env = ambiente();
  instalacao(env);
  assert.throws(() => env.ctx.prepararAtualizacao('../x', '', ''), /projeto inválido/);
  assert.throws(() => env.ctx.prepararAtualizacao(ID, '../x', ''), /implantação inválido/);
  assert.throws(() => env.ctx.prepararAtualizacao(ID, '', '2.7'), /Versão inválida/);
  assert.equal(env.chamadas.length, 0);
  assert.throws(() => env.ctx.prepararAtualizacao(ID, '', '2.6.9'), /Saiu outra versão/);
});

test('etapas: guardarCopia, trocarCodigo e publicarAtualizacao escrevem uma coisa cada, na ordem', () => {
  const env = ambiente();
  const p = instalacao(env);
  assert.deepEqual(c(env, 'guardarCopia', ID, '2.7.0'), { copiaSeguranca: 1 });
  assert.deepEqual(env.escritas().map((x) => x.corpo), [{ description: 'Cópia antes de atualizar para 2.7.0' }]);
  assert.throws(() => env.ctx.publicarAtualizacao(ID, IMPL_B, '2.7.0'), /não está na versão 2\.7\.0; nada foi publicado/);
  assert.deepEqual(c(env, 'trocarCodigo', ID, '2.7.0'), { extrasMantidos: ['Extra'] });
  assert.deepEqual(p.files.map((f) => f.name), ['Codigo', 'Index', 'Estilos', 'App', 'appsscript', 'Extra']);
  assert.deepEqual(c(env, 'publicarAtualizacao', ID, IMPL_B, '2.7.0'), { versaoNova: '2.7.0', implantacoes: ['https://script.google.com/macros/s/BBB/exec'] });
  assert.equal(p.deployments.find((d) => d.deploymentId === IMPL_B).deploymentConfig.versionNumber, 2);
  assert.equal(p.deployments.find((d) => d.deploymentId === IMPL_A).deploymentConfig.versionNumber, 3);
});

test('etapas: trocarCodigo confere o hash logo antes do PUT e a versão recebida', () => {
  const env = ambiente();
  instalacao(env);
  assert.throws(() => env.ctx.trocarCodigo(ID, '2.6.9'), /Saiu outra versão/);
  env.arquivosGit['v2.7.0']['src/App.html'] = 'adulterado';
  assert.throws(() => env.ctx.trocarCodigo(ID, '2.7.0'), /não confere/);
  assert.equal(env.escritas().length, 0);
  assert.throws(() => env.ctx.trocarCodigo(ID, ''), /Versão inválida/);
});

test('etapas: guardarCopia e trocarCodigo recusam projeto que não é o Finanças', () => {
  const env = ambiente();
  instalacao(env, { codigo: 'function doGet() {}' });
  assert.throws(() => env.ctx.guardarCopia(ID, '2.7.0'), /não parece ser o Finanças/);
  assert.throws(() => env.ctx.trocarCodigo(ID, '2.7.0'), /não parece ser o Finanças/);
  assert.equal(env.escritas().length, 0);
});

/* ---------------- voltar ---------------- */

test('voltarVersao: repõe o conteúdo da cópia e aponta a implantação para ela', () => {
  const env = ambiente();
  const p = instalacao(env);
  const antes = plano(p.files);
  c(env, 'atualizar', ID, IMPL_B, '2.7.0'); // versão 1 = cópia, versão 2 = nova
  assert.equal(c(env, 'estado', ID, IMPL_B).alvo.versaoAtual, '2.7.0');
  env.chamadas.length = 0;
  const r = c(env, 'voltarVersao', ID, IMPL_B, 1);
  assert.deepEqual(r, { versaoAtual: '2.6.2', implantacoes: ['https://script.google.com/macros/s/BBB/exec'] });
  assert.deepEqual(nomes(env), [`PUT projects/${ID}/content`, `PUT projects/${ID}/deployments/${IMPL_B}`]);
  const g = env.escritas();
  assert.deepEqual(g[0].corpo.files, antes);
  assert.deepEqual(g[1].corpo, { deploymentConfig: { scriptId: ID, versionNumber: 1, manifestFileName: 'appsscript', description: 'Finanças 2.6.2' } });
  assert.deepEqual(p.files, antes);
  assert.equal(p.deployments.find((d) => d.deploymentId === IMPL_B).deploymentConfig.versionNumber, 1);
  // Depois de voltar, o estado mostra a versão antiga (e o app oferece atualizar de novo).
  assert.equal(c(env, 'estado', ID, IMPL_B).alvo.versaoAtual, '2.6.2');
});

test('voltarVersao: recusa versão que não é cópia e não escreve nada', () => {
  const env = ambiente();
  instalacao(env);
  c(env, 'atualizar', ID, IMPL_B, '2.7.0'); // versão 2 = "Finanças 2.7.0"
  env.chamadas.length = 0;
  assert.throws(() => env.ctx.voltarVersao(ID, IMPL_B, 2), /Só dá para voltar para uma cópia/);
  assert.throws(() => env.ctx.voltarVersao(ID, IMPL_B, 9), /Só dá para voltar para uma cópia/);
  assert.throws(() => env.ctx.voltarVersao(ID, IMPL_B, 'x'), /Número de versão inválido/);
  assert.throws(() => env.ctx.voltarVersao(ID, IMPL_B, 0), /Número de versão inválido/);
  assert.throws(() => env.ctx.voltarVersao('../x', IMPL_B, 1), /projeto inválido/);
  assert.equal(env.escritas().length, 0);
});

test('voltarVersao: recusa projeto que não é o Finanças e cópia cujo conteúdo não é o Finanças', () => {
  const env = ambiente();
  const p = instalacao(env, { codigo: 'function doGet() {}' });
  assert.throws(() => env.ctx.voltarVersao(ID, IMPL_A, 1), /não parece ser o Finanças/);
  const env2 = ambiente();
  const p2 = instalacao(env2);
  p2.versions.push({ descricao: 'Cópia antes de atualizar para 2.7.0', files: [{ name: 'Codigo', type: 'SERVER_JS', source: 'function doGet() {}' }] });
  assert.throws(() => env2.ctx.voltarVersao(ID, IMPL_A, 1), /Essa cópia não parece ser o Finanças/);
  assert.equal(env.escritas().length + env2.escritas().length, 0);
  assert.ok(p);
});

test('voltarVersao: sem app da Web publicado explica e não altera nada', () => {
  const env = ambiente();
  const p = instalacao(env);
  c(env, 'atualizar', ID, '', '2.7.0');
  p.deployments = [p.deployments[0]];
  env.chamadas.length = 0;
  assert.throws(() => env.ctx.voltarVersao(ID, '', 1), /publique uma vez pelo editor/i);
  assert.equal(env.escritas().length, 0);
});

/* ---------------- estado com cópia ---------------- */

test('estado: alvo.copia é a cópia de maior número, mesmo em outra página', () => {
  const env = ambiente();
  const p = instalacao(env);
  const copia = (n) => ({ descricao: 'Cópia antes de atualizar para 2.' + n + '.0', files: plano(p.files) });
  p.versions.push(copia(1), { descricao: 'Finanças 2.1.0', files: [] }, copia(3), { descricao: 'Finanças 2.3.0', files: [] });
  for (let i = 0; i < 60; i++) p.versions.push({ descricao: 'Finanças 2.4.' + i, files: [] }); // empurra para a 2ª página
  const e = c(env, 'estado', ID, IMPL_A);
  assert.deepEqual(e.alvo.copia, { numero: 3, descricao: 'Cópia antes de atualizar para 2.3.0' });
  assert.ok(env.chamadas.some((x) => x.url.includes('pageToken=')), 'percorreu a segunda página');
});

test('estado: falha ao listar as versões deixa copia = null sem derrubar o estado', () => {
  const env = ambiente();
  instalacao(env);
  env.falhas.push({ casar: (r) => r.metodo === 'GET' && r.url.includes('/versions'), codigo: 500, vezes: -1 });
  const e = c(env, 'estado', ID, IMPL_A);
  assert.equal(e.alvoErro, undefined);
  assert.equal(e.alvo.copia, null);
  assert.equal(e.alvo.versaoAtual, '2.6.2');
});
