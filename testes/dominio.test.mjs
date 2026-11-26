/**
 * Testes das regras de cálculo (seção 1 de src/App.html, entre os marcadores <dominio>).
 * O trecho não toca no DOM nem no estado do app: roda aqui num contexto isolado do Node.
 * Rodar:  node --test testes/dominio.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonte = fs.readFileSync(path.join(RAIZ, 'src', 'App.html'), 'utf8');
const ini = fonte.indexOf('/* <dominio>');
const fim = fonte.indexOf('/* </dominio> */');
assert.ok(ini > 0 && fim > ini, 'os marcadores <dominio> e </dominio> existem em src/App.html');
const D = vm.runInNewContext(`${fonte.slice(ini, fim)}
;({ paraNumero, paraNumeros, pareceVezes, indexarAno, contasDoMes, mediaRealizada, chaveMes, faseDe, moedaRedonda,
  recorrenciasDoMes, situacaoContas, dividirParcelas, lerOFX, lerCSV, lerDataBr, lerValorBr, hash53, idImportado,
  classificarExtrato, sugerirCategoria, lerVezes, montarDescParcela, baseParcela, ehIdParcela, planoParcelas, diaQuitado,
  mesMais, mesDaFatura, diaDoVencimento, idNoCartao, cartaoDoId, lancamentosDoCartao, faturaDoCartao, limiteUsado, novoIdCartao, sinaisDaPlanilha,
  decodificarTexto, adivinharColunasCSV, extratoDeCSV, inverterSinal, valorDoExtrato })`, { TextDecoder });

/** Objetos de outro contexto: compara pelo conteúdo. */
const js = (x) => JSON.parse(JSON.stringify(x));
const r2 = (v) => Math.round(v * 100) / 100;

const CATS = [
  { id: 'guardar', nome: 'Guardar', grupo: 'fixo', ordem: 0 },
  { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 },
  { id: 'contas', nome: 'Contas da casa', grupo: 'fixo', ordem: 2 },
  { id: 'taxas', nome: 'Taxas', grupo: 'fixo', ordem: 3 },
  { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 4 },
  { id: 'lazer', nome: 'Lazer', grupo: 'variavel', ordem: 5 },
  { id: 'outros', nome: 'Outros', grupo: 'variavel', ordem: 6 },
  { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 7 },
  { id: 'extra', nome: 'Renda extra', grupo: 'renda', ordem: 8 },
];
const PLANOS = { guardar: 500, aluguel: 1000, contas: 350, mercado: 1200, lazer: 300, salario: 7900 };
const HOJE = { ano: 2026, mes: 11, dia: 18 };

/** Novembro de 2026 com os lançamentos e planos dados. `lanc`: [categoria, valor]. */
function mes(lanc = [], { planos = PLANOS, encerradas = [], cats = CATS, hoje = HOJE, gid = 'guardar' } = {}) {
  const bloco = { lancamentos: lanc.map(([categoriaId, valor], i) => ({ id: 'l' + i, mes: 11, dia: 1, categoriaId, descricao: '', valor })), orcamento: {} };
  for (const [cid, v] of Object.entries(planos)) bloco.orcamento[cid] = { 11: v };
  return D.contasDoMes({ cats, idx: D.indexarAno(bloco), ano: 2026, mes: 11, hoje, gid, encerrada: (cid) => encerradas.includes(cid) });
}
const BASE = [['mercado', 400], ['salario', 7900]];
/** Diferença de um campo entre dois estados. */
const delta = (a, b, campo = 'disponivel') => r2(b[campo] - a[campo]);

test('composição: renda − já saiu − contas a pagar − falta guardar − ainda nos planos', () => {
  const r = mes(BASE);
  assert.equal(r.renda, 7900);
  assert.equal(r.recebida, 7900);
  assert.equal(r.aReceber, 0);
  assert.equal(r.jaSaiu, 400);
  assert.equal(r.contasAPagar, 1350);
  assert.equal(r.faltaGuardar, 500);
  assert.equal(r.nosPlanos, 1100);
  assert.equal(r.reservado, 2950);
  assert.equal(r.disponivel, 4550);
  assert.equal(r.saidasPrevistas, 3350);
  assert.equal(r.sobraRealizada, 7500);
});

test('gastar dentro do plano não muda o disponível; sai do que resta no plano', () => {
  const a = mes(BASE); const b = mes([...BASE, ['mercado', 100]]);
  assert.equal(delta(a, b), 0);
  assert.equal(delta(a, b, 'nosPlanos'), -100);
  assert.equal(delta(a, b, 'jaSaiu'), 100);
});

test('primeiro lançamento abaixo do plano não aumenta o disponível (a regra antiga aumentava)', () => {
  const a = mes(BASE); const b = mes([...BASE, ['lazer', 270]]);
  assert.equal(delta(a, b), 0);
  assert.equal(r2(b.legado.disponivel - a.legado.disponivel), 30, 'regra até a 2.7: subia 30 ao gastar');
});

test('gasto acima do plano e gasto sem plano reduzem o disponível na mesma medida', () => {
  const acima = mes([['mercado', 1250], ['salario', 7900]]);
  assert.equal(delta(acima, mes([['mercado', 1350], ['salario', 7900]])), -100);
  const a = mes(BASE);
  assert.equal(delta(a, mes([...BASE, ['outros', 300]])), -300);
});

test('estornos: sem plano aumentam o disponível; com plano voltam para o plano', () => {
  const a = mes(BASE);
  const semPlano = mes([...BASE, ['outros', -50]]);
  assert.equal(delta(a, semPlano), 50);
  const fixoSemPlano = mes([...BASE, ['taxas', -50]]);
  assert.equal(delta(a, fixoSemPlano), 50);
  assert.equal(fixoSemPlano.contasAPagar, a.contasAPagar, 'estorno numa conta sem plano não vira conta a pagar');
  const comPlano = mes([...BASE, ['mercado', -50]]);
  assert.equal(delta(a, comPlano), 0);
  assert.equal(delta(a, comPlano, 'nosPlanos'), 50);
});

test('contas fixas: pagar pelo plano não muda; mais barata só libera ao quitar; mais cara reduz', () => {
  const a = mes(BASE);
  assert.equal(delta(a, mes([...BASE, ['aluguel', 1000]])), 0);
  const barata = mes([...BASE, ['contas', 320]]);
  assert.equal(delta(a, barata), 0);
  assert.equal(delta(a, mes([...BASE, ['contas', 320]], { encerradas: ['contas'] })), 30);
  assert.equal(delta(a, mes([...BASE, ['contas', 380]])), -30);
});

