/**
 * Teste de ponta a ponta: o app de verdade (src/*.html) num Chrome sem janela,
 * conversando com o servidor de verdade (src/Codigo.gs) sobre a planilha falsa,
 * que começa no formato da versão 1.
 *
 * Requer o puppeteer:  npm i -D puppeteer
 * (ou PUPPETEER_MODULE=<caminho do módulo> e CHROME_PATH=<executável do Chrome>)
 *
 *   node testes/e2e.mjs            roda os cenários
 *   node testes/e2e.mjs --prints   também regrava os prints de docs/img/
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { criarServidor, abasDoBackup } from './gas-mock.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'testes', 'saida');
const PRINTS = process.argv.includes('--prints') ? path.join(RAIZ, 'docs', 'img') : null;
const AGORA = Date.parse('2026-11-18T12:00:00');
const exemplo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'exemplos', 'dados-exemplo.json'), 'utf8'));

const mod = process.env.PUPPETEER_MODULE ? await import(pathToFileURL(process.env.PUPPETEER_MODULE).href) : await import('puppeteer');
const puppeteer = mod.puppeteer || mod.default || mod;

const arred = (v) => Math.round(v * 100) / 100;
const moeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(arred(v)).replace('-', '−');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- ambiente: servidor + página ---------- */
function criarAmbiente(abas) {
  const servidor = criarServidor(abas);
  const amb = { servidor, falhar: false };
  amb.ponte = async (fn, args) => {
    await sleep(25);
    if (amb.falhar) throw new Error('Falha de rede simulada');
    if (typeof servidor.ctx[fn] !== 'function') throw new Error('função inexistente: ' + fn);
    return servidor.ctx[fn](...args);
  };
  amb.linhas = () => servidor.planilha.ler('lancamentos');
  return amb;
}
function montarPagina(amb, nome) {
  const html = amb.servidor.ctx.doGet().getContent();
  const ponte = `<script>
window.google = { script: { run: (function fazer(ok, erro) { return new Proxy({}, { get(_, fn) {
  if (fn === 'withSuccessHandler') return (h) => fazer(h, erro);
  if (fn === 'withFailureHandler') return (h) => fazer(ok, h);
  return (...args) => { window.__servidor(String(fn), args).then((r) => ok && ok(r), (e) => erro && erro({ message: String((e && e.message) || e) })); };
} }); })(null, null) } };
</script>`;
  fs.mkdirSync(SAIDA, { recursive: true });
  const arq = path.join(SAIDA, nome + '.html');
  fs.writeFileSync(arq, html.replace('<head>', '<head>' + ponte));
  return pathToFileURL(arq).href;
}

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || undefined, headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--font-render-hinting=none'],
});
const CEL = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PC = { width: 1440, height: 900, deviceScaleFactor: 1 };
const paginas = [];
async function abrir(amb, vp, url, { tema, contexto } = {}) {
  const ctx = contexto || (await browser.createBrowserContext());
  const p = await ctx.newPage();
  p.erros = [];
  p.on('pageerror', (e) => p.erros.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) p.erros.push('console: ' + m.text()); });
  p.on('dialog', (d) => d.accept());
  await p.evaluateOnNewDocument((agora) => {
    const Real = Date;
    window.Date = class extends Real {
      constructor(...a) { super(...(a.length ? a : [agora])); }
      static now() { return agora; }
    };
  }, AGORA);
  await p.exposeFunction('__servidor', (fn, args) => amb.ponte(fn, args));
  await p.setViewport(vp);
  if (tema) await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: tema }]);
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  paginas.push(p);
  return p;
}
/** Espera a fonte Inter (Google Fonts) chegar, para os prints saírem com a tipografia certa. */
async function fontes(p) {
  await p.waitForFunction(() => document.fonts.check('600 16px Inter'), { timeout: 20000 }).catch(() => console.log('  (aviso: Inter não carregou; print com fonte do sistema)'));
  await p.evaluate(() => document.fonts.ready);
  await sleep(150);
}
const pronto = (p) => p.waitForFunction(() => typeof S !== 'undefined' && S.montado && !S.atualizando && !S.fila.length && !S.enviando, { timeout: 15000 });
const sincronizado = (p) => p.waitForFunction(() => typeof S !== 'undefined' && !S.fila.length && !S.enviando, { timeout: 15000 });
async function esperar(cond, ms = 8000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { if (await cond()) return; await sleep(80); }
  throw new Error('tempo esgotado esperando condição');
}
async function folhaAberta(p) { await p.waitForSelector('.folha.aberta'); await sleep(320); }
async function semFolha(p) { await p.waitForFunction(() => !document.querySelector('.folha')); }
async function irPara(p, tela) { await p.evaluate((t) => irPara(t), tela); await sleep(120); }
async function digitarTeclado(p, numeros) { for (const d of numeros) { await p.tap(`.teclado [data-v="${d}"]`); await sleep(30); } }
/** Foca o campo, seleciona tudo e digita por cima (como uma pessoa faria). */
async function substituir(p, seletor, texto) {
  await p.$eval(seletor, (e) => { e.focus(); e.select(); });
  await p.type(seletor, texto);
}
const kpiDe = (p, rotulo) => p.$$eval('.kpi', (els, r) => {
  const e = els.find((x) => x.querySelector('.rotulo').textContent === r);
  return e ? { valor: e.querySelector('.kpi-valor').textContent, sub: e.querySelector('.sub')?.textContent || '' } : null;
}, rotulo);
const esperarHeroi = (p, valor) => p.waitForFunction((v) => document.querySelector('.numero-heroi')?.textContent === v, {}, valor);

/** Regra da v1: lançado; sem lançamento, o plano. Plano de categoria com lançamento não conta. */
function livreEsperado(d, ano, mes) {
  const b = d.anos[ano];
  const doMes = (cid) => b.lancamentos.filter((l) => l.mes === mes && l.categoriaId === cid);
  const real = (cid) => arred(doMes(cid).reduce((a, l) => a + l.valor, 0));
  const plano = (cid) => (b.orcamento[cid] || {})[mes] || 0;
  let renda = 0; let gastos = 0;
  for (const c of d.categorias) {
    const teve = doMes(c.id).length > 0; const r = real(c.id); const p = plano(c.id);
    if (c.grupo === 'renda') renda += teve ? Math.max(p, r) : p;
    else gastos += teve ? r : p;
  }
  return arred(renda - gastos);
}

