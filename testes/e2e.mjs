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

function livreEsperado(d, ano, mes) {
  const b = d.anos[ano];
  const real = (cid) => arred(b.lancamentos.filter((l) => l.mes === mes && l.categoriaId === cid).reduce((a, l) => a + l.valor, 0));
  const plano = (cid) => (b.orcamento[cid] || {})[mes] || 0;
  let renda = 0; let gasto = 0; let aVencer = 0;
  for (const c of d.categorias) {
    const r = real(c.id); const p = plano(c.id);
    if (c.grupo === 'renda') renda += Math.max(r, p);
    else { gasto += r; if (c.grupo === 'fixo') aVencer += Math.max(0, p - r); }
  }
  return arred(renda - gasto - aVencer);
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

await caso('celular: abre a planilha no formato da v1 e mostra o “livre para gastar” certo', async () => {
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
  await pc.keyboard.press('n'); await folhaAberta(pc);
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

await caso('computador: planejar com “1.500” grava 1500 e o Tab não perde o foco', async () => {
  await irPara(pc, 'mes');
  await pc.click('[data-modo="planejar"]'); await sleep(100);
  await substituir(pc, '#pl-mercado', '1.500');
  await pc.keyboard.press('Tab'); await sleep(250); await sincronizado(pc);
  const orc = amb.servidor.planilha.ler('orcamento').find((l) => l[1] === 'mercado' && l[2] === 11);
  assert.equal(orc[3], 1500);
  const foco = await pc.evaluate(() => document.activeElement && document.activeElement.id);
  assert.equal(foco, 'pl-transporte', 'o foco foi para o campo seguinte');
});

await caso('computador: célula da planilha abre o painel e lança ali mesmo; setas navegam', async () => {
  await irPara(pc, 'planilha');
  await pc.click('td.cel[data-cat="mercado"][data-mes="11"]'); await folhaAberta(pc);
  await pc.type('#fc-valor', '10');
  await pc.keyboard.press('Enter'); await sleep(150);
  await pc.keyboard.press('Escape'); await semFolha(pc); await sincronizado(pc);
  assert.ok(amb.linhas().some((l) => l[6] === 10 && l[4] === 'mercado' && l[2] === 11), 'lançado na planilha');
  await pc.focus('td.cel[data-cat="mercado"][data-mes="11"]');
  await pc.keyboard.press('ArrowRight');
  const foco = await pc.evaluate(() => document.activeElement.dataset.mes);
  assert.equal(foco, '12');
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
  assert.equal(vazio.servidor.planilha.ler('categorias').length, 17);
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