test('renda: o vale não derruba o disponível; "não vem mais" tira o que faltava', () => {
  const semSalario = mes([['mercado', 400]]);
  const vale = mes([['mercado', 400], ['salario', 3160]]);
  assert.equal(delta(semSalario, vale), 0);
  assert.equal(vale.aReceber, 4740);
  assert.equal(r2(vale.legado.disponivel - semSalario.legado.disponivel), -4740, 'regra até a 2.7: caía 4.740');
  const menor = mes([['mercado', 400], ['salario', 7500]], { encerradas: ['salario'] });
  assert.equal(delta(mes(BASE), menor), -400);
  assert.equal(menor.aReceber, 0);
});

test('renda sem previsão: entra o que for lançado, inclusive correção negativa', () => {
  const a = mes(BASE);
  assert.equal(delta(a, mes([...BASE, ['extra', 200]])), 200);
  const neg = mes([...BASE, ['extra', -100]]);
  assert.equal(delta(a, neg), -100);
  assert.equal(neg.aReceber, 0, 'correção negativa numa renda sem previsão não vira "a receber"');
});

test('Guardar: reserva o que falta da meta; guardar além reduz; resgate soma sem aumentar a falta', () => {
  const a = mes(BASE);
  const parte = mes([...BASE, ['guardar', 300]]);
  assert.equal(parte.faltaGuardar, 200);
  assert.equal(delta(a, parte), 0);
  assert.equal(delta(a, mes([...BASE, ['guardar', 700]])), -200);
  const resgate = mes([...BASE, ['guardar', -1000]]);
  assert.equal(delta(a, resgate), 1000);
  assert.equal(resgate.faltaGuardar, 500);
});

test('Guardar no grupo Variáveis conta uma vez só', () => {
  const cats = CATS.map((c) => (c.id === 'guardar' ? { ...c, grupo: 'variavel' } : c));
  const r = mes(BASE, { cats });
  assert.equal(r.faltaGuardar, 500);
  assert.equal(r.nosPlanos, 1100, 'a meta não entra em "ainda nos planos"');
  assert.equal(r.disponivel, mes(BASE).disponivel);
});

test('aumentar o plano de um variável reserva o valor', () => {
  const a = mes(BASE); const b = mes(BASE, { planos: { ...PLANOS, lazer: 600 } });
  assert.equal(delta(a, b, 'nosPlanos'), 300);
  assert.equal(delta(a, b), -300);
});

test('categoria encerrada não reserva nada, e o plano continua gravado', () => {
  const r = mes(BASE, { encerradas: ['mercado'] });
  const m = r.porCat.find((x) => x.c.id === 'mercado').v;
  assert.equal(m.encerrada, true);
  assert.equal(m.plano, 1200);
  assert.equal(m.falta, 0);
  assert.equal(r.nosPlanos, 300);
});

test('propriedade: nenhum gasto positivo numa saída aumenta o disponível', () => {
  let semente = 42;
  const sorte = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  const saidas = CATS.filter((c) => c.grupo !== 'renda').map((c) => c.id);
  for (let i = 0; i < 300; i++) {
    const lanc = Array.from({ length: Math.floor(sorte() * 12) }, () => [CATS[Math.floor(sorte() * CATS.length)].id, r2((sorte() - 0.15) * 2000)]).filter(([, v]) => v !== 0);
    const encerradas = CATS.filter(() => sorte() < 0.15).map((c) => c.id);
    const antes = mes(lanc, { encerradas });
    const cid = saidas[Math.floor(sorte() * saidas.length)];
    const depois = mes([...lanc, [cid, r2(sorte() * 500 + 0.01)]], { encerradas });
    assert.ok(depois.disponivel <= antes.disponivel + 1e-9, `subiu ao gastar em ${cid}: ${antes.disponivel} → ${depois.disponivel}`);
  }
});

test('contas em centavos: sem resíduo de ponto flutuante', () => {
  const r = mes([['mercado', 0.1], ['mercado', 0.2], ['mercado', 1389.19], ['salario', 7900]]);
  assert.equal(r.jaSaiu, 1389.49);
  assert.equal(r.porCat.find((x) => x.c.id === 'mercado').v.real, 1389.49);
});

test('mês passado: sobra realizada e pendências (planos sem lançamento)', () => {
  const dez = { ano: 2026, mes: 12, dia: 5 };
  const r = mes(BASE, { hoje: dez });
  assert.equal(r.fase, 'passado');
  assert.equal(r.sobraRealizada, 7500);
  const ids = js(r.pendencias.itens).map((x) => x.c.id).sort();
  assert.deepEqual(ids, ['aluguel', 'contas', 'guardar', 'lazer'], 'mercado teve lançamento: não é pendência');
  assert.equal(r.pendencias.saidas, 2150);
  assert.equal(r.pendencias.renda, 0);
});

test('fases do mês e ritmo', () => {
  assert.equal(D.faseDe(2026, 10, HOJE), 'passado');
  assert.equal(D.faseDe(2026, 11, HOJE), 'atual');
  assert.equal(D.faseDe(2027, 1, HOJE), 'futuro');
  const r = mes(BASE);
  assert.equal(r.restantes, 13);
  assert.equal(r.porDia, Math.floor(4550 / 13));
});

test('valor digitado: formatos aceitos, sinal e multiplicação só com asterisco', () => {
  const casos = [['1200', 1200], ['1.200', 1200], ['12,00', 12], ['1.200,50', 1200.5], ['0,01', 0.01], ['R$ 89,90', 89.9],
    ['−50,00', -50], ['-50', -50], ['−R$ 50,00', -50], ['', null], ['abc', null], ['1200x10', null]];
  for (const [txt, esperado] of casos) assert.equal(D.paraNumero(txt), esperado, `paraNumero(${JSON.stringify(txt)})`);
  assert.deepEqual(js(D.paraNumeros('217,93 176,15')), [217.93, 176.15]);
  assert.deepEqual(js(D.paraNumeros('36*4')), [36, 36, 36, 36]);
  assert.deepEqual(js(D.paraNumeros('10+20,50')), [10, 20.5]);
  assert.equal(D.paraNumeros('1200x10'), null);
  assert.equal(D.pareceVezes('1200x10 compras geladeira'), true);
  assert.equal(D.pareceVezes('36*4'), false);
});