const resultados = [];
async function caso(nome, fn) {
  const t0 = Date.now();
  try { await fn(); resultados.push(['✔', nome, Date.now() - t0]); }
  catch (e) { resultados.push(['✖', nome, Date.now() - t0, e.message.split('\n')[0]]); }
}

/* ---------- prints (dados fictícios, estado limpo) ---------- */
if (PRINTS) {
  fs.mkdirSync(PRINTS, { recursive: true });
  const amb = criarAmbiente(abasDoBackup(exemplo));
  const url = montarPagina(amb, 'prints');
  const cel = await abrir(amb, CEL, url, { tema: 'light' });
  await pronto(cel); await fontes(cel);
  await cel.screenshot({ path: path.join(PRINTS, 'celular-inicio.png') });
  await cel.tap('.inf-mais'); await folhaAberta(cel);
  await digitarTeclado(cel, ['6', '4', '3', '0']);
  await cel.screenshot({ path: path.join(PRINTS, 'celular-lancar.png') });
  await cel.keyboard.press('Escape'); await semFolha(cel);
  await irPara(cel, 'extrato'); await cel.screenshot({ path: path.join(PRINTS, 'celular-extrato.png') });
  await irPara(cel, 'mes'); await cel.screenshot({ path: path.join(PRINTS, 'celular-mes.png') });
  const pc = await abrir(amb, PC, url, { tema: 'light' });
  await pronto(pc); await fontes(pc);
  await pc.screenshot({ path: path.join(PRINTS, 'computador-inicio.png') });
  await irPara(pc, 'planilha'); await pc.screenshot({ path: path.join(PRINTS, 'computador-planilha.png') });
  const escuro = await abrir(amb, PC, url, { tema: 'dark' });
  await pronto(escuro); await fontes(escuro);
  await escuro.screenshot({ path: path.join(PRINTS, 'computador-escuro.png') });
  const novo = criarAmbiente({});
  const bv = await abrir(novo, CEL, montarPagina(novo, 'prints-bv'), { tema: 'light' });
  await bv.waitForSelector('#boasvindas:not([hidden]) .bv'); await fontes(bv);
  await bv.click('[data-b="avancar"]'); await bv.mouse.move(0, 0); await sleep(150);
  await bv.screenshot({ path: path.join(PRINTS, 'primeiro-acesso.png') });
  const icone = await browser.newPage();
  await icone.setViewport({ width: 192, height: 192 });
  await icone.setContent('<body style="margin:0;background:transparent"><div style="width:192px;height:192px;border-radius:44px;background:#4338CA;display:flex;align-items:flex-end;justify-content:center;gap:16px;padding-bottom:44px;box-sizing:border-box"><i style="width:26px;height:50px;border-radius:8px;background:#A5B4FC"></i><i style="width:26px;height:88px;border-radius:8px;background:#fff"></i><i style="width:26px;height:34px;border-radius:8px;background:#A5B4FC"></i></div></body>');
  await icone.screenshot({ path: path.join(PRINTS, 'icone-192.png'), omitBackground: true });
  await icone.close();
  console.log('prints gravados em docs/img/');
}

/* ---------- cenários ---------- */
const amb = criarAmbiente(abasDoBackup(exemplo));
const url = montarPagina(amb, 'app');
let cel; let pc;

await caso('celular: abre a planilha no formato da v1 e mostra o “disponível para gastar” certo', async () => {
  cel = await abrir(amb, CEL, url);
  await pronto(cel);
  const heroi = await cel.$eval('.numero-heroi', (e) => e.textContent);
  assert.equal(heroi, moeda(livreEsperado(exemplo, 2026, 11)));
  const nomeTopo = await cel.$eval('.navmes-nome', (e) => e.textContent);
  assert.equal(nomeTopo, 'Casa (exemplo)');
});

await caso('celular: lançar pelo teclado numérico grava na planilha', async () => {
  await cel.tap('.inf-mais'); await folhaAberta(cel);
  await digitarTeclado(cel, ['6', '4', '3', '0']);
  assert.equal(await cel.$eval('#nv-valor', (e) => e.textContent), moeda(64.3));
  await cel.tap('#nv-salvar'); await semFolha(cel); await sincronizado(cel);
  const linha = amb.linhas().find((l) => l[6] === 64.3);
  assert.ok(linha, 'lançamento de 64,30 na planilha');
  assert.deepEqual([linha[1], linha[2], linha[3]], [2026, 11, 18], 'data de hoje');
});

await caso('celular: editar pelo extrato altera a linha na planilha', async () => {
  await irPara(cel, 'extrato');
  const id = await cel.$eval('#extrato-lista .linha-lanc', (e) => e.dataset.id);
  await cel.tap(`#extrato-lista .linha-lanc[data-id="${id}"]`); await folhaAberta(cel);
  await substituir(cel, '#ed-valor', '70,10');
  await cel.tap('.folha [data-f="salvar"]'); await semFolha(cel); await sincronizado(cel);
  assert.equal(amb.linhas().find((l) => l[0] === id)[6], 70.1);
});

await caso('celular: apagar e desfazer devolve o lançamento', async () => {
  const id = await cel.$eval('#extrato-lista .linha-lanc', (e) => e.dataset.id);
  await cel.tap(`#extrato-lista .linha-lanc[data-id="${id}"]`); await folhaAberta(cel);
  await cel.tap('.folha [data-f="apagar"]'); await semFolha(cel); await sincronizado(cel);
  assert.ok(!amb.linhas().some((l) => l[0] === id), 'apagado na planilha');
  await cel.tap('.aviso-acao'); await sincronizado(cel);
  assert.ok(amb.linhas().some((l) => l[0] === id), 'voltou depois do Desfazer');
});

