/**
 * Testes do servidor (src/Codigo.gs) rodando sobre a planilha falsa.
 * Rodar:  node --test testes/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { criarServidor } from './gas-mock.mjs';

/** Planilha no formato exato da versão 1 (como a de quem já usa o app). */
function planilhaV1() {
  return {
    categorias: [
      ['id', 'nome', 'grupo', 'ordem'],
      ['moradia', 'Moradia', 'fixo', 1],
      ['mercado', 'Mercado', 'variavel', 2],
      ['salario', 'Salário', 'renda', 3],
    ],
    lancamentos: [
      ['id', 'ano', 'mes', 'dia', 'categoriaId', 'descricao', 'valor'],
      ['x0001', 2026, 1, '', 'moradia', '', 1500],
      ['x0002', '2026', 1, 12, 'mercado', 'Feira', '89,90'],
      ['x0003', 2026, 1, '', 'salario', '', 5000],
    ],
    orcamento: [
      ['ano', 'categoriaId', 'mes', 'valor'],
      [2026, 'moradia', 12, 1500],
    ],
    config: [
      ['chave', 'valor'],
      ['titular', 'EXEMPLO'],
      ['atualizadoEm', '2026-07-27T19:26:53.770Z'],
      ['versao', '1'],
    ],
  };
}

const sinc = (ctx, rev, ops) => JSON.parse(ctx.sincronizar(rev, JSON.stringify(ops)));
const lanc = (id, extra = {}) => ({ t: 'lanc', l: { id, ano: 2026, mes: 2, dia: 3, categoriaId: 'mercado', descricao: 'Padaria', valor: 12.5, ...extra } });

test('lê a planilha da versão 1 sem migração', () => {
  const { ctx } = criarServidor(planilhaV1());
  const d = JSON.parse(ctx.carregar());
  assert.equal(d.nome, 'EXEMPLO', 'o titular da v1 vira o nome do controle');
  assert.equal(d.revisao, 0);
  assert.equal(d.categorias.length, 3);
  const l = d.anos['2026'].lancamentos;
  assert.equal(l.length, 3);
  assert.equal(l[0].dia, null, 'dia vazio vira null');
  assert.equal(l[1].valor, 89.9, 'valor com vírgula em texto vira número');
  assert.equal(d.anos['2026'].orcamento.moradia['12'], 1500);
  assert.equal(d.planilha.id, 'planilha-de-teste');
});

test('planilha nova: cria as abas com cabeçalho', () => {
  const { ctx, planilha } = criarServidor();
  const d = JSON.parse(ctx.carregar());
  assert.deepEqual(d.categorias, []);
  for (const aba of ['lancamentos', 'categorias', 'orcamento', 'config']) assert.ok(planilha.abas.has(aba), aba);
  assert.deepEqual(planilha.abas.get('lancamentos').dados[0], ['id', 'ano', 'mes', 'dia', 'categoriaId', 'descricao', 'valor']);
});

test('lançamento: cria, edita e apaga, aumentando a revisão', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  let r = sinc(ctx, 0, [lanc('a1')]);
  assert.equal(r.revisao, 1);
  assert.equal(r.aplicadas, 1);
  assert.equal(r.dados, undefined, 'cliente em dia não recebe a base de volta');
  assert.equal(planilha.ler('lancamentos').length, 4);

  r = sinc(ctx, 1, [lanc('a1', { valor: 20, mes: 3 })]);
  const linha = planilha.ler('lancamentos').find((l) => l[0] === 'a1');
  assert.deepEqual(linha, ['a1', 2026, 3, 3, 'mercado', 'Padaria', 20]);

  r = sinc(ctx, 2, [{ t: 'lanc-', id: 'a1' }, { t: 'lanc-', id: 'nao-existe' }]);
  assert.equal(r.revisao, 3);
  assert.equal(planilha.ler('lancamentos').length, 3, 'apagou só o a1; apagar o que não existe não é erro');
});