test('média: só o lançado, sem o mês corrente, a partir do primeiro mês com dados', () => {
  const k = (m) => D.chaveMes(2026, m);
  const somas = { 8: 1000, 9: 1200, 10: 1400, 11: 300 };
  const somaDe = (a, m) => somas[m] || 0;
  assert.equal(D.mediaRealizada({ somaDe, alvo: k(12), atual: k(11), inicio: k(1) }), 1200, 'planejar dezembro usa ago–out, não novembro pela metade');
  assert.equal(D.mediaRealizada({ somaDe, alvo: k(11), atual: k(11), inicio: k(10) }), 1400, 'só meses a partir do início dos dados');
  assert.equal(D.mediaRealizada({ somaDe: () => 0, alvo: k(12), atual: k(11), inicio: Infinity }), 0, 'sem dados, sem sugestão');
});

test('herói arredondado: sem "−R$ 0"', () => {
  assert.match(D.moedaRedonda(-0.4), /^R\$\s0$/);
  assert.match(D.moedaRedonda(57.6), /^R\$\s58$/);
  assert.match(D.moedaRedonda(-1200.5), /^−R\$\s1\.201$|^−R\$\s1\.200$/);
});

/* ---------------------------------------------------------------------
   3.1.0: recorrências, plano efetivo, situação das contas, parcelas e extrato.
   --------------------------------------------------------------------- */

/** Recorrências de exemplo (novembro de 2026 é o mês de referência). */
const RECS = [
  { id: 'a', categoriaId: 'aluguel', descricao: 'Aluguel', valor: 1000, dia: 10, inicio: 202601, fim: null, ativa: true, automatico: false },
  { id: 'b', categoriaId: 'contas', descricao: 'Luz', valor: 150.5, dia: 31, inicio: 202611, fim: null, ativa: true, automatico: false },
  { id: 'c', categoriaId: 'contas', descricao: 'Água', valor: 80, dia: null, inicio: 202601, fim: 202610, ativa: true, automatico: false },
  { id: 'd', categoriaId: 'mercado', descricao: 'Cesta', valor: 200, dia: 5, inicio: 202612, fim: null, ativa: true, automatico: false },
  { id: 'e', categoriaId: 'lazer', descricao: 'Clube', valor: 50, dia: 2, inicio: 202601, fim: null, ativa: false, automatico: false },
  { id: 'f', categoriaId: 'contas', descricao: 'Internet', valor: 20, dia: null, inicio: 202611, fim: 202611, ativa: true, automatico: false },
  { id: 'g', categoriaId: 'contas', descricao: 'Seguro', valor: 30, dia: 12, inicio: 202601, fim: '', ativa: true, automatico: true },
];
const PULADA_G = (id) => id === 'g';
const dataNov = (dia) => ({ ano: 2026, mes: 11, dia });

test('B1 recorrências do mês: período, ativa, dia limitado e pulada não soma', () => {
  const m = D.recorrenciasDoMes(RECS, 2026, 11, PULADA_G);
  assert.deepEqual([...m.keys()].sort(), ['aluguel', 'contas'], 'futura, encerrada e inativa ficam de fora');
  assert.equal(m.get('aluguel').cent, 100000);
  const c = js(m.get('contas'));
  assert.equal(c.cent, 17050, 'Seguro pulada não soma; Luz e Internet somam');
  assert.deepEqual(c.itens.map((i) => i.r.id), ['g', 'b', 'f'], 'ordem por dia, sem dia por último');
  assert.equal(c.itens[0].pulada, true);
  assert.equal(c.itens[1].dia, 30, 'dia 31 limitado ao último dia de novembro');
  assert.equal(c.itens[2].dia, null);
  assert.equal(m.has('mercado'), false, 'começa em dezembro');
  assert.equal(D.recorrenciasDoMes([], 2026, 11, PULADA_G).size, 0);
});

/** Novembro de 2026 com recorrências e planos gravados (lançamentos: [categoria, valor]). */
function mesRec(lanc = [], planos = {}, recs = [], extra = {}) {
  const bloco = { lancamentos: lanc.map(([categoriaId, valor], i) => ({ id: 'l' + i, mes: 11, dia: 1, categoriaId, descricao: '', valor })), orcamento: {} };
  for (const [cid, v] of Object.entries(planos)) bloco.orcamento[cid] = { 11: v };
  const recorrentes = D.recorrenciasDoMes(recs, 2026, 11, () => false);
  return D.contasDoMes({ cats: CATS, idx: D.indexarAno(bloco), ano: 2026, mes: 11, hoje: HOJE, gid: 'guardar', recorrentes, ...extra });
}
const ALUGUEL_REC = RECS.filter((r) => r.id === 'a');

test('B2 plano efetivo: gravado vale; sem gravado, vale a recorrência, marcada como recorrente', () => {
  const comRec = mesRec([], {}, ALUGUEL_REC);
  const pa = comRec.porCat.find((x) => x.c.id === 'aluguel').v;
  assert.equal(pa.plano, 1000);
  assert.equal(pa.recorrente, true);
  assert.equal(comRec.contasAPagar, 1000);
  const gravado = mesRec([], { aluguel: 1200 }, ALUGUEL_REC).porCat.find((x) => x.c.id === 'aluguel').v;
  assert.equal(gravado.plano, 1200);
  assert.equal(gravado.recorrente, undefined, 'plano gravado não é marcado como recorrente');
  assert.equal(mesRec([], { aluguel: '' }, ALUGUEL_REC).contasAPagar, 1000, 'plano vazio não conta como gravado');
  assert.equal(mesRec([], { aluguel: 1000 }, []).disponivel, comRec.disponivel, 'recorrência de 1000 e plano gravado de 1000 dão o mesmo disponível');
});

test('B2 transporte: o lançado na categoria da sobra sai da sobra realizada', () => {
  const lanc = [['mercado', 400], ['salario', 7900], ['outros', 120]];
  const com = mesRec(lanc, {}, [], { sid: 'outros' });
  assert.equal(com.transporte, 120);
  assert.equal(com.sobraRealizada, 7380);
  assert.equal(com.resultado, 7260);
  const sem = mesRec(lanc);
  assert.equal(sem.transporte, 0);
  assert.equal(sem.resultado, sem.sobraRealizada);
});