await caso('dois aparelhos: o que um grava, o outro não apaga', async () => {
  pc = await abrir(amb, PC, url);
  await pronto(pc);
  await irPara(cel, 'inicio');
  await cel.tap('.inf-mais'); await folhaAberta(cel);
  await digitarTeclado(cel, ['1', '1', '1', '1']);
  await cel.tap('#nv-salvar'); await semFolha(cel); await sincronizado(cel);
  // o computador ainda está com a revisão antiga
  await pc.click('[data-foco="novo-topo"]'); await folhaAberta(pc);
  await pc.type('#nv-texto', '22,22 mercado teste no pc');
  assert.match(await pc.$eval('#nv-entendi', (e) => e.textContent), /R\$\s22,22 em Mercado/);
  await pc.keyboard.press('Enter'); await semFolha(pc); await sincronizado(pc);
  const valores = amb.linhas().map((l) => l[6]);
  assert.ok(valores.includes(11.11) && valores.includes(22.22), 'os dois lançamentos ficaram na planilha');
  const pcViu = await pc.evaluate(() => S.dados.anos['2026'].lancamentos.some((l) => l.valor === 11.11));
  assert.ok(pcViu, 'o computador recebeu o lançamento do celular');
  const desc = amb.linhas().find((l) => l[6] === 22.22)[5];
  assert.equal(desc, 'teste no pc');
});

await caso('computador: lançamento rápido da barra do topo salva direto', async () => {
  await irPara(pc, 'inicio');
  await pc.keyboard.press('n');
  assert.equal(await pc.evaluate(() => document.activeElement && document.activeElement.id), 'quick', 'N foca o campo rápido');
  await pc.type('#quick', '12,34 mercado padaria');
  await pc.keyboard.press('Enter');
  await sincronizado(pc);
  await sleep(200);
  const linha = amb.linhas().find((l) => l[6] === 12.34);
  assert.ok(linha, 'o lançamento rápido foi gravado');
  assert.equal(linha[4], 'mercado');
  assert.equal(linha[5], 'padaria');
  assert.equal(await pc.$eval('#quick', (e) => e.value), '', 'o campo limpa depois de salvar');
});

await caso('topo: anel de composição e micrográficos nos KPIs', async () => {
  const p = await abrir(amb, PC, montarPagina(amb, 'topo-moderno'));
  await pronto(p);
  assert.ok(await p.$('.heroi .anel'), 'anel de composição');
  const legenda = await p.$eval('.heroi-legenda', (e) => e.textContent);
  assert.ok(legenda.includes('Já saiu') && legenda.includes('Planos sem lançamento') && legenda.includes('Disponível'), 'legenda da composição');
  assert.ok(await p.$('.kpi .spark'), 'sparkline da renda');
  assert.ok(await p.$('.kpi .mini-barras'), 'barras diárias');
  assert.ok(await p.$('.kpi .kpi-lista'), 'lista de planos');
  assert.ok(await p.$('.kpi .kpi-meta'), 'progresso da meta');
  await p.close();
});

await caso('composição: celular e 1440 usam a barra; tela larga mantém o anel', async () => {
  await irPara(cel, 'inicio');
  assert.equal(await cel.$eval('.heroi .anel', (e) => getComputedStyle(e).display), 'none', 'no celular o anel some');
  assert.equal(await cel.$eval('.heroi-barra', (e) => getComputedStyle(e).display), 'flex', 'no celular a barra aparece');
  await irPara(pc, 'inicio');
  assert.equal(await pc.$eval('.heroi .anel', (e) => getComputedStyle(e).display), 'none', 'em 1440 o anel dá lugar à barra');
  assert.equal(await pc.$eval('.heroi-barra', (e) => getComputedStyle(e).display), 'flex', 'em 1440 a barra usa a largura');
  const largo = await abrir(amb, { width: 1728, height: 1000 }, montarPagina(amb, 'largo'));
  await pronto(largo);
  assert.notEqual(await largo.$eval('.heroi .anel', (e) => getComputedStyle(e).display), 'none', 'em tela larga o anel fica');
  assert.equal(await largo.$eval('.heroi-barra', (e) => getComputedStyle(e).display), 'none', 'em tela larga a barra some');
  await largo.close();
});

await caso('sem conexão: guarda no aparelho, sobrevive a recarregar e grava depois', async () => {
  amb.falhar = true;
  await cel.tap('.inf-mais'); await folhaAberta(cel);
  await digitarTeclado(cel, ['3', '3', '3', '3']);
  await cel.tap('#nv-salvar'); await semFolha(cel);
  await cel.waitForFunction(() => document.querySelector('#sinc-topo.off'));
  assert.match(await cel.$eval('#sinc-topo', (e) => e.textContent), /1 pendente/);
  await cel.reload({ waitUntil: 'domcontentloaded' });
  await cel.waitForFunction(() => typeof S !== 'undefined' && S.montado);
  const naTela = await cel.evaluate(() => S.dados.anos['2026'].lancamentos.some((l) => l.valor === 33.33) && S.fila.length === 1);
  assert.ok(naTela, 'depois de recarregar, o lançamento continua na tela e na fila');
  amb.falhar = false;
  await esperar(() => amb.linhas().some((l) => l[6] === 33.33), 15000);
  await sincronizado(cel);
});