test('dois aparelhos não apagam o trabalho um do outro', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  // os dois abriram o app na revisão 0
  const pc = sinc(ctx, 0, [lanc('do-pc', { valor: 10 })]);
  const cel = sinc(ctx, 0, [lanc('do-celular', { valor: 123.45 })]);
  const ids = planilha.ler('lancamentos').map((l) => l[0]);
  assert.ok(ids.includes('do-pc') && ids.includes('do-celular'), 'os dois lançamentos ficaram na planilha');
  assert.equal(pc.revisao, 1);
  assert.equal(cel.revisao, 2);
  assert.ok(cel.dados, 'o aparelho desatualizado recebe a base para se realinhar');
  const doServidor = JSON.parse(cel.dados).anos['2026'].lancamentos.map((l) => l.id);
  assert.ok(doServidor.includes('do-pc'));
});

test('operação inválida é recusada sem derrubar as outras', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  const r = sinc(ctx, 0, [
    lanc('ok1'),
    lanc('ruim1', { valor: 0 }),
    lanc('ruim2', { categoriaId: 'nao-existe' }),
    lanc('ruim3', { mes: 13 }),
    { t: 'xyz' },
    lanc('ok2'),
  ]);
  assert.equal(r.aplicadas, 2);
  assert.deepEqual(r.rejeitadas.map((x) => x.i), [1, 2, 3, 4]);
  assert.ok(r.dados, 'com recusa, o cliente recebe a base para desfazer o que mostrou');
  assert.equal(planilha.ler('lancamentos').length, 5);
});

test('dia inválido para o mês é recusado; 29/02 de bissexto é aceito', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  const r = sinc(ctx, 0, [
    lanc('fevereiro-31', { ano: 2026, mes: 2, dia: 31 }),
    lanc('fevereiro-29-comum', { ano: 2026, mes: 2, dia: 29 }),
    lanc('fevereiro-29-bissexto', { ano: 2028, mes: 2, dia: 29 }),
    lanc('marco-31', { ano: 2026, mes: 3, dia: 31 }),
    lanc('abril-31', { ano: 2026, mes: 4, dia: 31 }),
  ]);
  assert.equal(r.aplicadas, 2);
  assert.deepEqual(r.rejeitadas.map((x) => x.i), [0, 1, 4]);
  const ids = planilha.ler('lancamentos').map((l) => l[0]);
  assert.ok(ids.includes('fevereiro-29-bissexto'), '29/02/2028 existe');
  assert.ok(ids.includes('marco-31'), '31/03 existe');
  assert.ok(!ids.includes('fevereiro-31'), '31/02/2026 não existe');
});

test('importação também recusa lançamento com dia inexistente no mês', () => {
  const { ctx } = criarServidor(planilhaV1());
  const backup = {
    versao: 2,
    categorias: [{ id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 }],
    anos: {
      2026: { lancamentos: [
        { id: 'ruim31', mes: 2, dia: 31, categoriaId: 'mercado', valor: 10 },
        { id: 'ruim29', mes: 2, dia: 29, categoriaId: 'mercado', valor: 20 },
      ], orcamento: {} },
      2028: { lancamentos: [
        { id: 'bom29', mes: 2, dia: 29, categoriaId: 'mercado', valor: 30 },
      ], orcamento: {} },
    },
  };
  const r = sinc(ctx, 0, [{ t: 'importar', dados: backup, modo: 'substituir', confirmado: true }]);
  const d = JSON.parse(r.dados);
  assert.equal(d.anos['2026'], undefined, 'as datas inválidas foram ignoradas');
  assert.equal(d.anos['2028'].lancamentos.length, 1);
  assert.equal(d.anos['2028'].lancamentos[0].id, 'bom29');
});

test('ids e lotes fora do padrão são recusados', () => {
  const { ctx } = criarServidor(planilhaV1());
  const r = sinc(ctx, 0, [lanc('<script>'), lanc('-comeca-com-traco'), { t: 'cat', c: { id: 'a b', nome: 'X', grupo: 'fixo', ordem: 1 } }]);
  assert.equal(r.aplicadas, 0);
  assert.equal(r.rejeitadas.length, 3);
  assert.throws(() => ctx.sincronizar(0, JSON.stringify(Array.from({ length: 501 }, (_, i) => lanc('l' + i)))), /Muitas operações/);
  assert.throws(() => ctx.sincronizar(0, '{"nao":"lista"}'), /lista de operações/);
});