/** Itens como saem de recorrenciasDoMes: sem Seguro (pulada), a ordem é a do dia. */
const ITENS_B3 = [
  { r: { id: '1', descricao: 'Luz', automatico: false }, cent: 10000, dia: 5, pulada: false },
  { r: { id: '2', descricao: 'Água', automatico: false }, cent: 5000, dia: 12, pulada: false },
  { r: { id: '3', descricao: 'Plano', automatico: true }, cent: 3000, dia: 3, pulada: false },
  { r: { id: '4', descricao: 'Pulada', automatico: false }, cent: 999, dia: 20, pulada: true },
];

test('B3 situação das contas: lançado distribuído em ordem de dia; atraso e vencimento', () => {
  const s = js(D.situacaoContas(ITENS_B3, 12000, 10));
  assert.deepEqual(s.map((x) => x.r.id), ['3', '1', '2'], 'pulada fica de fora');
  assert.deepEqual(s.map((x) => x.pagoCent), [3000, 9000, 0]);
  assert.deepEqual(s.map((x) => x.restante), [0, 1000, 5000]);
  assert.deepEqual(s.map((x) => x.pago), [true, false, false]);
  assert.deepEqual(s.map((x) => x.atrasada), [false, true, false], 'automática nunca é atrasada; dia 5 com saldo é');
  assert.deepEqual(s.map((x) => x.venceHoje), [false, false, false]);
  const h = js(D.situacaoContas(ITENS_B3, 12000, 12));
  assert.deepEqual(h.map((x) => x.venceHoje), [false, false, true]);
  assert.deepEqual(h.map((x) => x.atrasada), [false, true, false], 'vence hoje não é atrasada');
  const semHoje = js(D.situacaoContas(ITENS_B3, 0, null));
  assert.ok(semHoje.every((x) => !x.atrasada && !x.venceHoje), 'sem data de hoje, nada é atrasado');
  assert.deepEqual(semHoje.map((x) => x.pagoCent), [0, 0, 0], 'lançado negativo conta como zero');
});

test('B4 dividirParcelas: a sobra vai para a primeira; n entre 2 e 48', () => {
  assert.deepEqual(js(D.dividirParcelas(100000, 3)), [33334, 33333, 33333]);
  assert.deepEqual(js(D.dividirParcelas(10, 2)), [5, 5]);
  const p = js(D.dividirParcelas(1000, 48));
  assert.equal(p.length, 48);
  assert.deepEqual([p[0], p[1]], [60, 20]);
  assert.deepEqual(js(D.dividirParcelas(-100, 3)), [-34, -33, -33]);
  for (let n = 2; n <= 48; n++) {
    const q = js(D.dividirParcelas(12345, n));
    assert.equal(q.reduce((a, b) => a + b, 0), 12345, `soma com ${n} parcelas`);
  }
  for (const n of [1, 49, 2.5]) assert.throws(() => D.dividirParcelas(100, n), { name: 'RangeError' }, `n = ${n}`);
});

test('B5 lerDataBr: formatos aceitos e datas inexistentes recusadas', () => {
  assert.deepEqual(js(D.lerDataBr('01/11/2026')), dataNov(1));
  assert.deepEqual(js(D.lerDataBr('1/11/26')), dataNov(1));
  assert.deepEqual(js(D.lerDataBr('2026-11-18')), dataNov(18));
  assert.deepEqual(js(D.lerDataBr('18-11-2026')), dataNov(18));
  assert.deepEqual(js(D.lerDataBr('18.11.2026')), dataNov(18));
  assert.deepEqual(js(D.lerDataBr('29/02/2028')), { ano: 2028, mes: 2, dia: 29 });
  for (const t of ['31/02/2026', '29/02/2027', '2026/11/18', 'abc', '', '01/13/2026']) assert.equal(D.lerDataBr(t), null, JSON.stringify(t));
});

test('B5 lerValorBr: formatos brasileiros e americanos, sinais e sufixos', () => {
  const casos = [['1.234,56', 1234.56], ['-1.234,56', -1234.56], ['1234.56', 1234.56], ['1,234.56', 1234.56],
    ['R$ 1.234,56', 1234.56], ['(1.234,56)', -1234.56], ['1.234,56 D', -1234.56], ['1.234,56 C', 1234.56],
    ['−1.234,56', -1234.56], ['1.234', 1234], ['12,5', 12.5], ['−R$ 50,00', -50]];
  for (const [txt, esperado] of casos) assert.equal(D.lerValorBr(txt), esperado, JSON.stringify(txt));
  for (const t of ['', 'abc', '1,5,', '1.2.3']) assert.equal(D.lerValorBr(t), null, JSON.stringify(t));
});

test('B5 lerOFX: SGML sem fechamento, entidades, MEMO antes de NAME e conta', () => {
  const ofx = [
    'OFXHEADER:100', 'DATA:OFXSGML', 'VERSION:102', '', '<OFX>', '<BANKMSGSRSV1>', '<STMTTRNRS>', '<STMTRS>', '<CURDEF>BRL',
    '<BANKACCTFROM>', '<BANKID>123', '<ACCTID>98765-4', '<ACCTTYPE>CHECKING', '</BANKACCTFROM>', '<BANKTRANLIST>',
    '<STMTTRN>', '<TRNTYPE>DEBIT', '<DTPOSTED>20261105120000[-3:BRT]', '<TRNAMT>-50.25', '<FITID>T1', '<NAME>MERCADO',
    '<MEMO>COMPRA &amp; CIA &lt;X&gt;',
    '<STMTTRN>', '<TRNTYPE>CREDIT', '<DTPOSTED>20261110', '<TRNAMT>1200,00', '<FITID>T2', '<NAME>SALARIO', '</STMTTRN>',
    '</BANKTRANLIST>', '</STMTRS>', '</OFX>',
  ].join('\n');
  const r = js(D.lerOFX(ofx));
  assert.equal(r.conta, '123/98765-4');
  assert.equal(r.itens.length, 2);
  assert.deepEqual(r.itens[0], { fitid: 'T1', data: dataNov(5), valor: -50.25, descricao: 'COMPRA & CIA <X>' });
  assert.deepEqual(r.itens[1], { fitid: 'T2', data: dataNov(10), valor: 1200, descricao: 'SALARIO' });
});

