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
;({ paraNumero, paraNumeros, pareceVezes, indexarAno, contasDoMes, mediaRealizada, chaveMes, faseDe, moedaRedonda })`);

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