test('categoria com lançamentos não pode ser apagada; sem lançamentos, leva junto o plano', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  let r = sinc(ctx, 0, [{ t: 'cat-', id: 'mercado' }]);
  assert.match(r.rejeitadas[0].motivo, /tem lançamentos/);
  r = sinc(ctx, 0, [
    { t: 'cat', c: { id: 'lazer', nome: 'Lazer', grupo: 'variavel', ordem: 9 } },
    { t: 'orc', ano: 2026, categoriaId: 'lazer', mes: 5, valor: 300 },
  ]);
  assert.equal(planilha.ler('orcamento').length, 2);
  r = sinc(ctx, r.revisao, [{ t: 'cat-', id: 'lazer' }]);
  assert.equal(r.aplicadas, 1);
  assert.equal(planilha.ler('categorias').length, 3);
  assert.equal(planilha.ler('orcamento').length, 1, 'o plano da categoria apagada saiu junto');
});

test('plano do mês: grava, atualiza e remove', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  sinc(ctx, 0, [{ t: 'orc', ano: 2026, categoriaId: 'mercado', mes: 11, valor: 1360 }]);
  sinc(ctx, 1, [{ t: 'orc', ano: 2026, categoriaId: 'mercado', mes: 11, valor: 1400.555 }]);
  let linhas = planilha.ler('orcamento').filter((l) => l[1] === 'mercado');
  assert.deepEqual(linhas, [[2026, 'mercado', 11, 1400.56]]);
  sinc(ctx, 2, [{ t: 'orc', ano: 2026, categoriaId: 'mercado', mes: 11, valor: null }]);
  linhas = planilha.ler('orcamento').filter((l) => l[1] === 'mercado');
  assert.equal(linhas.length, 0);
  const r = sinc(ctx, 3, [{ t: 'orc', ano: 2026, categoriaId: 'mercado', mes: 11, valor: -5 }]);
  assert.equal(r.rejeitadas.length, 1, 'plano negativo é recusado');
});

test('texto que viraria fórmula é gravado como texto', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  sinc(ctx, 0, [
    lanc('f1', { descricao: '=IMPORTXML("http://exemplo", "//a")' }),
    { t: 'cat', c: { id: 'cat-formula', nome: '+SOMA(1)', grupo: 'variavel', ordem: 5 } },
  ]);
  const celulas = [...planilha.ler('lancamentos').flat(), ...planilha.ler('categorias').flat()];
  assert.ok(!celulas.some((v) => String(v).startsWith('#FORMULA#')), 'nenhuma célula virou fórmula');
  const d = JSON.parse(ctx.carregar());
  assert.equal(d.anos['2026'].lancamentos.find((l) => l.id === 'f1').descricao, '=IMPORTXML("http://exemplo", "//a")');
  assert.equal(d.categorias.find((c) => c.id === 'cat-formula').nome, '+SOMA(1)');
});

test('configuração: nome e tema', () => {
  const { ctx } = criarServidor(planilhaV1());
  const r = sinc(ctx, 0, [{ t: 'cfg', k: 'nome', v: 'Casa' }, { t: 'cfg', k: 'tema', v: 'escuro' }, { t: 'cfg', k: 'senha', v: 'x' }]);
  assert.equal(r.aplicadas, 2);
  const d = JSON.parse(ctx.carregar());
  assert.equal(d.nome, 'Casa');
  assert.equal(d.tema, 'escuro');
});

test('importar: exige confirmação, substitui ou mescla', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  const backup = {
    versao: 1, titular: 'OUTRO',
    categorias: [{ id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 }, { id: 'pets', nome: 'Pets', grupo: 'variavel', ordem: 2 }],
    anos: { 2025: { lancamentos: [
      { id: 'b1', mes: 5, dia: null, categoriaId: 'pets', descricao: '', valor: 80 },
      { mes: 6, dia: 2, categoriaId: 'pets', descricao: 'sem id', valor: 30 },
      { id: 'torto', mes: 99, dia: 1, categoriaId: 'pets', valor: 1 },
    ], orcamento: { pets: { 7: 100 } } } },
  };
  let r = sinc(ctx, 0, [{ t: 'importar', dados: backup }]);
  assert.match(r.rejeitadas[0].motivo, /confirmada/);

  r = sinc(ctx, 0, [{ t: 'importar', dados: backup, modo: 'mesclar', confirmado: true }]);
  assert.ok(r.dados, 'importação sempre devolve a base nova');
  let d = JSON.parse(r.dados);
  assert.equal(d.categorias.length, 4, 'mesclar mantém as categorias existentes');
  assert.equal(d.anos['2026'].lancamentos.length, 3);
  assert.equal(d.anos['2025'].lancamentos.length, 2, 'o lançamento torto foi ignorado; o sem id ganhou um');
  assert.equal(d.nome, 'EXEMPLO', 'mesclar não troca o nome que já existe');

  r = sinc(ctx, r.revisao, [{ t: 'importar', dados: backup, modo: 'substituir', confirmado: true }]);
  d = JSON.parse(r.dados);
  assert.equal(d.categorias.length, 2);
  assert.equal(d.anos['2026'], undefined, 'substituir troca tudo');
  assert.equal(d.nome, 'OUTRO');
  assert.equal(planilha.ler('orcamento').length, 1);
});