test('B5 lerOFX: XML de cartão, conta pelo CCACCTFROM e entidade apóstrofo', () => {
  const xml = '<OFX><CREDITCARDMSGSRSV1><CCSTMTRS><CCACCTFROM><ACCTID>4000</ACCTID></CCACCTFROM><BANKTRANLIST>'
    + '<STMTTRN><DTPOSTED>20261102</DTPOSTED><TRNAMT>-10.00</TRNAMT><FITID>C1</FITID><NAME>Padaria</NAME>'
    + '<MEMO>Pao &apos;x&apos;</MEMO></STMTTRN></BANKTRANLIST></CCSTMTRS></CREDITCARDMSGSRSV1></OFX>';
  const r = js(D.lerOFX(xml));
  assert.equal(r.conta, 'CCACCTFROM/4000');
  assert.deepEqual(r.itens, [{ fitid: 'C1', data: dataNov(2), valor: -10, descricao: "Pao 'x'" }]);
});

test('B5 lerCSV: separador pela consistência, aspas com "", linhas vazias, BOM e CRLF', () => {
  const pt = js(D.lerCSV('﻿Data;Descricao;Valor\r\n01/11/2026;"Padaria ""Central""";12,50\r\n\r\n02/11/2026;Mercado;1.234,56\r\n'));
  assert.equal(pt.sep, ';');
  assert.equal(pt.linhas.length, 3);
  assert.equal(pt.linhas[0][0], 'Data', 'BOM tirado');
  assert.equal(pt.linhas[1][1], 'Padaria "Central"');
  const vg = js(D.lerCSV('data,descricao,valor\n2026-11-01,"a, b",10\n'));
  assert.equal(vg.sep, ',');
  assert.deepEqual(vg.linhas[1], ['2026-11-01', 'a, b', '10']);
  assert.equal(D.lerCSV('a\tb\tc\n1\t2\t3\n').sep, '\t');
});

test('B5 hash53 e idImportado: estáveis, base 36 e no formato de id do servidor', () => {
  assert.equal(D.hash53('abc', 0), D.hash53('abc', 0));
  assert.notEqual(D.hash53('abc', 0), D.hash53('abc', 1));
  assert.match(D.hash53('abc', 0), /^[0-9a-z]+$/);
  const id = D.idImportado('123/98765', 'T1');
  assert.match(id, /^x[0-9a-z]+$/);
  assert.match(id, /^[A-Za-z0-9][A-Za-z0-9_-]{0,59}$/);
  assert.notEqual(id, D.idImportado('999/1', 'T1'));
});

test('B5 classificarExtrato: status na ordem invalida, duplicada-arquivo, ja-importada, possível e nova', () => {
  const conta = '123/98765';
  const existentes = [
    { id: 'l1', ano: 2026, mes: 11, dia: 5, valor: -50.25, descricao: 'Mercado' },
    { id: 'l3', ano: 2026, mes: 11, dia: 12, valor: -7, descricao: 'Padaria' },
    { id: D.idImportado(conta, 'T9'), ano: 2026, mes: 11, dia: 9, valor: -20, descricao: 'Farmácia' },
  ];
  const linhas = [
    { fitid: 'T1', data: dataNov(5), valor: -50.25, descricao: 'MERCADO.' },
    { fitid: 'T2', data: dataNov(12), valor: -7, descricao: 'Padaria' },
    { fitid: 'T2', data: dataNov(12), valor: -7, descricao: 'Padaria' },
    { fitid: 'T9', data: dataNov(9), valor: -20, descricao: 'Farmácia' },
    { fitid: null, data: dataNov(20), valor: 100, descricao: 'Pix recebido' },
    { fitid: null, data: null, valor: 5, descricao: 'sem data' },
    { fitid: null, data: dataNov(20), valor: null, descricao: 'sem valor' },
    { fitid: null, data: dataNov(21), valor: -30, descricao: 'Cinema' },
    { fitid: null, data: dataNov(21), valor: -30, descricao: 'Cinema' },
  ];
  const r = js(D.classificarExtrato(linhas, existentes, conta));
  assert.deepEqual(r.map((x) => x.status), ['possivel-duplicada', 'possivel-duplicada', 'duplicada-arquivo', 'ja-importada',
    'nova', 'invalida', 'invalida', 'nova', 'nova']);
  assert.equal(r[4].id, D.idImportado(conta, '2026-11-20|10000|pix recebido|1'));
  assert.equal(r[5].motivo, 'sem data');
  assert.equal(r[6].motivo, 'sem valor');
  assert.equal(r[8].ocorrencia, 2);
  assert.notEqual(r[7].id, r[8].id);
});

test('B5 classificarExtrato: uma cópia existente cobre só a primeira linha igual', () => {
  const cin = { fitid: null, data: dataNov(21), valor: -30, descricao: 'Cinema' };
  const ex = [{ id: 'x', ano: 2026, mes: 11, dia: 21, valor: -30, descricao: 'cinema.' }];
  const r = js(D.classificarExtrato([cin, cin], ex, ''));
  assert.deepEqual(r.map((x) => x.status), ['possivel-duplicada', 'nova']);
});

test('B5 sugerirCategoria: mesma descrição, depois a mesma primeira palavra de 3 letras', () => {
  const hist = [
    { descricao: 'Padaria Central', categoriaId: 'mercado' },
    { descricao: 'Padaria Central', categoriaId: 'mercado' },
    { descricao: 'Padaria do Bairro', categoriaId: 'lazer' },
    { descricao: 'Posto Shell', categoriaId: 'outros' },
    { descricao: 'Padaria Central', categoriaId: 'lazer' },
  ];
  assert.equal(D.sugerirCategoria('PADARIA CENTRAL.', hist), 'mercado');
  assert.equal(D.sugerirCategoria('Padaria Nova', [hist[0], hist[2], hist[2]]), 'lazer');
  assert.equal(D.sugerirCategoria('Posto', hist), 'outros');
  assert.equal(D.sugerirCategoria('Pa', hist), null, 'primeira palavra com menos de 3 letras não sugere');
  assert.equal(D.sugerirCategoria('Uber', hist), null);
  assert.equal(D.sugerirCategoria('Uber', []), null);
});

test('3.1.0 lerVezes: valor x N, de 2 a 48', () => {
  assert.deepEqual(js(D.lerVezes('1200x10')), { valor: 1200, vezes: 10 });
  assert.deepEqual(js(D.lerVezes('1.200,50×3')), { valor: 1200.5, vezes: 3 });
  assert.equal(D.lerVezes('1200x1'), null);
  assert.equal(D.lerVezes('1200x49'), null);
  assert.equal(D.lerVezes('36*4'), null);
  assert.equal(D.lerVezes('abc'), null);
});