await caso('cache: não mistura outro app e lançar em renda aumenta o disponível', async () => {
  const dados = {
    nome: 'Cache', categorias: [
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 1 },
      { id: 'outras-rendas', nome: 'Outras Rendas', grupo: 'renda', ordem: 2 },
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 3 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'r1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
      { id: 'g1', mes: 11, dia: 2, categoriaId: 'mercado', descricao: '', valor: 100 },
    ], orcamento: { salario: { 11: 1000 }, mercado: { 11: 100 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, CEL, montarPagina(a, 'cache-antigo'));
  await pronto(p);
  const velho = {
    planilha: { id: 'outro-app', nome: 'Outro', url: '' },
    revisao: 1,
    categorias: [{ id: 'renda-extra', nome: 'Renda Extra', grupo: 'renda', ordem: 1 }],
    anos: { 2026: { lancamentos: [{ id: 'x1', mes: 11, dia: 1, categoriaId: 'renda-extra', descricao: '', valor: 9999 }], orcamento: {} } },
  };
  const filaVelha = { planilha: 'outro-app', ops: [{ t: 'lanc', l: { id: 'x2', ano: 2026, mes: 11, dia: 1, categoriaId: 'renda-extra', descricao: '', valor: 50 } }] };
  await p.evaluate(({ cache, fila }) => {
    localStorage.clear();
    localStorage.setItem('bf:cache', JSON.stringify(cache));
    localStorage.setItem('bf:fila', JSON.stringify(fila));
  }, { cache: velho, fila: filaVelha });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await pronto(p);
  const estado = await p.evaluate(() => ({
    cats: S.dados.categorias.map((c) => c.id),
    fila: S.fila.length,
    hero: document.querySelector('.numero-heroi').textContent,
  }));
  assert.ok(estado.cats.includes('outras-rendas') && !estado.cats.includes('renda-extra'), 'categorias do servidor, não do cache antigo');
  assert.equal(estado.fila, 0, 'fila de outro app é ignorada');
  assert.equal(estado.hero, moeda(900), 'disponível inicial');
  await p.tap('.inf-mais'); await folhaAberta(p);
  await p.tap('[data-f="tipo"][data-v="renda"]'); await sleep(80);
  await p.tap('[data-f="cat"][data-v="outras-rendas"]'); await sleep(80);
  await digitarTeclado(p, ['1', '0', '0', '0']);
  await p.tap('#nv-salvar'); await semFolha(p); await sincronizado(p);
  await p.waitForFunction((v) => document.querySelector('.numero-heroi')?.textContent === v, {}, moeda(910));
  const linha = a.servidor.planilha.ler('lancamentos').find((l) => l[4] === 'outras-rendas' && l[6] === 10);
  assert.ok(linha, 'lançamento gravado em Outras Rendas');
  await p.close();

  const pc2 = await abrir(a, PC, montarPagina(a, 'cache-quick'));
  await pronto(pc2);
  await pc2.click('#quick');
  await pc2.type('#quick', '200 outras rendas');
  await pc2.keyboard.press('Enter');
  await sincronizado(pc2);
  await pc2.waitForFunction((v) => document.querySelector('.numero-heroi')?.textContent === v, {}, moeda(1110));
  const rapido = a.servidor.planilha.ler('lancamentos').find((l) => l[4] === 'outras-rendas' && l[6] === 200);
  assert.ok(rapido, 'lançamento rápido também encontra Outras Rendas');
  await pc2.close();
});

await caso('renda com plano: lançar abaixo do plano não derruba o disponível', async () => {
  const dados = {
    nome: 'Renda com plano', categorias: [
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 2 },
      { id: 'outras-rendas', nome: 'Outras Rendas', grupo: 'renda', ordem: 3 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'r1', mes: 11, dia: 5, categoriaId: 'salario', descricao: '', valor: 10000 },
    ], orcamento: { salario: { 11: 10000 }, mercado: { 11: 100 }, 'outras-rendas': { 11: 400 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'renda-plano'));
  await pronto(p);
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(10300), 'antes: salário 10.000 + plano de Outras Rendas 400 − mercado 100');
  await p.evaluate(() => {
    registrar({ t: 'lanc', l: { id: novoId(), ano: S.ano, mes: S.mes, dia: hoje().dia, categoriaId: 'outras-rendas', descricao: 'renda extra', valor: 200 } });
  });
  await sincronizado(p);
  await p.waitForFunction((v) => document.querySelector('.numero-heroi')?.textContent === v, {}, moeda(10300));
  const linha = a.servidor.planilha.ler('lancamentos').find((l) => l[4] === 'outras-rendas' && l[6] === 200);
  assert.ok(linha, 'renda de 200 gravada em Outras Rendas');
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(10300), 'recebeu 200 de um plano de 400: o disponível mantém o plano (não cai)');
  await p.evaluate((v) => registrar({ t: 'lanc', l: { id: novoId(), ano: S.ano, mes: S.mes, dia: hoje().dia, categoriaId: 'outras-rendas', descricao: 'extra', valor: v } }), 300);
  await sincronizado(p);
  await p.waitForFunction((v) => document.querySelector('.numero-heroi')?.textContent === v, {}, moeda(10400));
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(10400), 'recebidos 500 no total (além do plano de 400): o que passou do plano soma');
  await p.close();
});

await caso('computador: planejar digitando 150000 grava 1500 (máscara de centavos)', async () => {
  await irPara(pc, 'mes');
  await pc.click('[data-modo="planejar"]'); await sleep(100);
  await substituir(pc, '#pl-mercado', '150000');
  assert.equal(await pc.$eval('#pl-mercado', (e) => e.value), '1.500,00', 'a máscara formata em centavos');
  const altura = await pc.$eval('#pl-mercado', (e) => e.getBoundingClientRect().height);
  assert.ok(altura <= 50, `o campo do plano tem ${altura}px, não é gigante`);
  await pc.keyboard.press('Tab'); await sleep(250); await sincronizado(pc);
  const orc = amb.servidor.planilha.ler('orcamento').find((l) => l[1] === 'mercado' && l[2] === 11);
  assert.equal(orc[3], 1500);
  const foco = await pc.evaluate(() => document.activeElement && document.activeElement.id);
  assert.equal(foco, 'pl-transporte', 'o foco foi para o campo seguinte');
});

await caso('computador: célula da planilha abre o painel e lança ali mesmo; setas navegam', async () => {
  await irPara(pc, 'planilha');
  await pc.click('td.cel[data-cat="mercado"][data-mes="11"]'); await folhaAberta(pc);
  await pc.type('#fc-valor', '1000');
  assert.equal(await pc.$eval('#fc-valor', (e) => e.value), '10,00', 'a máscara vale também no painel da célula');
  await pc.keyboard.press('Enter'); await sleep(150);
  await pc.keyboard.press('Escape'); await semFolha(pc); await sincronizado(pc);
  assert.ok(amb.linhas().some((l) => l[6] === 10 && l[4] === 'mercado' && l[2] === 11), 'lançado na planilha');
  await pc.focus('td.cel[data-cat="mercado"][data-mes="11"]');
  await pc.keyboard.press('ArrowRight');
  const foco = await pc.evaluate(() => document.activeElement.dataset.mes);
  assert.equal(foco, '12');
});