test('importar: tema do arquivo vale no substituir e é preservado no mesclar', () => {
  const { ctx } = criarServidor(planilhaV1());
  const backup = {
    versao: 2,
    config: { tema: 'claro' },
    categorias: [{ id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 }],
    anos: { 2026: { lancamentos: [], orcamento: {} } },
  };
  let r = sinc(ctx, 0, [{ t: 'cfg', k: 'tema', v: 'escuro' }]);
  assert.equal(r.aplicadas, 1);

  r = sinc(ctx, 1, [{ t: 'importar', dados: backup, modo: 'mesclar', confirmado: true }]);
  assert.equal(JSON.parse(r.dados).tema, 'escuro', 'mesclar mantém o tema atual');

  r = sinc(ctx, 2, [{ t: 'importar', dados: backup, modo: 'substituir', confirmado: true }]);
  assert.equal(JSON.parse(r.dados).tema, 'claro', 'substituir aplica o tema do arquivo');

  r = sinc(ctx, 3, [{ t: 'importar', dados: { ...backup, config: { tema: 'neon' } }, modo: 'substituir', confirmado: true }]);
  assert.equal(JSON.parse(r.dados).tema, 'claro', 'tema fora de TEMAS é ignorado');
});

test('edição feita à mão na planilha aumenta a revisão', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  const range = planilha.ss.getSheetByName('lancamentos').getRange(2, 7);
  ctx.onEdit({ range });
  assert.equal(ctx.estado().revisao, 1);
  ctx.onEdit({ range: planilha.ss.getSheetByName('config').getRange(2, 2) });
  assert.equal(ctx.estado().revisao, 1, 'mexer na aba config não conta');
});

test('aba que encolhe não guarda lixo no fim', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  sinc(ctx, 0, [{ t: 'lanc-', id: 'x0001' }, { t: 'lanc-', id: 'x0002' }]);
  assert.equal(planilha.ler('lancamentos').length, 1);
  const bruto = planilha.abas.get('lancamentos').dados;
  assert.ok(bruto.slice(2).every((l) => l.every((v) => v === '')), 'linhas antigas foram limpas');
});

test('página: usa os includes, meta tags permitidas e sem ALLOWALL', () => {
  const { ctx, meta } = criarServidor();
  const pagina = ctx.doGet({ parameter: {} });
  const html = pagina.getContent();
  assert.ok(!html.includes("incluir("), 'todos os includes foram resolvidos');
  assert.ok(html.includes('<style') && html.includes('<script'), 'estilos e script embutidos');
  assert.equal(pagina.titulo, 'Finanças');
  const permitidas = ['viewport', 'apple-mobile-web-app-capable', 'mobile-web-app-capable', 'google-site-verification'];
  assert.ok(meta.every(([n]) => permitidas.includes(n)), 'só meta tags aceitas pelo Apps Script');
  assert.match(pagina.favicon, /\.png$/);
});

test('carregar informa o scriptId e o endereço do app para a atualização assistida', () => {
  const { ctx } = criarServidor(planilhaV1());
  const d = JSON.parse(ctx.carregar());
  assert.equal(d.scriptId, 'ID_DO_PROJETO_DE_TESTE');
  assert.match(d.urlApp, /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/);
});

test('sem permissão para ScriptApp, scriptId e urlApp ficam vazios e o app abre', () => {
  const { ctx } = criarServidor(planilhaV1());
  ctx.ScriptApp = { getScriptId: () => { throw new Error('sem permissão'); }, getService: () => { throw new Error('sem permissão'); } };
  const d = JSON.parse(ctx.carregar());
  assert.equal(d.scriptId, '');
  assert.equal(d.urlApp, '');
  assert.equal(d.categorias.length, 3);
});