test('3.1.0 descrição de parcela: monta e desmonta', () => {
  assert.equal(D.montarDescParcela('geladeira', 3, 10), 'geladeira (3/10)');
  assert.equal(D.montarDescParcela('', 3, 10), 'Parcela 3/10');
  assert.deepEqual(js(D.baseParcela('geladeira (3/10)')), { base: 'geladeira', k: 3, n: 10 });
  assert.deepEqual(js(D.baseParcela('Parcela 3/10')), { base: '', k: 3, n: 10 });
  assert.deepEqual(js(D.baseParcela('mercado')), { base: 'mercado', k: null, n: null });
  assert.equal(D.ehIdParcela('pabcdefghij-03'), true);
  assert.equal(D.ehIdParcela('l123-03'), false);
});

test('3.1.0 planoParcelas: total com sobra na primeira, virada de ano e dia limitado ao mês', () => {
  const t = js(D.planoParcelas({ valor: 1200.55, n: 10, modo: 'total', ano: 2026, mes: 12, dia: 31, descricao: 'geladeira' }));
  assert.equal(t.length, 10);
  assert.equal(r2(t.reduce((a, x) => a + x.valor, 0)), 1200.55);
  assert.equal(t[0].valor, 120.1);
  assert.equal(t[1].valor, 120.05);
  assert.deepEqual([t[0].ano, t[0].mes, t[0].dia], [2026, 12, 31]);
  assert.deepEqual([t[2].ano, t[2].mes, t[2].dia], [2027, 2, 28]);
  assert.equal(t[9].descricao, 'geladeira (10/10)');
  const c = js(D.planoParcelas({ valor: 100, n: 3, modo: 'parcela', ano: 2026, mes: 11, dia: null, descricao: '' }));
  assert.deepEqual(c.map((x) => x.valor), [100, 100, 100]);
  assert.equal(c[0].dia, null);
  assert.equal(c[0].descricao, 'Parcela 1/3');
  assert.throws(() => D.planoParcelas({ valor: 100, n: 1, modo: 'total', ano: 2026, mes: 11, dia: 1, descricao: '' }), /entre 2 e 48/);
  assert.throws(() => D.planoParcelas({ valor: 100, n: 49, modo: 'parcela', ano: 2026, mes: 11, dia: 1, descricao: '' }), /entre 2 e 48/);
});

test('3.1.0 diaQuitado: dia em que o lançado cobre o alvo', () => {
  const ls = [{ dia: 12, valor: 400 }, { dia: 5, valor: 600 }];
  assert.equal(D.diaQuitado(ls, 100000), 12);
  assert.equal(D.diaQuitado(ls, 60000), 5);
  assert.equal(D.diaQuitado(ls, 120000), null);
  assert.equal(D.diaQuitado([{ dia: null, valor: 100 }], 10000), null);
});

test('3.1.0 decodificarTexto: UTF-8, windows-1252 pelo cabeçalho OFX e reserva para bytes inválidos', () => {
  const utf8 = new TextEncoder().encode('MEMO café ção');
  assert.equal(D.decodificarTexto(utf8), 'MEMO café ção');
  const win = Uint8Array.from([...Buffer.from('OFXHEADER:100\nENCODING:USASCII\nCHARSET:1252\n<MEMO>caf', 'latin1'), 0xe9]);
  assert.equal(D.decodificarTexto(win), 'OFXHEADER:100\nENCODING:USASCII\nCHARSET:1252\n<MEMO>café');
  const ruim = Uint8Array.from([...Buffer.from('a;b\nCaf', 'latin1'), 0xe9]);
  assert.equal(D.decodificarTexto(ruim), 'a;b\nCafé', 'UTF-8 inválido cai no windows-1252');
});

test('3.1.0 adivinharColunasCSV: cabeçalho, data, valor e descrição, com e sem nomes', () => {
  const comCab = [['Data', 'Histórico', 'Valor', 'Saldo'], ['12/11/2026', 'Mercado Central', '-45,90', '1.200,00'], ['13/11/2026', 'Salário', '5.000,00', '6.200,00']];
  assert.deepEqual(js(D.adivinharColunasCSV(comCab)), { cabecalho: true, data: 0, descricao: 1, valor: 2 });
  const semCab = [['2026-11-12', '12,50', 'Padaria do Zé'], ['2026-11-13', '-8,00', 'Farmácia Boa Saúde']];
  assert.deepEqual(js(D.adivinharColunasCSV(semCab)), { cabecalho: false, data: 0, descricao: 2, valor: 1 });
  assert.deepEqual(js(D.adivinharColunasCSV([['a', 'b'], ['c', 'd']])), { cabecalho: false, data: -1, descricao: 0, valor: -1 });
  assert.deepEqual(js(D.adivinharColunasCSV([])), { cabecalho: false, data: -1, descricao: -1, valor: -1 });
});

test('3.1.0 extratoDeCSV, inverterSinal e valorDoExtrato: sinais e valores sem sentido', () => {
  const linhas = [['Data', 'Descrição', 'Valor'], ['12/11/2026', ' Mercado   Central ', '-45,90'], ['13/11/2026', 'Estorno', '0,00'], ['31/02/2026', 'Data ruim', '10,00'], ['14/11/2026', 'Sem valor', 'abc']];
  const mapa = { cabecalho: true, data: 0, descricao: 1, valor: 2 };
  const l = js(D.extratoDeCSV(linhas, mapa));
  assert.equal(l.length, 4);
  assert.deepEqual(l[0], { fitid: null, data: dataNov(12), valor: -45.9, descricao: 'Mercado Central' });
  assert.equal(l[1].valor, null, 'valor zero vira null');
  assert.equal(l[2].data, null, 'data inexistente vira null');
  assert.equal(l[3].valor, null);
  assert.deepEqual(js(D.inverterSinal([{ valor: 10 }, { valor: -3.5 }, { valor: null }])), [{ valor: -10 }, { valor: 3.5 }, { valor: null }]);
  assert.equal(D.valorDoExtrato(-50, false), 50, 'débito em gasto vira gasto positivo');
  assert.equal(D.valorDoExtrato(20, false), -20, 'crédito em gasto é estorno');
  assert.equal(D.valorDoExtrato(100, true), 100);
  assert.equal(D.valorDoExtrato(-100, true), -100, 'débito em renda é estorno da renda');
  assert.equal(Object.is(D.valorDoExtrato(0, false), 0), true, 'sem zero negativo');
});