await caso('disponível: só o lançado e o plano gravado; apagar lançamento ou plano muda o disponível', async () => {
  const dados = {
    nome: 'Sobra', categorias: [
      { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 },
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 2 },
      { id: 'carro', nome: 'Carro', grupo: 'variavel', ordem: 3 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 4 },
    ],
    anos: { 2026: { lancamentos: [], orcamento: { aluguel: { 11: 1000 }, salario: { 11: 10000 } } } },
  };
  let n = 0;
  const lanc = (mes, categoriaId, valor) => dados.anos[2026].lancamentos.push({ id: 's' + ++n, mes, dia: 5, categoriaId, descricao: '', valor });
  // Carro em ago/set/out tem média de 1.155,04, mas nenhum plano em novembro.
  for (const [mes, carro] of [[8, 1950], [9, 1316.13], [10, 199]]) { lanc(mes, 'carro', carro); lanc(mes, 'mercado', 1500); lanc(mes, 'aluguel', 1000); lanc(mes, 'salario', 10000); }
  lanc(11, 'mercado', 500); lanc(11, 'mercado', 300);
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'sobra'));
  await pronto(p);
  const kpi = (rot) => p.$$eval('.kpi', (els, r) => els.find((e) => e.querySelector('.rotulo').textContent === r)?.querySelector('.kpi-valor').textContent, rot);
  // 10.000 de salário previsto − 1.000 de aluguel previsto − 800 lançados no mercado. Carro não entra.
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(8200));
  assert.equal(await kpi('Planos sem lançamento'), moeda(1000));
  assert.equal(await kpi('Já saiu'), moeda(800));
  const ritmo = await p.$eval('section[aria-labelledby="h-ritmo"]', (e) => e.textContent);
  assert.ok(ritmo.includes('Gasto ' + moeda(0)), 'a barra compara só categorias com plano (aluguel: nada lançado)');
  assert.ok(ritmo.includes('Plano ' + moeda(1000)), 'o plano do aluguel aparece na barra');
  const cobertura = await p.$eval('#tela', (e) => e.innerText);
  assert.ok(cobertura.includes('Sem plano: ' + moeda(800) + ' em 1 categoria'), 'o mercado sem plano aparece à parte');
  await irPara(p, 'planilha');
  assert.equal(await p.$eval('td.cel[data-cat="carro"][data-mes="11"]', (e) => e.textContent), '–', 'sem plano, sem média inventada');
  assert.equal(await p.$eval('td.cel[data-cat="mercado"][data-mes="11"]', (e) => e.textContent), '800,00', 'a célula mostra o lançado');

  await irPara(p, 'extrato');
  await p.click('#extrato-lista .linha-lanc[data-id="s13"]'); await folhaAberta(p);
  await p.click('.folha [data-f="apagar"]'); await semFolha(p); await sincronizado(p);
  await irPara(p, 'inicio');
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(8700), 'apagar 500 do mercado devolve 500 ao disponível');

  await irPara(p, 'mes');
  await p.click('[data-modo="planejar"]'); await sleep(100);
  await substituir(p, '#pl-aluguel', '');
  await p.keyboard.press('Backspace'); await p.keyboard.press('Tab'); await sleep(250); await sincronizado(p);
  assert.ok(!a.servidor.planilha.ler('orcamento').some((l) => l[1] === 'aluguel' && l[2] === 11), 'plano apagado na planilha');
  await p.click('[data-modo="acompanhar"]'); await irPara(p, 'inicio');
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(9700), 'sem o plano, o aluguel previsto sai do disponível');
  assert.equal(await kpi('Planos sem lançamento'), moeda(0), 'sem plano, não há mais 1.000 reservados');
  await p.close();
});