const marcasDe = (ctx) => JSON.parse(ctx.carregar()).marcas;

test('marcas: encerrar e reabrir uma categoria no mês', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  assert.deepEqual(marcasDe(ctx), {});
  const k = 'encerrada:2026-11:mercado';
  let r = sinc(ctx, 0, [{ t: 'cfg', k, v: '1' }]);
  assert.equal(r.aplicadas, 1);
  assert.deepEqual(marcasDe(ctx), { [k]: '1' });
  assert.ok(planilha.ler('config').some((l) => l[0] === k && String(l[1]) === '1'));
  const rev1 = r.revisao;
  r = sinc(ctx, rev1, [{ t: 'cfg', k, v: '' }]);
  assert.equal(r.aplicadas, 1);
  assert.ok(r.revisao > rev1, 'a revisão aumenta a cada operação aplicada');
  assert.deepEqual(marcasDe(ctx), {});
  assert.ok(!planilha.ler('config').some((l) => l[0] === k), 'a linha some da aba config');
});

test('marcas: recusas não derrubam o lote', () => {
  const { ctx } = criarServidor(planilhaV1());
  const r = sinc(ctx, 0, [
    { t: 'cfg', k: 'encerrada:2026-13:mercado', v: '1' },
    { t: 'cfg', k: 'encerrada:2026-11:fantasma', v: '1' },
    { t: 'cfg', k: 'encerrada:2026-11:mercado', v: 'talvez' },
    { t: 'cfg', k: 'outra', v: '1' },
    { t: 'cfg', k: 'encerrada:2026-10:salario', v: true },
  ]);
  assert.equal(r.aplicadas, 1);
  assert.equal(r.rejeitadas.length, 4);
  assert.match(r.rejeitadas[0].motivo, /marca inválida/);
  assert.match(r.rejeitadas[1].motivo, /categoria inexistente/);
  assert.match(r.rejeitadas[2].motivo, /valor de marca inválido/);
  assert.match(r.rejeitadas[3].motivo, /desconhecida/);
  assert.deepEqual(Object.keys(marcasDe(ctx)), ['encerrada:2026-10:salario']);
});

test('marcas: outras chaves de config ficam intactas', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  const k = 'encerrada:2026-11:mercado';
  sinc(ctx, 0, [{ t: 'cfg', k: 'nome', v: 'Casa' }, { t: 'cfg', k: 'tema', v: 'escuro' }, { t: 'cfg', k, v: '1' }]);
  sinc(ctx, 3, [{ t: 'cfg', k, v: null }]);
  const chaves = Object.fromEntries(planilha.ler('config').map((l) => [l[0], l[1]]));
  assert.equal(chaves.titular, 'EXEMPLO');
  assert.equal(chaves.nome, 'Casa');
  assert.equal(chaves.tema, 'escuro');
  assert.equal(chaves[k], undefined);
});

test('marcas: importar substitui, mescla e ignora o inválido', () => {
  const { ctx } = criarServidor(planilhaV1());
  const k1 = 'encerrada:2026-11:mercado';
  const k2 = 'encerrada:2026-10:pets';
  const base = {
    versao: 3,
    categorias: [{ id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 }, { id: 'pets', nome: 'Pets', grupo: 'variavel', ordem: 2 }],
    anos: { 2026: { lancamentos: [], orcamento: {} } },
  };
  sinc(ctx, 0, [{ t: 'cfg', k: k1, v: '1' }]);
  let r = sinc(ctx, 1, [{ t: 'importar', modo: 'substituir', confirmado: true, dados: { ...base, config: { marcas: { [k2]: '1' } } } }]);
  assert.deepEqual(JSON.parse(r.dados).marcas, { [k2]: '1' }, 'substituir troca as marcas');

  r = sinc(ctx, r.revisao, [{ t: 'importar', modo: 'mesclar', confirmado: true, dados: { ...base, config: { marcas: {
    [k1]: '1', 'encerrada:2026-09:fantasma': '1', 'encerrada:2026-14:pets': '1', 'encerrada:2026-08:pets': 'x',
  } } } }]);
  assert.deepEqual(JSON.parse(r.dados).marcas, { [k1]: '1', [k2]: '1' }, 'mesclar acrescenta e ignora o inválido');

  r = sinc(ctx, r.revisao, [{ t: 'importar', modo: 'mesclar', confirmado: true, dados: base }]);
  assert.equal(Object.keys(JSON.parse(r.dados).marcas).length, 2, 'backup sem marcas mantém as atuais no mesclar');
  r = sinc(ctx, r.revisao, [{ t: 'importar', modo: 'substituir', confirmado: true, dados: base }]);
  assert.deepEqual(JSON.parse(r.dados).marcas, {}, 'backup antigo no substituir zera as marcas');
});