test('3.1.0 sugerirCategoria: o histórico normalizado é refeito quando o array cresce', () => {
  const h = [{ descricao: 'Padaria Pão Quente', categoriaId: 'mercado' }];
  assert.equal(D.sugerirCategoria('padaria  pao quente!', h), 'mercado');
  h.push({ descricao: 'Padaria Pão Quente', categoriaId: 'lazer' }, { descricao: 'padaria pao quente', categoriaId: 'lazer' });
  assert.equal(D.sugerirCategoria('Padaria Pão Quente', h), 'lazer');
});

// ---- Cartão de crédito e diagnóstico (funções puras da seção de domínio) ----

const CARTAO_AZUL = { id: 'kab12cd34ef', nome: 'Cartão Azul', fechamento: 5, vencimento: 15, limite: 1000, ativo: true };
const CID_A = 'kab12cd34ef';
const CID_B = 'kzz99yy88xx';
/** Lançamento de cartão de exemplo: id = id do cartão + "_" + sufixo. */
const lc = (cartao, n, mes, dia, valor, categoriaId = 'mercado') => ({ id: `${cartao}_l00000000${n}`, mes, dia, categoriaId, descricao: 'Compra fictícia', valor });

test('cartão mesMais: soma meses e cruza a virada do ano', () => {
  assert.deepEqual(js(D.mesMais(2026, 12, 1)), { ano: 2027, mes: 1 });
  assert.deepEqual(js(D.mesMais(2027, 1, -1)), { ano: 2026, mes: 12 });
  assert.deepEqual(js(D.mesMais(2026, 11, 0)), { ano: 2026, mes: 11 });
});

test('cartão mesDaFatura: fechamento 5 e vencimento 15 paga no próprio mês do fechamento', () => {
  const c = { fechamento: 5, vencimento: 15 };
  assert.deepEqual(js(D.mesDaFatura(c, 2026, 11, 3)), { ano: 2026, mes: 11 });
  assert.deepEqual(js(D.mesDaFatura(c, 2026, 11, 6)), { ano: 2026, mes: 12 });
  assert.deepEqual(js(D.mesDaFatura(c, 2026, 12, 31)), { ano: 2027, mes: 1 });
});

test('cartão mesDaFatura: fechamento 25 e vencimento 5 paga no mês seguinte ao fechamento', () => {
  const c = { fechamento: 25, vencimento: 5 };
  assert.deepEqual(js(D.mesDaFatura(c, 2026, 11, 20)), { ano: 2026, mes: 12 });
  assert.deepEqual(js(D.mesDaFatura(c, 2026, 11, 26)), { ano: 2027, mes: 1 });
});

test('cartão mesDaFatura: vencimento igual ao fechamento vai para o mês seguinte', () => {
  const c = { fechamento: 10, vencimento: 10 };
  assert.deepEqual(js(D.mesDaFatura(c, 2026, 11, 10)), { ano: 2026, mes: 12 });
  assert.deepEqual(js(D.mesDaFatura(c, 2026, 11, 11)), { ano: 2027, mes: 1 });
});

test('cartão mesDaFatura: fechamento 30 em fevereiro usa o fechamento como está', () => {
  const c = { fechamento: 30, vencimento: 10 };
  assert.deepEqual(js(D.mesDaFatura(c, 2027, 2, 28)), { ano: 2027, mes: 3 }, 'dia 28 fecha em fevereiro e vence em março');
});

test('cartão diaDoVencimento: vencimento 31 é limitado ao último dia do mês', () => {
  const c = { vencimento: 31 };
  assert.equal(D.diaDoVencimento(c, 2027, 2), 28);
  assert.equal(D.diaDoVencimento(c, 2028, 2), 29);
  assert.equal(D.diaDoVencimento(c, 2026, 11), 30);
});

test('cartão idNoCartao e cartaoDoId: ida e volta; ids comuns dão null', () => {
  const id = D.idNoCartao(CID_A, 'p1234567890-01');
  assert.equal(id, 'kab12cd34ef_p1234567890-01');
  assert.equal(D.cartaoDoId(id), CID_A);
  assert.equal(D.cartaoDoId(D.idNoCartao(CID_B, 'l0000000001')), CID_B);
  for (const comum of ['l0000000001', 'r0000000001', 'i0000000001', 'p1234567890-01', '']) {
    assert.equal(D.cartaoDoId(comum), null, comum);
  }
});

test('cartão novoIdCartao: "k" + 10 caracteres de [a-z0-9], sempre', () => {
  for (let i = 0; i < 200; i++) assert.match(D.novoIdCartao(), /^k[a-z0-9]{10}$/);
});

test('cartão ehIdParcela: aceita o prefixo do cartão e mantém os casos antigos', () => {
  assert.equal(D.ehIdParcela('kab12cd34ef_p1234567890-03'), true);
  assert.equal(D.ehIdParcela('p1234567890-03'), true);
  assert.equal(D.ehIdParcela('p1234567890'), false);
  assert.equal(D.ehIdParcela('kab12cd34ef_l0000000001'), false);
  assert.equal(D.ehIdParcela('xab12cd34ef_p1234567890-03'), false);
  assert.equal(D.ehIdParcela('p123-03'), false);
});

/** Dados com dois cartões: A tem 0,10 e 0,20 em nov/2026 e 50 em dez/2026; B tem 70 em nov/2026. `extra` entra no ano de 2026. */
const dadosCartao = (extra = []) => ({
  anos: { 2026: { lancamentos: [lc(CID_A, 1, 11, 3, 0.1), lc(CID_A, 2, 11, 5, 0.2), lc(CID_A, 3, 12, 2, 50), lc(CID_B, 4, 11, 4, 70), ...extra], orcamento: {} } },
});

test('cartão lancamentosDoCartao: só os do cartão, de todos os anos, em ordem', () => {
  const dados = dadosCartao([lc(CID_A, 9, 3, 1, 5)]);
  dados.anos[2027] = { lancamentos: [lc(CID_A, 7, 1, 2, 9)], orcamento: {} };
  const itens = D.lancamentosDoCartao(dados, CID_A).map((l) => [l.ano, l.mes, l.dia]);
  assert.deepEqual(js(itens), [[2026, 3, 1], [2026, 11, 3], [2026, 11, 5], [2026, 12, 2], [2027, 1, 2]]);
});