await caso('disponível: plano variável sem lançamento também é reservado no herói', async () => {
  const dados = {
    nome: 'Plano variável', categorias: [
      { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 },
      { id: 'luz', nome: 'Luz', grupo: 'variavel', ordem: 2 },
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 3 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 4 },
    ],
    anos: { 2026: { lancamentos: [{ id: 'p1', mes: 11, dia: 5, categoriaId: 'mercado', descricao: '', valor: 500 }], orcamento: { aluguel: { 11: 1000 }, luz: { 11: 300 }, salario: { 11: 10000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'disponivel-plano-variavel'));
  await pronto(p);
  const heroi = await p.$eval('.numero-heroi', (e) => e.textContent);
  assert.equal(heroi, moeda(8200), '10.000 − 500 lançados − 1.300 ainda nos planos');
  assert.notEqual(heroi, moeda(8500), 'a regra antiga, só com contas fixas a vencer, daria 8.500');
  assert.equal((await kpiDe(p, 'Planos sem lançamento')).valor, moeda(1300), 'aluguel e luz ainda estão reservados');
  await p.close();
});

await caso('de onde vem: mostra planos sem lançamento e o plano usado no ritmo', async () => {
  const dados = {
    nome: 'Detalhe', categorias: [
      { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 },
      { id: 'luz', nome: 'Luz', grupo: 'variavel', ordem: 2 },
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 3 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 4 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'd1', mes: 11, dia: 5, categoriaId: 'salario', descricao: '', valor: 10000 },
      { id: 'd2', mes: 11, dia: 6, categoriaId: 'mercado', descricao: '', valor: 500 },
    ], orcamento: { aluguel: { 11: 1000 }, luz: { 11: 300 }, mercado: { 11: 1000 }, salario: { 11: 10000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'detalhe-reserva'));
  await pronto(p);
  // 10.000 recebidos − 500 gastos = 9.500 na conta; 1.300 sem lançamento; disponível 8.200.
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(8200));
  await p.click('[data-acao="detalhe-reserva"]'); await folhaAberta(p);
  const texto = await p.$eval('.folha .folha-corpo', (e) => e.innerText);
  assert.ok(texto.includes('Ainda na conta'), 'mostra o dinheiro que já entrou');
  assert.ok(texto.includes('Planos sem lançamento'), 'lista os planos sem lançamento');
  assert.ok(texto.includes('Plano restante nas categorias com lançamento'), 'mostra o plano das categorias já iniciadas sem descontá-lo');
  assert.ok(texto.includes('Ajustar planos'), 'oferece ajustar os planos');
  await p.close();
});

await caso('variáveis do mês: resumo, gráfico e atalhos de lançar e ajustar plano', async () => {
  const dados = {
    nome: 'Painel', categorias: [
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 },
      { id: 'lazer', nome: 'Lazer', grupo: 'variavel', ordem: 2 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 3 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'v1', mes: 11, dia: 5, categoriaId: 'mercado', descricao: '', valor: 800 },
      { id: 'v2', mes: 11, dia: 6, categoriaId: 'lazer', descricao: '', valor: 200 },
      { id: 'v3', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
    ], orcamento: { mercado: { 11: 1000 }, lazer: { 11: 300 }, salario: { 11: 5000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'variaveis-painel'));
  await pronto(p);
  const texto = await p.$eval('#tela', (e) => e.innerText);
  assert.ok(texto.includes('Gasto ' + moeda(1000)), 'resumo do gasto variável');
  assert.ok(texto.includes('Plano ' + moeda(1300)), 'resumo do plano variável');
  assert.ok(texto.includes('Ainda previsto ' + moeda(0)), 'resumo do previsto');
  assert.ok(texto.includes('Para onde foi'), 'gráfico de participação');
  assert.ok(await p.$('.grafico-variaveis .gv-barra'), 'barra do gráfico');
  assert.ok(await p.$('[data-foco="cats-novo"]'), 'atalho para lançar');
  await p.click('[data-foco="cats-planejar"]'); await sleep(150);
  assert.ok(await p.$('#pl-mercado'), 'atalho leva ao planejamento');
  assert.equal(await p.$eval('[data-modo="planejar"]', (e) => e.getAttribute('aria-pressed')), 'true');
  await p.close();
});

await caso('avisos: “Ver lançamentos” mostra as contas da categoria', async () => {
  const dados = {
    nome: 'Aviso', categorias: [
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 2 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'm1', mes: 11, dia: 5, categoriaId: 'mercado', descricao: 'Feira', valor: 40 },
      { id: 'm2', mes: 11, dia: 7, categoriaId: 'mercado', descricao: 'Padaria', valor: 33.24 },
      { id: 'r1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
    ], orcamento: { mercado: { 11: 65 }, salario: { 11: 5000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'aviso-contas'));
  await pronto(p);
  await p.waitForSelector('.cats-avisos .aviso-detalhe summary');
  const texto = await p.$eval('.cats-avisos .aviso-item p', (e) => e.textContent);
  assert.match(texto, /Mercado passou/, 'o aviso nomeia a categoria');
  await p.click('.cats-avisos .aviso-detalhe summary');
  await p.waitForSelector('.cats-avisos .aviso-detalhe[open] .aviso-conta');
  const contas = await p.$$eval('.cats-avisos .aviso-conta', (els) => els.map((e) => e.textContent));
  assert.equal(contas.length, 2, 'mostra as duas contas da categoria');
  assert.ok(contas.some((t) => t.includes('Feira')) && contas.some((t) => t.includes('Padaria')), 'descrições das contas');
  await p.click('.cats-avisos .aviso-conta');
  await folhaAberta(p);
  await p.keyboard.press('Escape'); await semFolha(p);
  await p.close();
});

await caso('sugestão de média: aparece, mas só entra no plano quando você usa', async () => {
  const dados = {
    nome: 'Sugestão', categorias: [
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 2 },
    ],
    anos: { 2026: { lancamentos: [], orcamento: {} } },
  };
  const b = dados.anos[2026];
  for (const mes of [8, 9, 10]) {
    b.lancamentos.push({ id: 's' + mes + 'r', mes, dia: 5, categoriaId: 'salario', descricao: '', valor: 10000 });
    b.lancamentos.push({ id: 's' + mes + 'm', mes, dia: 6, categoriaId: 'mercado', descricao: '', valor: 1000 });
  }
  b.lancamentos.push({ id: 'n1', mes: 11, dia: 5, categoriaId: 'salario', descricao: '', valor: 10000 });
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'sugestao-media'));
  await pronto(p);
  // A média de 1.000 não é plano: o disponível continua 10.000.
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(10000));
  assert.equal((await kpiDe(p, 'Planos sem lançamento')).valor, moeda(0));
  await irPara(p, 'mes');
  await p.click('[data-modo="planejar"]'); await sleep(150);
  assert.equal(await p.$eval('#pl-mercado', (e) => e.value), '', 'campo do plano começa vazio');
  assert.equal(await p.$eval('#pl-mercado', (e) => e.placeholder), '0,00', 'a sugestão não fica no placeholder');
  const tela = await p.$eval('#tela', (e) => e.innerText);
  assert.ok(tela.includes('sugestão: ' + moeda(1000)), 'a sugestão aparece como texto');
  await p.click('[data-acao="plano-sugestao"][data-cat="mercado"]');
  await sincronizado(p);
  await sleep(200);
  const plano = a.servidor.planilha.ler('orcamento').find((l) => l[1] === 'mercado' && l[2] === 11);
  assert.ok(plano && plano[3] === 1000, 'a sugestão só vira plano quando você usa');
  await irPara(p, 'inicio');
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(9000), 'agora o plano reserva 1.000');
  assert.equal((await kpiDe(p, 'Planos sem lançamento')).valor, moeda(1000));
  await p.close();
});

await caso('renda parcial: receber não derruba o disponível; o plano de renda segue valendo', async () => {
  const dados = {
    nome: 'Renda parcial', categorias: [
      { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 },
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 2 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 3 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'r1', mes: 11, dia: 5, categoriaId: 'salario', descricao: 'Salário', valor: 5000 },
      { id: 'r2', mes: 11, dia: 6, categoriaId: 'mercado', descricao: '', valor: 500 },
    ], orcamento: { aluguel: { 11: 1000 }, salario: { 11: 10000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'renda-parcial'));
  await pronto(p);
  const renda = await kpiDe(p, 'Renda do mês');
  assert.equal(renda.valor, moeda(10000), 'o KPI mostra a renda planejada');
  assert.match(renda.sub, /5\.000,00 recebid|recebid[ao] R\$\s?5\.000,00 de R\$\s?10\.000,00/, `sub da renda: ${renda.sub}`);
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(8500), 'recebeu 5.000 de um plano de 10.000: o disponível mantém o plano (10.000 − 500 − 1.000)');
  await p.close();
});