test('marcas: o servidor da 2.7.1 preserva a marca ao gravar outra configuração', () => {
  const antigo = execFileSync('git', ['show', 'v2.7.1:src/Codigo.gs'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
  const abas = planilhaV1();
  abas.config.push(['encerrada:2026-11:mercado', '1']);
  const { ctx, planilha } = criarServidor(abas, { codigo: antigo });
  const r = sinc(ctx, 0, [{ t: 'cfg', k: 'nome', v: 'Casa' }]);
  assert.equal(r.aplicadas, 1);
  const chaves = Object.fromEntries(planilha.ler('config').map((l) => [l[0], l[1]]));
  assert.equal(chaves['encerrada:2026-11:mercado'], 1, 'a marca continua na planilha');
  assert.equal(chaves.nome, 'Casa');
});

const fechadosDe = (ctx) => JSON.parse(ctx.carregar()).fechados;

test('fechamento: gravar, aparecer em carregar e remover', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  assert.deepEqual(fechadosDe(ctx), {});
  let r = sinc(ctx, 0, [{ t: 'cfg', k: 'fechado:2026-10', v: '1516.1' }, { t: 'cfg', k: 'fechado:2026-09', v: '-230.45' }]);
  assert.equal(r.aplicadas, 2);
  assert.deepEqual(fechadosDe(ctx), { '2026-10': '1516.1', '2026-09': '-230.45' });
  assert.ok(planilha.ler('config').some((l) => l[0] === 'fechado:2026-10'));
  r = sinc(ctx, r.revisao, [{ t: 'cfg', k: 'fechado:2026-10', v: '' }, { t: 'cfg', k: 'fechado:2026-09', v: null }]);
  assert.equal(r.aplicadas, 2);
  assert.deepEqual(fechadosDe(ctx), {});
  assert.ok(!planilha.ler('config').some((l) => String(l[0]).startsWith('fechado:')));
});

test('fechamento: recusas vão para rejeitadas com motivo', () => {
  const { ctx } = criarServidor(planilhaV1());
  const r = sinc(ctx, 0, [
    { t: 'cfg', k: 'fechado:2026-13', v: '10' },
    { t: 'cfg', k: 'fechado:2026-10', v: 'abc' },
    { t: 'cfg', k: 'fechado:2026-1', v: '10' },
    { t: 'cfg', k: 'fechado:2026-10', v: '10.123' },
    { t: 'cfg', k: 'fechado:2026-10', v: '10' },
  ]);
  assert.equal(r.aplicadas, 1);
  assert.equal(r.rejeitadas.length, 4);
  assert.match(r.rejeitadas[0].motivo, /fechamento inválido/);
  assert.match(r.rejeitadas[1].motivo, /valor de fechamento inválido/);
  assert.match(r.rejeitadas[2].motivo, /fechamento inválido/);
  assert.match(r.rejeitadas[3].motivo, /valor de fechamento inválido/);
  assert.deepEqual(fechadosDe(ctx), { '2026-10': '10' });
});

test('fechamento: importar substitui, mescla e ignora o inválido com motivo', () => {
  const { ctx } = criarServidor(planilhaV1());
  const base = { versao: 3, categorias: [{ id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 }], anos: { 2026: { lancamentos: [], orcamento: {} } } };
  sinc(ctx, 0, [{ t: 'cfg', k: 'fechado:2026-10', v: '5' }]);
  let r = sinc(ctx, 1, [{ t: 'importar', modo: 'substituir', confirmado: true, dados: { ...base, config: { fechados: { '2026-09': '100.5', '2026-13': '1', '2026-08': 'x' } } } }]);
  assert.deepEqual(JSON.parse(r.dados).fechados, { '2026-09': '100.5' }, 'substituir troca os fechamentos');
  assert.equal(r.importacao.motivos.length, 2);
  assert.equal(r.importacao.categorias.aceitas, 1);
  r = sinc(ctx, r.revisao, [{ t: 'importar', modo: 'mesclar', confirmado: true, dados: { ...base, config: { fechados: { '2026-09': '999', '2026-07': '-3' } } } }]);
  assert.deepEqual(JSON.parse(r.dados).fechados, { '2026-09': '100.5', '2026-07': '-3' }, 'mesclar só acrescenta os que não existem');
  r = sinc(ctx, r.revisao, [{ t: 'importar', modo: 'mesclar', confirmado: true, dados: base }]);
  assert.equal(Object.keys(JSON.parse(r.dados).fechados).length, 2);
  r = sinc(ctx, r.revisao, [{ t: 'importar', modo: 'substituir', confirmado: true, dados: base }]);
  assert.deepEqual(JSON.parse(r.dados).fechados, {});
});

test('fechamento: o servidor da 2.8.1 preserva a chave ao gravar o nome', () => {
  const antigo = execFileSync('git', ['show', 'v2.8.1:src/Codigo.gs'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
  const abas = planilhaV1();
  abas.config.push(['fechado:2026-10', '1516.1']);
  const { ctx, planilha } = criarServidor(abas, { codigo: antigo });
  const r = sinc(ctx, 0, [{ t: 'cfg', k: 'nome', v: 'Casa' }]);
  assert.equal(r.aplicadas, 1);
  const chaves = Object.fromEntries(planilha.ler('config').map((l) => [l[0], l[1]]));
  assert.equal(String(chaves['fechado:2026-10']), '1516.1');
  assert.equal(chaves.nome, 'Casa');
});

const cat = (id, grupo, extra = {}) => ({ t: 'cat', c: { id, nome: id, grupo, ordem: 9, ...extra } });
const cfgDe = (planilha) => Object.fromEntries(planilha.ler('config').map((l) => [l[0], l[1]]));

test('grupo da categoria: renda e gasto só trocam sem lançamentos; fixo e variável sempre', () => {
  const { ctx } = criarServidor(planilhaV1());
  const r = sinc(ctx, 0, [
    cat('moradia', 'renda'), // tem lançamento
    cat('salario', 'fixo'), // tem lançamento
    cat('moradia', 'variavel'), // fixo -> variável com lançamentos: aceita
    cat('mercado', 'fixo'),
    { t: 'cat', c: { id: 'vazia', nome: 'Vazia', grupo: 'fixo', ordem: 8 } },
    cat('vazia', 'renda'), // sem lançamentos: aceita
    cat('vazia', 'variavel'),
  ]);
  assert.deepEqual(r.rejeitadas.map((x) => x.i), [0, 1]);
  assert.match(r.rejeitadas[0].motivo, /não pode mudar entre renda e gasto/);
  const grupos = Object.fromEntries(JSON.parse(ctx.carregar()).categorias.map((c) => [c.id, c.grupo]));
  assert.equal(grupos.moradia, 'variavel');
  assert.equal(grupos.mercado, 'fixo');
  assert.equal(grupos.salario, 'renda');
  assert.equal(grupos.vazia, 'variavel');
});

test('categoriaGuardar: valida, remove, aparece no carregar e protege a categoria', () => {
  const { ctx, planilha } = criarServidor(planilhaV1());
  assert.equal(JSON.parse(ctx.carregar()).categoriaGuardar, '');
  let r = sinc(ctx, 0, [
    { t: 'cfg', k: 'categoriaGuardar', v: 'salario' },
    { t: 'cfg', k: 'categoriaGuardar', v: 'fantasma' },
    { t: 'cfg', k: 'categoriaGuardar', v: 'mercado' },
  ]);
  assert.deepEqual(r.rejeitadas.map((x) => x.i), [0, 1]);
  assert.match(r.rejeitadas[0].motivo, /categoria de economia inválida: salario/);
  assert.equal(JSON.parse(ctx.carregar()).categoriaGuardar, 'mercado');
  assert.equal(cfgDe(planilha).categoriaGuardar, 'mercado');

  r = sinc(ctx, r.revisao, [{ t: 'cat-', id: 'mercado' }, { t: 'cat', c: { id: 'mercado', nome: 'Mercado', grupo: 'renda', ordem: 2 } }]);
  assert.equal(r.rejeitadas.length, 2);
  assert.match(r.rejeitadas[0].motivo, /economia não pode ser apagada/);
  assert.match(r.rejeitadas[1].motivo, /economia não pode virar renda/);

  r = sinc(ctx, r.revisao, [{ t: 'cfg', k: 'categoriaGuardar', v: '' }]);
  assert.equal(r.aplicadas, 1);
  assert.equal(JSON.parse(ctx.carregar()).categoriaGuardar, '');
  assert.equal(cfgDe(planilha).categoriaGuardar, undefined);
});

test('categoriaGuardar: importar substitui, mescla e limpa o que não existe mais', () => {
  const { ctx } = criarServidor(planilhaV1());
  const base = {
    versao: 3,
    categorias: [{ id: 'pets', nome: 'Pets', grupo: 'variavel', ordem: 1 }, { id: 'pago', nome: 'Pago', grupo: 'renda', ordem: 2 }],
    anos: { 2026: { lancamentos: [], orcamento: {} } },
  };
  sinc(ctx, 0, [{ t: 'cfg', k: 'categoriaGuardar', v: 'mercado' }]);
  const imp = (modo, config) => JSON.parse(sinc(ctx, 99, [{ t: 'importar', modo, confirmado: true, dados: { ...base, config } }]).dados).categoriaGuardar;
  assert.equal(imp('mesclar', { categoriaGuardar: 'pets' }), 'mercado', 'mesclar não troca a que já existe');
  assert.equal(imp('substituir', { categoriaGuardar: 'pago' }), '', 'renda não vale; a antiga sumiu e é removida');
  assert.equal(imp('mesclar', { categoriaGuardar: 'pets' }), 'pets', 'mesclar grava se não havia');
  assert.equal(imp('substituir', {}), 'pets', 'sem a chave no arquivo, a que ainda existe fica');
  assert.equal(imp('substituir', { categoriaGuardar: 'pets' }), 'pets');
});

test('importar informa o que foi ignorado', () => {
  const { ctx } = criarServidor(planilhaV1());
  const dados = {
    versao: 3,
    categorias: [
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 },
      { id: 'semnome', nome: '', grupo: 'fixo', ordem: 2 },
    ],
    anos: { 2026: {
      lancamentos: [
        { id: 'x0010', mes: 2, dia: 3, categoriaId: 'mercado', descricao: 'ok', valor: 10 },
        { id: 'x0012', mes: 2, dia: 31, categoriaId: 'mercado', descricao: 'ruim', valor: 10 },
      ],
      orcamento: { mercado: { 1: 100, 13: 50 } },
    } },
  };
  const r = sinc(ctx, 0, [{ t: 'importar', modo: 'substituir', confirmado: true, dados }]);
  assert.equal(r.aplicadas, 1);
  assert.deepEqual(r.importacao.categorias, { aceitas: 1, ignoradas: 1 });
  assert.deepEqual(r.importacao.lancamentos, { aceitos: 1, ignorados: 1 });
  assert.deepEqual(r.importacao.planos, { aceitos: 1, ignorados: 1 });
  assert.equal(r.importacao.motivos.length, 3);
  assert.ok(r.importacao.motivos.includes('lançamento x0012 (2026): dia inválido para o mês: 31'));
  assert.ok(r.importacao.motivos.includes('plano mercado 2026/13: mês inválido'));
  assert.ok(r.importacao.motivos.some((t) => /^categoria semnome: nome de categoria vazio/.test(t)));
  assert.equal(sinc(ctx, r.revisao, [lanc('a1', { categoriaId: 'mercado' })]).importacao, undefined);
});

test('compatibilidade: o servidor da 2.8.0 preserva categoriaGuardar ao gravar outra configuração', () => {
  const antigo = execFileSync('git', ['show', 'v2.8.0:src/Codigo.gs'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
  const abas = planilhaV1();
  abas.config.push(['categoriaGuardar', 'mercado']);
  const { ctx, planilha } = criarServidor(abas, { codigo: antigo });
  const r = sinc(ctx, 0, [{ t: 'cfg', k: 'nome', v: 'Casa' }]);
  assert.equal(r.aplicadas, 1);
  const chaves = cfgDe(planilha);
  assert.equal(chaves.categoriaGuardar, 'mercado');
  assert.equal(chaves.nome, 'Casa');
});