test('cartão faturaDoCartao: total exato em centavos (0,10 + 0,20 = 30) e estorno diminui', () => {
  const f = js(D.faturaDoCartao(dadosCartao(), CID_A, 2026, 11));
  assert.equal(f.totalCent, 30);
  assert.deepEqual(f.itens.map((l) => l.id), [`${CID_A}_l000000001`, `${CID_A}_l000000002`]);
  const comEstorno = js(D.faturaDoCartao(dadosCartao([lc(CID_A, 5, 11, 8, -0.2)]), CID_A, 2026, 11));
  assert.equal(comEstorno.totalCent, 10);
  assert.equal(comEstorno.itens.length, 3);
});

test('cartão faturaDoCartao: não mistura outro cartão; mês sem lançamento dá zero', () => {
  assert.equal(D.faturaDoCartao(dadosCartao(), CID_B, 2026, 11).totalCent, 7000);
  assert.equal(D.faturaDoCartao(dadosCartao(), CID_A, 2026, 12).totalCent, 5000);
  assert.deepEqual(js(D.faturaDoCartao(dadosCartao(), CID_A, 2027, 1)), { itens: [], totalCent: 0 });
});

test('cartão limiteUsado: sem limite dá disponível null; limite com aberto desconta; mês anterior não conta', () => {
  const dados = { anos: { 2026: { lancamentos: [lc(CID_A, 1, 11, 3, 300), lc(CID_A, 2, 12, 2, 100), lc(CID_A, 3, 10, 20, 50)], orcamento: {} } } };
  const nov = { ano: 2026, mes: 11 };
  assert.deepEqual(js(D.limiteUsado(dados, { id: CID_A, limite: null }, nov)), { usadoCent: 40000, disponivelCent: null });
  assert.equal(D.limiteUsado(dados, { id: CID_A, limite: 1000 }, nov).disponivelCent, 60000);
  assert.equal(D.limiteUsado(dados, { id: CID_A, limite: 1000 }, nov).usadoCent, 40000);
  assert.equal(D.limiteUsado(dados, { id: CID_A, limite: 1000 }, { ano: 2026, mes: 12 }).usadoCent, 10000);
});

test('cartão limiteUsado: estourado dá disponível negativo', () => {
  const dados = { anos: { 2026: { lancamentos: [lc(CID_A, 1, 11, 3, 1200)], orcamento: {} } } };
  assert.equal(D.limiteUsado(dados, CARTAO_AZUL, { ano: 2026, mes: 11 }).disponivelCent, -20000);
});

/** Conta de um mês com os lançamentos [id, categoria, valor]; sem depender do id, que o cálculo não lê. */
function mesComIds(lanc) {
  const bloco = { lancamentos: lanc.map(([id, categoriaId, valor]) => ({ id, mes: 11, dia: 1, categoriaId, descricao: '', valor })), orcamento: {} };
  for (const [cid, v] of Object.entries(PLANOS)) bloco.orcamento[cid] = { 11: v };
  return D.contasDoMes({ cats: CATS, idx: D.indexarAno(bloco), ano: 2026, mes: 11, hoje: HOJE, gid: 'guardar', encerrada: () => false });
}

test('cartão regressão R-010: id de cartão não muda a conta; parcelas do cartão somam o total sem dupla contagem', () => {
  const parcelas = js(D.dividirParcelas(10000, 3));
  assert.deepEqual(parcelas, [3334, 3333, 3333]);
  assert.equal(parcelas.reduce((s, c) => s + c, 0), 10000);
  const sem = mesComIds([['l0', 'mercado', 400], ['l1', 'salario', 7900]]);
  const comCartao = mesComIds([[`${CID_A}_l0`, 'mercado', 400], [`${CID_A}_l1`, 'salario', 7900]]);
  assert.deepEqual(js(comCartao), js(sem));
  const pars = parcelas.map((c, i) => [`${CID_A}_p1234567890-0${i + 1}`, 'lazer', c / 100]);
  const comParcelas = mesComIds([['l0', 'mercado', 400], ['l1', 'salario', 7900], ...pars]);
  assert.equal(delta(sem, comParcelas, 'jaSaiu'), 100);
  assert.equal(delta(sem, comParcelas), 0);
});

test('cartão sinaisDaPlanilha: contagens, descrição só de espaço conta como vazia, só meses passados', () => {
  const dados = {
    categorias: CATS, recorrencias: [{ id: 'r1' }, { id: 'r2' }], cartoes: [CARTAO_AZUL],
    anos: {
      2025: { lancamentos: [{ id: 'l1', mes: 12, dia: 1, categoriaId: 'mercado', descricao: 'Feira', valor: 10 }], orcamento: { mercado: { 12: 500 } } },
      2026: {
        lancamentos: [
          { id: 'l2', mes: 9, dia: 1, categoriaId: 'mercado', descricao: '   ', valor: 5 },
          { id: 'l3', mes: 10, dia: 2, categoriaId: 'lazer', descricao: '', valor: 7 },
          { id: 'l4', mes: 11, dia: 3, categoriaId: 'lazer', descricao: 'Cinema', valor: 8 },
        ],
        orcamento: { mercado: { 9: 0, 10: 300 }, lazer: { 11: 100 } },
      },
    },
  };
  const chamadas = [];
  const pend = (a, m) => { chamadas.push([a, m]); return (a === 2025 && m === 12) ? 2 : (a === 2026 && m === 10) ? 1 : 0; };
  const r = js(D.sinaisDaPlanilha(dados, { ano: 2026, mes: 11 }, pend));
  assert.deepEqual(r, {
    lancamentos: 4, semDescricao: 2, categorias: 9, recorrencias: 2, cartoes: 1, mesesComPlano: 3,
    mesesPassadosComPendencia: [{ ano: 2025, mes: 12, qtd: 2 }, { ano: 2026, mes: 10, qtd: 1 }],
  });
  assert.equal(chamadas.length, 22, 'todos os meses de 2025 e os meses de 2026 antes de novembro');
  assert.ok(Object.values(r).every((v) => typeof v === 'number' || Array.isArray(v)), 'só números e listas de números');
});

test('cartão sinaisDaPlanilha: sem ano anterior, pendenciasDoMes só para meses de 2026 antes de ref', () => {
  const dados = { anos: { 2026: { lancamentos: [], orcamento: {} } } };
  const chamadas = [];
  const r = D.sinaisDaPlanilha(dados, { ano: 2026, mes: 11 }, (a, m) => { chamadas.push([a, m]); return 0; });
  assert.equal(chamadas.length, 10);
  assert.ok(chamadas.every(([a]) => a === 2026));
  assert.equal(r.recorrencias, 0);
  assert.equal(r.cartoes, 0);
  assert.deepEqual(js(r.mesesPassadosComPendencia), []);
});