await caso('meta de economia: criar Guardar reserva no disponível; confirmar mantém o disponível', async () => {
  const dados = {
    nome: 'Meta', categorias: [
      { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 },
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 2 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 3 },
    ],
    anos: { 2026: { lancamentos: [], orcamento: { aluguel: { 11: 2000 }, mercado: { 11: 1000 }, salario: { 11: 10000 } } } },
  };
  const b = dados.anos[2026];
  for (const mes of [8, 9, 10]) {
    b.lancamentos.push({ id: 'h' + mes + 's', mes, dia: 5, categoriaId: 'salario', descricao: '', valor: 10000 });
    b.lancamentos.push({ id: 'h' + mes + 'm', mes, dia: 6, categoriaId: 'mercado', descricao: '', valor: 5000 });
  }
  b.lancamentos.push(
    { id: 'n1', mes: 11, dia: 5, categoriaId: 'salario', descricao: '', valor: 10000 },
    { id: 'n2', mes: 11, dia: 6, categoriaId: 'aluguel', descricao: '', valor: 2000 },
    { id: 'n3', mes: 11, dia: 7, categoriaId: 'mercado', descricao: '', valor: 1000 },
  );
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'meta-economia'));
  await pronto(p);
  assert.ok((await p.evaluate(() => document.body.textContent)).includes('Meta de economia'), 'o cartão aparece sem Guardar');
  const botao = await p.waitForSelector('[data-acao="criar-guardar"]');
  const valor = Number(await botao.evaluate((e) => e.dataset.valor));
  assert.ok(valor > 0, 'a sugestão tem valor');
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(7000));
  await botao.click();
  await sincronizado(p);
  await esperarHeroi(p, moeda(7000 - valor));
  const cats = a.servidor.planilha.ler('categorias');
  assert.ok(cats.some((l) => l[0] === 'guardar' && l[2] === 'fixo'), 'a categoria Guardar foi criada');
  const planoLido = a.servidor.planilha.ler('orcamento').find((l) => Number(l[0]) === 2026 && l[1] === 'guardar' && l[2] === 11);
  assert.ok(planoLido && planoLido[3] === valor, 'o plano de Guardar foi gravado');
  assert.equal((await kpiDe(p, 'Planos sem lançamento')).valor, moeda(valor), 'a meta fica reservada no disponível');
  await p.click('[data-foco="meta-confirmar"]');
  await sincronizado(p);
  await sleep(200);
  const transferencia = a.servidor.planilha.ler('lancamentos').find((l) => Number(l[1]) === 2026 && l[2] === 11 && l[4] === 'guardar');
  assert.ok(transferencia && transferencia[6] === valor, 'a transferência foi lançada');
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(7000 - valor), 'confirmar só tira do previsto, não muda o disponível');
  await p.close();
});

await caso('meta: mostra % da renda, ajusta pelo atalho e limpa a meta', async () => {
  const dados = {
    nome: 'Meta %', categorias: [
      { id: 'guardar', nome: 'Guardar', grupo: 'fixo', ordem: 1 },
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 2 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 3 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'g1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 10000 },
    ], orcamento: { guardar: { 11: 2000 }, mercado: { 11: 1000 }, salario: { 11: 10000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'meta-percentual'));
  await pronto(p);
  const texto = await p.$eval('#tela', (e) => e.innerText);
  assert.ok(texto.includes('Meta ' + moeda(2000) + ' · 20,0% da renda'), 'meta em % da renda');
  assert.ok(texto.includes('Meta de economia: ' + moeda(2000) + ' (20,0% da renda)'), 'ritmo mostra a meta');
  await p.click('[data-acao="meta-foco"]'); await sleep(100);
  assert.equal(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-foco')), 'meta-guardar');
  await p.click('[data-acao="meta-limpar"]'); await sincronizado(p); await sleep(200);
  assert.ok(!a.servidor.planilha.ler('orcamento').some((l) => l[1] === 'guardar' && l[2] === 11), 'meta removida da planilha');
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(9000), 'sem a meta, o disponível sobe');
  assert.ok(!(await p.$eval('#tela', (e) => e.innerText)).includes('Limpar meta'), 'o botão some');
  await p.close();
});

await caso('ajuda: “Como funciona” abre e leva à composição do disponível', async () => {
  await irPara(pc, 'inicio');
  await pc.click('[data-acao="como-funciona"]'); await folhaAberta(pc);
  const texto = await pc.$eval('.folha', (e) => e.innerText);
  assert.ok(texto.includes('Meta de economia') && texto.includes('Ritmo do plano'), 'conteúdo da ajuda');
  await pc.click('.folha [data-f="reserva"]');
  await pc.waitForFunction(() => {
    const f = document.querySelector('.folha.aberta');
    return f && f.innerText.includes('Como o disponível é calculado');
  }, { timeout: 5000 });
  await pc.keyboard.press('Escape'); await semFolha(pc);
});

await caso('cobertura do plano: planejar a categoria sem plano grava e limpa o “Sem plano”', async () => {
  const dados = {
    nome: 'Cobertura', categorias: [
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 2 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'c1', mes: 11, dia: 5, categoriaId: 'mercado', descricao: '', valor: 500 },
    ], orcamento: { salario: { 11: 10000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'cobertura-plano'));
  await pronto(p);
  await p.waitForSelector('[data-foco="planejar-sem-plano"]');
  const texto = await p.$eval('#tela', (e) => e.innerText);
  assert.ok(texto.includes('Cobertura do plano'), 'o cartão de cobertura aparece');
  assert.ok(texto.includes('Sem plano: ' + moeda(500)), 'o valor sem plano aparece');
  await p.click('[data-foco="planejar-sem-plano"]');
  await sincronizado(p);
  await sleep(200);
  const plano = a.servidor.planilha.ler('orcamento').find((l) => l[1] === 'mercado' && l[2] === 11);
  assert.ok(plano && plano[3] === 500, 'o plano foi gravado com o gasto real');
  await p.waitForFunction(() => !document.querySelector('#tela').innerText.includes('Sem plano'));
  await p.close();
});

await caso('barra agregada: 82% do plano com 60% do mês fica em atenção', async () => {
  const dados = {
    nome: 'Barra', categorias: [
      { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 },
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 2 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 3 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'b1', mes: 11, dia: 5, categoriaId: 'aluguel', descricao: '', valor: 800 },
      { id: 'b2', mes: 11, dia: 6, categoriaId: 'mercado', descricao: '', valor: 840 },
    ], orcamento: { aluguel: { 11: 1000 }, mercado: { 11: 1000 }, salario: { 11: 10000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'barra-atencao'));
  await pronto(p);
  assert.ok(await p.$('section[aria-labelledby="h-ritmo"] .barra .enchido.atencao'), 'a barra agregada fica em atenção');
  assert.equal(await p.$('section[aria-labelledby="h-ritmo"] .barra .enchido.acima'), null, 'sem estourar o plano');
  const legenda = await p.$eval('section[aria-labelledby="h-ritmo"]', (e) => e.textContent);
  assert.ok(legenda.includes('82% do plano usado'));
  assert.ok(legenda.includes('hoje: 60% do mês'));
  await p.close();
});

await caso('apagar plano avisa que não cancela a despesa', async () => {
  const dados = {
    nome: 'Apagar plano', categorias: [
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 2 },
    ],
    anos: { 2026: { lancamentos: [], orcamento: { mercado: { 11: 500 }, salario: { 11: 10000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'apagar-plano'));
  await pronto(p);
  await irPara(p, 'mes');
  await p.click('[data-modo="planejar"]'); await sleep(100);
  await substituir(p, '#pl-mercado', '');
  await p.keyboard.press('Backspace'); await p.keyboard.press('Tab'); await sleep(250); await sincronizado(p);
  await p.waitForSelector('.aviso .aviso-txt');
  const aviso = await p.$eval('.aviso .aviso-txt', (e) => e.textContent);
  assert.match(aviso, /não cancela a despesa/);
  assert.ok(!a.servidor.planilha.ler('orcamento').some((l) => l[1] === 'mercado' && l[2] === 11), 'plano apagado na planilha');
  await p.close();
});

await caso('categoria: apagar plano pelo painel do Início', async () => {
  const dados = {
    nome: 'Apagar painel', categorias: [
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 2 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'ap1', mes: 11, dia: 5, categoriaId: 'mercado', descricao: '', valor: 500 },
      { id: 'ap2', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
    ], orcamento: { mercado: { 11: 1000 }, salario: { 11: 5000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'apagar-painel'));
  await pronto(p);
  await p.click('[data-acao="categoria"][data-cat="mercado"]'); await folhaAberta(p);
  await p.click('[data-f="apagar-plano"]'); await sincronizado(p); await sleep(200);
  assert.ok(!a.servidor.planilha.ler('orcamento').some((l) => l[1] === 'mercado' && l[2] === 11), 'o plano saiu da planilha');
  await p.click('.folha [data-f="fechar"]'); await semFolha(p);
  await p.close();
});

await caso('computador: busca do extrato não recria o campo; Tab em Ajustes mantém o foco', async () => {
  await irPara(pc, 'extrato');
  const campo = await pc.$('#busca');
  await campo.type('fei');
  await sleep(250);
  assert.ok(await campo.evaluate((e) => e.isConnected && document.activeElement === e), 'o mesmo campo continua focado');
  assert.ok((await pc.$$('#extrato-lista .linha-lanc')).length > 0, 'achou “Feira”');
  await irPara(pc, 'ajustes');
  await substituir(pc, '#cn-mercado', 'Mercado e feira');
  await pc.keyboard.press('Tab'); await sleep(250); await sincronizado(pc);
  assert.equal(await pc.evaluate(() => document.activeElement.id), 'cg-mercado');
  assert.ok(amb.servidor.planilha.ler('categorias').some((l) => l[1] === 'Mercado e feira'));
});

await caso('leitor de números aceita o jeito brasileiro', async () => {
  const r = await pc.evaluate(() => [paraNumero('1.500'), paraNumero('1.234,56'), paraNumero('R$ 89,90'), paraNumero('12.5'),
    paraNumeros('217,93 176,15+64,86').length, paraNumeros('36*4').reduce((a, b) => a + b, 0), paraNumeros('100-20')]);
  assert.deepEqual(r, [1500, 1234.56, 89.9, 12.5, 3, 144, null]);
});

await caso('celular: nenhuma tela passa da largura da tela', async () => {
  for (const t of ['inicio', 'extrato', 'mes', 'planilha', 'ajustes']) {
    await irPara(cel, t);
    const largura = await cel.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(largura[0] <= largura[1], `${t}: ${largura[0]}px > ${largura[1]}px`);
  }
});

await caso('celular: com a barra do navegador, o lançamento mostra categorias, teclado e Salvar inteiros', async () => {
  // Alturas reais com a barra do navegador: Android comum (~715) e pequeno (~640).
  for (const [width, height] of [[411, 715], [360, 640]]) {
    const p = await abrir(amb, { ...CEL, width, height }, url);
    await pronto(p);
    await p.tap('.inf-mais'); await folhaAberta(p);
    for (const modo of ['hoje', 'outra']) {
      await p.tap(`[data-f="data"][data-v="${modo}"]`); await sleep(120);
      const r = await p.evaluate(() => {
        const f = document.querySelector('.folha');
        const dentro = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight + 0.5; };
        const fimCats = document.querySelector('#nv-cats').getBoundingClientRect().bottom;
        const topoTeclado = document.querySelector('.nv-teclado-area').getBoundingClientRect().top;
        return {
          rola: f.scrollHeight - f.clientHeight, cats: dentro('#nv-cats') && fimCats <= topoTeclado, valor: dentro('#nv-valor'),
          teclas: dentro('.teclado [data-v="apagar"]'), salvar: dentro('#nv-salvar'),
          tecla: document.querySelector('.teclado button').getBoundingClientRect().height,
        };
      });
      const onde = `${width}×${height}, data ${modo}`;
      assert.ok(r.rola <= 1, `${onde}: a folha rola ${r.rola}px`);
      assert.ok(r.cats && r.valor && r.teclas && r.salvar, `${onde}: algo ficou fora da tela ${JSON.stringify(r)}`);
      assert.ok(r.tecla >= 38, `${onde}: tecla de ${r.tecla}px`);
    }
    await p.close();
  }
});

await caso('primeiro acesso: planilha vazia vira um controle pronto em 2 passos', async () => {
  const vazio = criarAmbiente({});
  const p = await abrir(vazio, CEL, montarPagina(vazio, 'vazio'));
  await p.waitForSelector('#boasvindas:not([hidden]) .bv');
  await p.type('#bv-nome', 'Teste');
  await p.tap('[data-b="avancar"]'); await sleep(100);
  await p.tap('input[value="familia"]');
  await p.tap('[data-b="concluir"]');
  await p.waitForFunction(() => S.montado && !document.querySelector('#app').hidden);
  await sincronizado(p);
  assert.equal(vazio.servidor.planilha.ler('categorias').length, 18);
  assert.ok(vazio.servidor.planilha.ler('config').some((l) => l[0] === 'nome' && l[1] === 'Teste'));
});

await caso('nenhum erro de JavaScript em nenhuma página', async () => {
  const erros = paginas.flatMap((p) => p.erros);
  assert.deepEqual(erros, []);
});

await browser.close();
for (const [s, n, ms, msg] of resultados) console.log(`${s} ${n} (${ms} ms)${msg ? '\n    → ' + msg : ''}`);
const falhas = resultados.filter((r) => r[0] === '✖').length;
console.log(`\n${resultados.length - falhas}/${resultados.length} cenários passaram`);
process.exit(falhas ? 1 : 0);
