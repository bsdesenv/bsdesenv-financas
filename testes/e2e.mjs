/**
 * Teste de ponta a ponta: o app real (src/*.html) num Chrome sem janela, ligado ao
 * servidor real (src/Codigo.gs) sobre uma planilha falsa.
 *
 *   node testes/e2e.mjs                   roda os cenários
 *   node testes/e2e.mjs --prints          também regrava os prints de docs/img/
 *   node testes/e2e.mjs --capturas        também grava PNG em testes/saida/capturas (320, 390 e 1440 px, claro e escuro)
 *   AXE_PATH=node_modules/axe-core/axe.min.js E2E_EXIGE_AXE=1   exige o axe (sem isso o axe é pulado com aviso)
 *   E2E_SO="3.1.0" node testes/e2e.mjs    só os cenários com esse texto no nome
 *
 * Pré-requisitos e detalhes: docs/ARQUITETURA.md, seção Testes.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
/** Nada vai para a rede de verdade: o GitHub e o jsDelivr são respondidos por p.github (padrão: 404). */
const HOSTS_GITHUB = /^https:\/\/(raw\.githubusercontent\.com|cdn\.jsdelivr\.net)\//;
/** Páginas abertas no caso em andamento: fecham ao fim dele (com o contexto próprio), salvo as abertas com `manter`. */
let abertasNoCaso = null;
async function abrir(amb, vp, url, { tema, contexto, antes, manter, agora = AGORA } = {}) {
  const ctx = contexto || (await browser.createBrowserContext());
  const p = await ctx.newPage();
  if (!contexto) { const fechar = p.close.bind(p); p.close = async () => { await fechar().catch(() => {}); await ctx.close().catch(() => {}); }; }
  if (abertasNoCaso && !manter) abertasNoCaso.push(p);
  p.erros = [];
  p.github = { resposta: () => ({ status: 404, body: 'não encontrado' }), pedidos: [] };
  await p.setRequestInterception(true);
  p.on('request', (req) => {
    if (!HOSTS_GITHUB.test(req.url())) {
      // Sem rede de verdade: a fonte vem embutida desde a 3.0.0 e o GitHub é simulado acima. Só com --prints outros pedidos passam.
      if (!PRINTS && /^https?:/.test(req.url())) { req.abort('failed').catch(() => {}); return; }
      req.continue().catch(() => {}); return;
    }
    p.github.pedidos.push(req.url());
    const r = p.github.resposta(req.url());
    if (!r) { req.abort('failed').catch(() => {}); return; }
    req.respond({ status: r.status, contentType: 'text/plain; charset=utf-8', headers: { 'access-control-allow-origin': '*' }, body: r.body }).catch(() => {});
  });
  if (antes) await antes(p);
  p.on('pageerror', (e) => p.erros.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) p.erros.push('console: ' + m.text()); });
  p.on('dialog', (d) => d.accept());
  await p.evaluateOnNewDocument((agora) => {
    const Real = Date;
    window.Date = class extends Real {
      constructor(...a) { super(...(a.length ? a : [agora])); }
      static now() { return agora; }
    };
  }, agora);
  await p.exposeFunction('__servidor', (fn, args) => amb.ponte(fn, args));
  await p.setViewport(vp);
  if (tema) await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: tema }]);
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  paginas.push(p);
  return p;
}
/** Espera a fonte DM Sans (embutida no Estilos.html) ficar pronta, para os prints saírem com a tipografia certa. */
async function fontes(p) {
  await p.waitForFunction(() => document.fonts.check('600 16px "DM Sans"'), { timeout: 20000 }).catch(() => console.log('  (aviso: DM Sans não carregou; print com fonte do sistema)'));
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
async function semFolha(p) {
  try { await p.waitForFunction(() => !document.querySelector('.folha'), { timeout: 10000 }); } catch (e) {
    const abertas = await p.evaluate(() => [...document.querySelectorAll('.folha')].map((f) => ((f.querySelector('h2') || {}).textContent || '?') + (f.classList.contains('aberta') ? '' : ' (fechando)')).join(' | '));
    throw new Error('folha não fechou: ' + abertas);
  }
}
const fecharFolhas = async (p) => { await p.keyboard.press('Escape'); await semFolha(p); };
/** `secao` só vale em Ajustes: abre a seção direto (no celular o app começa pelo índice). */
async function irPara(p, tela, secao) { await p.evaluate((t, sc) => irPara(t, { secao: sc }), tela, secao); await sleep(120); }
async function digitarTeclado(p, numeros) { for (const d of numeros) { await p.tap(`.teclado [data-v="${d}"]`); await sleep(30); } }
/** Campo de valor (.valor): o app seleciona o conteúdo um instante depois do foco, então espera isso passar antes de digitar. */
async function digitarValor(p, seletor, texto) {
  await p.$eval(seletor, (e) => e.focus());
  await sleep(80);
  await p.type(seletor, texto);
}
/** Foca o campo, seleciona tudo e digita por cima (como uma pessoa faria). */
async function substituir(p, seletor, texto) {
  await p.$eval(seletor, (e) => { e.focus(); e.select(); });
  await p.type(seletor, texto);
}
/** Lê uma linha da composição do herói (versão do computador: "Renda…", "− Já saiu", "− Contas a pagar", "= Disponível"). */
const compDe = (p, rotulo) => p.$$eval('.heroi-composicao > div', (els, r) => {
  const e = els.find((x) => x.querySelector('span').textContent.includes(r));
  return e ? { rotulo: e.querySelector('span').textContent, valor: e.querySelector('strong').textContent } : null;
}, rotulo);
/** Renda do herói: valor, texto do rótulo (traz "recebida X" quando há a receber) e o "A receber" da ponte. */
const rendaDe = async (p) => {
  const topo = await p.$eval('.heroi-composicao > div:first-child', (e) => ({ rotulo: e.querySelector('span').textContent, valor: e.querySelector('strong').textContent }));
  const aReceber = await p.$$eval('.heroi-bridge span', (els) => { const e = els.find((x) => x.firstChild && x.firstChild.textContent.startsWith('A receber')); return e ? e.querySelector('strong').textContent : null; });
  return { ...topo, aReceber };
};
/** "Reservado" do herói (legenda do celular; some quando é zero). */
const reservadoDe = (p) => p.$$eval('.heroi-legenda > div', (els) => { const e = els.find((x) => x.querySelector('span').textContent === 'Reservado'); return e ? e.querySelector('strong').textContent : null; });
const jaSaiuDe = (p) => p.$$eval('.heroi-legenda > div', (els) => els.find((x) => x.querySelector('span').textContent === 'Já saiu').querySelector('strong').textContent);
const cartaoDe = (p, id) => p.$eval('#' + id, (e) => e.closest('section').innerText);
const esperarHeroi = (p, valor) => p.waitForFunction((v) => document.querySelector('.numero-heroi')?.textContent === v, {}, valor);

/** Regra da 2.8.0: disponível = renda (recebida + a receber) − já saiu − o que falta de cada plano (exceto o das categorias encerradas). */
function contasEsperadas(d, ano, mes, encerradas = []) {
  const b = d.anos[ano];
  const doMes = (cid) => b.lancamentos.filter((l) => l.mes === mes && l.categoriaId === cid);
  const real = (cid) => arred(doMes(cid).reduce((a, l) => a + l.valor, 0));
  const plano = (cid) => (b.orcamento[cid] || {})[mes] || 0;
  const t = { recebida: 0, aReceber: 0, jaSaiu: 0, contasAPagar: 0, faltaGuardar: 0, nosPlanos: 0 };
  for (const c of d.categorias) {
    const r = real(c.id); const p = plano(c.id);
    const encerrada = encerradas.includes(c.id);
    if (c.grupo === 'renda') { t.recebida += r; if (p > 0 && !encerrada) t.aReceber += Math.max(0, p - r); continue; }
    t.jaSaiu += r;
    if (!(p > 0) || encerrada) continue;
    if (c.id === 'guardar') t.faltaGuardar += Math.max(0, p - Math.max(0, r));
    else if (c.grupo === 'fixo') t.contasAPagar += Math.max(0, p - r);
    else t.nosPlanos += Math.max(0, p - r);
  }
  for (const k of Object.keys(t)) t[k] = arred(t[k]);
  t.renda = arred(t.recebida + t.aReceber);
  t.reservado = arred(t.contasAPagar + t.faltaGuardar + t.nosPlanos);
  t.disponivel = arred(t.renda - t.jaSaiu - t.reservado);
  t.sobraRealizada = arred(t.recebida - t.jaSaiu);
  return t;
}
const livreEsperado = (d, ano, mes, encerradas) => contasEsperadas(d, ano, mes, encerradas).disponivel;

const resultados = [];
// E2E_SO="3.1.0" roda só os cenários cujo nome contém o texto; o de erros de JavaScript roda sempre.
const SO = process.env.E2E_SO || '';
async function caso(nome, fn) {
  if (SO && !nome.includes(SO) && !nome.startsWith('nenhum erro de JavaScript')) return;
  const t0 = Date.now();
  abertasNoCaso = [];
  try { await fn(); resultados.push(['✔', nome, Date.now() - t0]); }
  catch (e) {
    const linha = (String(e.stack).match(/e2e\.mjs:(\d+)/) || [])[1];
    resultados.push(['✖', nome, Date.now() - t0, (process.env.E2E_VERBOSE ? e.message : e.message.split('\n')[0]) + (linha ? ` (e2e.mjs:${linha})` : '')]);
  } finally {
    // Página esquecida aberta pesa no navegador e deixa os cenários seguintes lentos e instáveis.
    for (const p of abertasNoCaso) if (!p.isClosed()) await p.close();
    abertasNoCaso = null;
  }
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
  /* 3.2.0: cartão de exemplo fictício. Não usa CARTAO_AZUL, que é definida mais abaixo, no bloco de cenários. */
  const dadosCartao = JSON.parse(JSON.stringify(exemplo));
  dadosCartao.anos['2026'].lancamentos.push({ id: 'kabcdefghij_ax1', mes: 11, dia: 15, categoriaId: 'mercado', descricao: 'Compra de exemplo', valor: 120 });
  const abasCartao = abasDoBackup(dadosCartao);
  abasCartao.cartoes = [['id', 'nome', 'fechamento', 'vencimento', 'limite', 'ativo'], ['kabcdefghij', 'Cartão Azul', 5, 15, 2000, 1]];
  const ambCartao = criarAmbiente(abasCartao);
  const pcCartao = await abrir(ambCartao, PC, montarPagina(ambCartao, 'prints-cartao'), { tema: 'light' });
  await pronto(pcCartao); await fontes(pcCartao);
  await irPara(pcCartao, 'mes'); await pcCartao.waitForSelector('.faturas');
  await (await pcCartao.$('.faturas')).screenshot({ path: path.join(PRINTS, 'computador-mes-faturas.png') });
  await irPara(pcCartao, 'ajustes', 'cartoes'); await pcCartao.waitForSelector('section[aria-labelledby="h-cartoes-credito"]');
  await (await pcCartao.$('section[aria-labelledby="h-cartoes-credito"]')).screenshot({ path: path.join(PRINTS, 'computador-ajustes-cartoes.png') });
  const celCartao = await abrir(ambCartao, CEL, montarPagina(ambCartao, 'prints-cartao-cel'), { tema: 'light' });
  await pronto(celCartao); await fontes(celCartao);
  await irPara(celCartao, 'ajustes', 'cartoes'); await celCartao.click('[data-acao="cartao-novo"]'); await folhaAberta(celCartao);
  await celCartao.screenshot({ path: path.join(PRINTS, 'celular-cartao-novo.png') });
  await celCartao.keyboard.press('Escape'); await semFolha(celCartao);
  await irPara(celCartao, 'mes'); await celCartao.click('.faturas button.linha-fatura'); await folhaAberta(celCartao);
  await celCartao.screenshot({ path: path.join(PRINTS, 'celular-fatura.png') });
  await celCartao.keyboard.press('Escape'); await semFolha(celCartao);
  await irPara(celCartao, 'ajustes', 'diagnosticos'); await celCartao.click('[data-acao="diagnosticos"]'); await folhaAberta(celCartao);
  await celCartao.screenshot({ path: path.join(PRINTS, 'celular-diagnosticos.png') });
  await celCartao.keyboard.press('Escape'); await semFolha(celCartao);
  console.log('prints gravados em docs/img/');
}

/* ---------- cenários ---------- */
const amb = criarAmbiente(abasDoBackup(exemplo));
const url = montarPagina(amb, 'app');
let cel; let pc;

await caso('celular: abre a planilha no formato da v1 e mostra o “disponível para gastar” certo', async () => {
  cel = await abrir(amb, CEL, url, { manter: true });
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
  pc = await abrir(amb, PC, url, { manter: true });
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

await caso('topo: anel de composição e barras dos cartões (sem KPIs)', async () => {
  const p = await abrir(amb, PC, montarPagina(amb, 'topo-moderno'));
  await pronto(p);
  assert.ok(await p.$('.heroi .anel'), 'anel de composição');
  const legenda = await p.$eval('.heroi-legenda', (e) => e.textContent);
  assert.ok(legenda.includes('Já saiu') && legenda.includes('Reservado') && legenda.includes('Disponível'), 'legenda da composição');
  assert.equal(await p.$('.kpi'), null, 'os quatro números do topo saíram da 3.0.0');
  assert.ok(await p.$('#h-vencer'), 'cartão “O que falta pagar”');
  assert.ok(await p.$('section[aria-labelledby="h-planos"] .plano-ritmo .barra'), 'barra do ritmo do plano');
  assert.ok(await p.$('section[aria-labelledby="h-planos"] .plano-meta [data-acao="criar-guardar"]'), 'a meta de economia oferece criar Guardar (o exemplo não tem)');
  assert.ok(await p.$('.g-onde .onde-barra'), 'barras de “Onde foi”');
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

await caso('renda com plano: receber parte do previsto não muda o disponível e fica “a receber”; passar do plano soma', async () => {
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
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(10300), 'antes: renda 10.000 + 400 a receber − 100 ainda no plano do mercado');
  assert.equal((await rendaDe(p)).valor, moeda(10400), 'a renda do mês já inclui o que falta receber');
  const lancar = (v) => p.evaluate((x) => registrar({ t: 'lanc', l: { id: novoId(), ano: S.ano, mes: S.mes, dia: hoje().dia, categoriaId: 'outras-rendas', descricao: 'renda extra', valor: x } }), v);
  await lancar(150); await sincronizado(p);
  await p.waitForFunction((v) => (document.querySelector('.heroi-composicao > div')?.textContent || '').includes('recebida ' + v), {}, moeda(10150));
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(10300), 'receber 150 dos 400 previstos não muda o disponível');
  const renda1 = await rendaDe(p);
  assert.equal(renda1.valor, moeda(10400), 'a renda do mês continua 10.400');
  assert.ok(renda1.rotulo.includes('recebida ' + moeda(10150)) && renda1.aReceber === moeda(250), 'o resto aparece como a receber: ' + JSON.stringify(renda1));
  assert.ok((await cartaoDe(p, 'h-vencer')).includes('recebido ' + moeda(150) + ' de ' + moeda(400)), 'o cartão “O que falta pagar” mostra o que falta receber');
  assert.ok(a.servidor.planilha.ler('lancamentos').find((l) => l[4] === 'outras-rendas' && l[6] === 150), 'renda de 150 gravada em Outras Rendas');
  await lancar(450); await sincronizado(p);
  await esperarHeroi(p, moeda(10500));
  assert.equal((await rendaDe(p)).valor, moeda(10600), 'passando do plano (600 recebidos de 400), o excedente soma na renda e no disponível');
  await p.close();
});

await caso('computador: planejar digitando 1500 grava 1500, e 150000 grava 150000 (sem máscara de centavos)', async () => {
  await irPara(pc, 'mes');
  await pc.click('[data-modo="planejar"]'); await sleep(100);
  const altura = await pc.$eval('#pl-mercado', (e) => e.getBoundingClientRect().height);
  assert.ok(altura <= 50, `o campo do plano tem ${altura}px, não é gigante`);
  const gravado = () => amb.servidor.planilha.ler('orcamento').find((l) => l[1] === 'mercado' && l[2] === 11);
  await substituir(pc, '#pl-mercado', '150000');
  await pc.keyboard.press('Tab');
  await sincronizado(pc);
  assert.equal(gravado()[3], 150000, '150000 grava 150000');
  const focoAposTab = await pc.evaluate(() => {
    const el = document.activeElement;
    return el ? (el.id || el.dataset.foco || el.tagName) : null;
  });
  // O botão “Usar sugestão” agora é focável (a11y), então Tab pode ir para ele antes do próximo campo.
  assert.ok(['sug-mercado', 'pl-transporte'].includes(focoAposTab), 'Tab saiu do campo de mercado, foco em: ' + focoAposTab);
  await substituir(pc, '#pl-mercado', '1500');
  await pc.keyboard.press('Tab'); await sleep(250); await sincronizado(pc);
  assert.equal(gravado()[3], 1500, '1500 grava 1500');
});

await caso('computador: célula da planilha abre o painel e lança ali mesmo; setas navegam', async () => {
  await irPara(pc, 'planilha');
  await pc.click('td.cel[data-cat="mercado"][data-mes="11"]'); await folhaAberta(pc);
  await pc.type('#fc-valor', '1000');
  assert.equal(await pc.$eval('#fc-valor', (e) => e.value), '1000', 'sem máscara de centavos também no painel da célula');
  await pc.keyboard.press('Enter'); await sleep(150);
  await pc.keyboard.press('Escape'); await semFolha(pc); await sincronizado(pc);
  assert.ok(amb.linhas().some((l) => l[6] === 1000 && l[4] === 'mercado' && l[2] === 11), 'lançado na planilha');
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
  // 10.000 de salário previsto − 1.000 de aluguel previsto − 800 lançados no mercado. Carro não entra.
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(8200));
  assert.equal(await reservadoDe(p), moeda(1000));
  assert.equal(await jaSaiuDe(p), moeda(800));
  const ritmo = await cartaoDe(p, 'h-planos');
  assert.ok(ritmo.includes('gasto ' + moeda(0) + ' de ' + moeda(1000)), 'a barra compara só categorias com plano (aluguel: nada lançado): ' + ritmo);
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
  assert.equal(await reservadoDe(p), null, 'sem plano, não há mais 1.000 reservados (a linha some do herói)');
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
  assert.equal(await reservadoDe(p), moeda(1300), 'aluguel e luz ainda estão reservados');
  await p.close();
});

await caso('de onde vem: a folha mostra contas a pagar e o que resta nos planos', async () => {
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
  // renda 10.000 − 500 já saiu − 1.000 (aluguel) − 300 (luz) − 500 que faltam do plano do mercado = 7.700.
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(7700));
  await p.click('[data-acao="detalhe-reserva"]'); await folhaAberta(p);
  const texto = await p.$eval('.folha .folha-corpo', (e) => e.innerText);
  assert.ok(texto.includes('Contas a pagar'), 'lista as contas a pagar');
  assert.ok(texto.includes('Ainda nos planos'), 'lista o que ainda resta nos planos');
  assert.ok(texto.includes('plano ' + moeda(1000) + ' · gasto ' + moeda(500)), 'mostra o plano restante da categoria já iniciada (mercado)');
  assert.ok(!texto.includes('Acima do plano') && !texto.includes('Liberadas no mês'), 'sem blocos vazios');
  assert.ok(texto.includes('Ajustar planos'), 'oferece ajustar os planos');
  await p.close();
});

await caso('variáveis do mês: resumo no Plano do mês, “Onde foi” e atalho para ajustar plano', async () => {
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
  const plano = await cartaoDe(p, 'h-planos');
  assert.ok(plano.includes('gasto ' + moeda(1000) + ' de ' + moeda(1300)), 'resumo do gasto e do plano variável: ' + plano);
  assert.ok(plano.includes('Mercado') && plano.includes('Lazer'), 'cada variável do mês aparece no cartão');
  assert.equal((await compDe(p, 'Ainda nos planos')).valor, moeda(300), 'o que ainda resta nos planos (200 do mercado + 100 do lazer) está na composição do herói');
  const onde = await cartaoDe(p, 'h-onde');
  assert.ok(onde.includes('Onde foi') && onde.includes('Mercado') && onde.includes('Lazer'), 'gráfico de participação');
  assert.ok(await p.$('.g-onde .onde-barra'), 'barra do gráfico');
  await p.click('[data-foco="ajustar-planos"]'); await sleep(150);
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
  assert.equal(await reservadoDe(p), null, 'nada reservado sem plano');
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
  assert.equal(await reservadoDe(p), moeda(1000));
  await p.close();
});

await caso('renda parcial: o vale não muda o disponível e aparece como a receber', async () => {
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
  const renda = await rendaDe(p);
  assert.equal(renda.valor, moeda(10000), 'a renda do mês é a recebida mais a receber');
  assert.ok(renda.rotulo.includes('recebida ' + moeda(5000)) && renda.aReceber === moeda(5000), 'a metade que falta aparece como a receber: ' + JSON.stringify(renda));
  assert.ok((await cartaoDe(p, 'h-vencer')).includes('A receber'), 'o cartão “O que falta pagar” tem o bloco “A receber”');
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(8500), '10.000 de renda − 500 que saiu − 1.000 do aluguel');
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(livreEsperado(dados, 2026, 11)));
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
  assert.ok((await cartaoDe(p, 'h-planos')).includes('crie a categoria Guardar'), 'o Plano do mês oferece criar a meta sem Guardar');
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
  assert.equal(await reservadoDe(p), moeda(valor), 'a meta fica reservada no disponível');
  assert.ok((await cartaoDe(p, 'h-vencer')).includes('Guardar'), 'a meta aparece em “O que falta pagar”');
  await p.waitForFunction(() => !document.querySelector('.aviso'), { timeout: 20000 }); // o aviso de “criada” cobre o botão no canto
  await p.click('[data-acao="confirmar"][data-cat="guardar"]');
  await sincronizado(p);
  await sleep(200);
  const transferencia = a.servidor.planilha.ler('lancamentos').find((l) => Number(l[1]) === 2026 && l[2] === 11 && l[4] === 'guardar');
  assert.ok(transferencia && transferencia[6] === valor, 'a transferência foi lançada ' + valor + ' ' + JSON.stringify(a.servidor.planilha.ler('lancamentos').filter((l) => l[4] === 'guardar')));
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(7000 - valor), 'confirmar só tira do previsto, não muda o disponível');
  await p.close();
});

await caso('meta: aparece no Plano do mês e “Limpar meta” remove', async () => {
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
  assert.ok(texto.includes('Meta de economia') && texto.includes('meta ' + moeda(2000)), 'o Plano do mês mostra a meta');
  assert.equal(await p.$eval('[data-foco="meta-guardar"]', (e) => e.value), '2.000,00', 'o campo da meta traz o valor');
  assert.ok(await p.$('section[aria-labelledby="h-planos"] .plano-meta .barra'), 'barra do progresso da meta');
  assert.ok((await cartaoDe(p, 'h-vencer')).includes('faltam ' + moeda(2000) + ' da meta de ' + moeda(2000)), 'o cartão “O que falta pagar” lembra da meta');
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
  assert.ok((await cartaoDe(p, 'h-planos')).includes('Planejar pela média'), 'o Plano do mês oferece planejar pela média');
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
  assert.ok(await p.$('section[aria-labelledby="h-planos"] .plano-ritmo .barra .enchido.atencao'), 'a barra agregada fica em atenção');
  assert.equal(await p.$('section[aria-labelledby="h-planos"] .plano-ritmo .barra .enchido.acima'), null, 'sem estourar o plano');
  const legenda = await p.$eval('section[aria-labelledby="h-planos"] .plano-ritmo', (e) => e.textContent);
  assert.ok(legenda.includes('Acima do ritmo'), 'a situação diz “Acima do ritmo”');
  assert.ok(legenda.includes('82% do plano') && legenda.includes('60% do mês'), 'legenda: ' + legenda);
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
  const nomeAntes = await pc.evaluate(() => S.dados.nome || '');
  await substituir(pc, '#aj-nome', 'Casa nova');
  await pc.keyboard.press('Tab'); await sleep(250); await sincronizado(pc);
  assert.equal(await pc.evaluate(() => document.activeElement.dataset.foco), 'tema-auto');
  assert.equal(await pc.$eval('#aj-nome', (e) => e.value), 'Casa nova');
  await substituir(pc, '#aj-nome', nomeAntes);
  await pc.keyboard.press('Tab'); await sleep(250); await sincronizado(pc);
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
    if (t === 'planilha') {
      const regiao = await cel.$eval('.planilha-caixa', (e) => ({ role: e.getAttribute('role'), tabindex: e.getAttribute('tabindex'), label: e.getAttribute('aria-label') }));
      assert.equal(regiao.role, 'region', 'a tabela tem uma região de rolagem nomeada');
      assert.equal(regiao.tabindex, '0', 'a tabela pode receber foco por teclado');
      assert.match(regiao.label, /rolável na horizontal/);
    }
  }
});

await caso('celular estreito: indicadores do mês mostram valores completos em 320 px', async () => {
  const estreito = await abrir(amb, { ...CEL, width: 320, height: 720 }, url);
  await pronto(estreito); await irPara(estreito, 'mes');
  const kpis = await estreito.$$eval('.kpis-mes strong', (els) => els.map((e) => ({
    texto: e.textContent,
    excede: e.scrollWidth > e.clientWidth + 1,
  })));
  assert.equal(kpis.length, 3, 'os três indicadores continuam disponíveis');
  assert.ok(kpis.every((k) => !k.excede && !k.texto.includes('…')), JSON.stringify(kpis));
  await estreito.close();
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

await caso('primeiro acesso: planilha vazia vira um controle pronto (passo “Seu mês” pulado)', async () => {
  const vazio = criarAmbiente({});
  const p = await abrir(vazio, CEL, montarPagina(vazio, 'vazio'));
  await p.waitForSelector('#boasvindas:not([hidden]) .bv');
  await p.type('#bv-nome', 'Teste');
  await p.tap('[data-b="avancar"]'); await sleep(100);
  await p.tap('input[value="familia"]');
  await p.tap('[data-b="seu-mes"]'); await sleep(100);
  await p.tap('[data-b="pular"]');
  await p.waitForFunction(() => S.montado && !document.querySelector('#app').hidden);
  await sincronizado(p);
  assert.equal(vazio.servidor.planilha.ler('categorias').length, 18);
  assert.ok(vazio.servidor.planilha.ler('config').some((l) => l[0] === 'nome' && l[1] === 'Teste'));
});

/* ---------- atualização a partir do GitHub (tudo com o GitHub falso) ---------- */
const instalada = JSON.parse(amb.servidor.ctx.carregar()).versaoApp;
const [maiorInst] = instalada.split('.').map(Number);
const VERSAO_NOVA = `${maiorInst + 1}.0.0`;
const ARQ_FALSOS = [['Codigo', 'SERVER_JS', 'src/Codigo.gs', 'Código.gs'], ['Index', 'HTML', 'src/Index.html', 'Index.html'], ['Estilos', 'HTML', 'src/Estilos.html', 'Estilos.html'],
  ['App', 'HTML', 'src/App.html', 'App.html'], ['appsscript', 'JSON', 'src/appsscript.json', 'appsscript.json']]
  .map(([nome, tipo, caminho, editor]) => ({ nome, tipo, caminho, editor, conteudo: `// ${nome} falso — ação ✓\nconst x = "<b>&</b>";\n` }));
/** Monta o GitHub falso: o mesmo versao.json em "main" e na tag; arquivos só na tag. */
function githubFalso({ versao, adulterar = '', novidades = ['Aviso de versão nova', '<b>Atualização</b> assistida'] }) {
  const manifesto = JSON.stringify({
    app: 'bsdesenv-financas', versao, ref: 'v' + versao, data: '2026-11-24', novidades,
    arquivos: ARQ_FALSOS.map((a) => ({ nome: a.nome, tipo: a.tipo, caminho: a.caminho, editor: a.editor, bytes: Buffer.byteLength(a.conteudo), sha256: createHash('sha256').update(a.conteudo).digest('hex') })),
  });
  return (url) => {
    const m = url.match(/^https:\/\/raw\.githubusercontent\.com\/bsdesenv\/bsdesenv-financas\/([^/]+)\/(.+)$/) || url.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/bsdesenv\/bsdesenv-financas@([^/]+)\/(.+)$/);
    if (!m) return { status: 404, body: '' };
    const [, ref, caminho] = m;
    if (caminho === 'versao.json') return ref === 'main' || ref === 'v' + versao ? { status: 200, body: manifesto } : { status: 404, body: '404' };
    const arq = ARQ_FALSOS.find((a) => a.caminho === caminho);
    if (!arq || ref !== 'v' + versao) return { status: 404, body: '404' };
    return { status: 200, body: caminho === adulterar ? arq.conteudo + '// adulterado\n' : arq.conteudo };
  };
}
const copiasFalsas = (p) => p.evaluateOnNewDocument(() => {
  window.__copiado = [];
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copiado.push(t); } } });
});
const planilhaIgual = () => amb.linhas().map((l) => l.join('|')).join('\n');
const estadoAtu = (p, estado) => p.waitForFunction((e) => S.atualizacao && S.atualizacao.estado === e && !S.verificandoAtu, { timeout: 10000 }, estado);
const verificarJa = (p) => p.evaluate(() => verificarAtualizacao({ forcar: true }));
const pastaAtu = path.join(SAIDA, 'atualizacao');
fs.mkdirSync(pastaAtu, { recursive: true });

await caso('atualização: sem GitHub (requisições recusadas) o app abre normal e Ajustes diz que não deu para verificar', async () => {
  const p = await abrir(amb, PC, url, { antes: async (pg) => { pg.github.resposta = () => null; } });
  await pronto(p);
  assert.match(await p.$eval('.numero-heroi', (e) => e.textContent), /R\$/);
  await irPara(p, 'ajustes', 'atualizacoes'); await estadoAtu(p, 'erro');
  assert.match(await p.$eval('#atu-estado', (e) => e.textContent), /Não deu para verificar agora\./);
  assert.equal(await p.$('.lat-item .ponto-novo'), null, 'sem ponto de destaque');
  assert.equal(await p.$('[data-acao="atualizar"]'), null, 'sem botão Atualizar');
  assert.match(await p.$eval('#tela', (e) => e.textContent), /Versão instalada: /);
  assert.ok(p.github.pedidos.length >= 1, 'tentou o GitHub');
  assert.ok(p.github.pedidos.every((u) => HOSTS_GITHUB.test(u)));
});

await caso('atualização: versão igual mostra “versão mais recente” e nenhum destaque', async () => {
  const p = await abrir(amb, PC, url, { antes: async (pg) => { pg.github.resposta = githubFalso({ versao: instalada }); } });
  await pronto(p);
  await irPara(p, 'ajustes', 'atualizacoes'); await estadoAtu(p, 'atual');
  const txt = await p.$eval('#atu-estado', (e) => e.textContent);
  assert.match(txt, /Você está na versão mais recente · verificado às 12:\d\d/);
  assert.equal(await p.$eval('#atu-estado', (e) => e.getAttribute('aria-live')), 'polite');
  assert.equal(await p.$('.ponto-novo'), null);
  assert.equal(await p.$('[data-acao="atualizar"]'), null);
  assert.equal(await p.$eval('.lat-item[data-tela="ajustes"]', (e) => e.getAttribute('aria-label')), null);
});

await caso('atualização: versão nova mostra ponto, cartão, folha com os passos e o botão Copiar copia o arquivo certo', async () => {
  const antes = planilhaIgual();
  const p = await abrir(amb, PC, url, { tema: 'light', antes: async (pg) => { pg.github.resposta = githubFalso({ versao: VERSAO_NOVA }); await copiasFalsas(pg); } });
  await pronto(p); await fontes(p);
  await verificarJa(p); await estadoAtu(p, 'nova');
  assert.ok(await p.$('.lat-item[data-tela="ajustes"] .ponto-novo'), 'ponto no item Ajustes');
  assert.equal(await p.$eval('.lat-item[data-tela="ajustes"]', (e) => e.getAttribute('aria-label')), 'Ajustes, nova versão disponível');
  assert.equal(await p.$eval('.versao-nova', (e) => e.textContent), `v${instalada} · nova ${VERSAO_NOVA}`);
  await p.click('.versao-nova'); await sleep(150);
  assert.equal(await p.$eval('.titulo-tela', (e) => e.textContent.startsWith('Ajustes')), true);
  const cartao = await p.$eval('#atu-estado', (e) => e.textContent);
  assert.match(cartao, new RegExp(`Nova versão ${VERSAO_NOVA.replace(/\./g, '\\.')} · 24/11/2026`));
  assert.match(cartao, /Aviso de versão nova/);
  assert.equal(await p.$eval('#atu-estado li:nth-child(2)', (e) => e.innerHTML), '&lt;b&gt;Atualização&lt;/b&gt; assistida', 'texto do GitHub escapado');
  assert.equal(await p.$('#atu-estado li b'), null, 'nenhum HTML vindo do GitHub');
  assert.equal(await p.$eval('#atu-estado a', (e) => e.href), 'https://github.com/bsdesenv/bsdesenv-financas/blob/main/CHANGELOG.md');
  // Um clique: o link leva ao instalador só os IDs do projeto e da implantação.
  const inst = await p.$eval('a[data-foco="atu-instalador"]', (e) => ({ href: e.href, alvo: e.target, texto: e.textContent.trim() }));
  assert.match(inst.href, /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec\?script=ID_DO_PROJETO_DE_TESTE&implantacao=ID_DA_IMPLANTACAO_DE_TESTE$/);
  assert.equal(inst.alvo, '_blank');
  assert.equal(inst.texto, 'Atualizar agora');
  assert.equal(await p.$eval('[data-acao="atualizar"]', (e) => e.textContent.trim()), 'Atualizar à mão…');
  await p.evaluate(() => document.querySelector('#atu-estado').closest('.cartao').scrollIntoView({ block: 'center' })); await sleep(150);
  await p.screenshot({ path: path.join(pastaAtu, 'computador-claro-cartao.png') });
  await p.click('[data-acao="atualizar"]'); await folhaAberta(p);
  await p.waitForFunction(() => document.querySelectorAll('.atu-arq').length === 5);
  assert.equal(await p.$eval('.folha h2', (e) => e.textContent), `Atualizar para ${VERSAO_NOVA}`);
  assert.equal(await p.$$eval('.atu-passos > li', (l) => l.length), 5);
  assert.equal(await p.$eval('.atu-passos a[target="_blank"]', (e) => e.href), 'https://script.google.com/home/projects/ID_DO_PROJETO_DE_TESTE/edit');
  assert.equal(await p.$eval('.atu-passos a[target="_top"]', (e) => e.href), 'https://script.google.com/macros/s/ID_DA_IMPLANTACAO_DE_TESTE/exec');
  assert.deepEqual(await p.$$eval('.atu-arq-nome', (l) => l.map((e) => e.firstChild.textContent)), ARQ_FALSOS.map((a) => a.editor));
  assert.ok(p.github.pedidos.some((u) => u.includes(`/v${VERSAO_NOVA}/versao.json`)), 'leu o versao.json da tag');
  await p.screenshot({ path: path.join(pastaAtu, 'computador-claro-folha.png') });
  await p.click('[data-f="copiar"][data-i="3"]');
  await p.waitForFunction(() => window.__copiado.length === 1);
  assert.equal(await p.evaluate(() => window.__copiado[0]), ARQ_FALSOS[3].conteudo);
  assert.equal(await p.$eval('[data-f="copiar"][data-i="3"]', (e) => e.textContent), 'Copiado ✓');
  assert.equal(await p.$$eval('.atu-arq.feito', (l) => l.length), 1);
  assert.equal(await p.$eval('.atu-arq.feito .atu-arq-nome', (e) => e.firstChild.textContent), 'App.html');
  assert.equal(await p.evaluate(() => document.activeElement.dataset.foco), 'atu-cp-3', 'foco volta ao botão');
  assert.equal(planilhaIgual(), antes, 'a planilha não muda');
  await p.keyboard.press('Escape'); await semFolha(p);
});

await caso('atualização: plano B de cópia (execCommand) e, sem ele, o código aparece numa caixa selecionada', async () => {
  const ambiente = (executar) => async (pg) => {
    pg.github.resposta = githubFalso({ versao: VERSAO_NOVA });
    await pg.evaluateOnNewDocument((exec) => {
      window.__copiado = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('negado')) } });
      document.execCommand = (c) => { if (c !== 'copy' || !exec) return false; window.__copiado.push(document.activeElement.value); return true; };
    }, executar);
  };
  const p = await abrir(amb, PC, url, { antes: ambiente(true) });
  await pronto(p); await verificarJa(p); await estadoAtu(p, 'nova');
  await irPara(p, 'ajustes', 'atualizacoes'); await p.click('[data-acao="atualizar"]'); await folhaAberta(p);
  await p.waitForSelector('.atu-arq'); await p.click('[data-f="copiar"][data-i="0"]');
  await p.waitForFunction(() => window.__copiado.length === 1);
  assert.equal(await p.evaluate(() => window.__copiado[0]), ARQ_FALSOS[0].conteudo);
  assert.equal(await p.$eval('[data-f="copiar"][data-i="0"]', (e) => e.textContent), 'Copiado ✓');
  const q = await abrir(amb, PC, url, { antes: ambiente(false) });
  await pronto(q); await verificarJa(q); await estadoAtu(q, 'nova');
  await irPara(q, 'ajustes', 'atualizacoes'); await q.click('[data-acao="atualizar"]'); await folhaAberta(q);
  await q.waitForSelector('.atu-arq'); await q.click('[data-f="copiar"][data-i="1"]');
  await q.waitForSelector('textarea[readonly]');
  assert.equal(await q.$eval('textarea[readonly]', (t) => t.value), ARQ_FALSOS[1].conteudo);
  assert.equal(await q.evaluate(() => { const t = document.activeElement; return t.tagName === 'TEXTAREA' && t.selectionEnd - t.selectionStart === t.value.length; }), true, 'texto já selecionado');
  assert.match(await q.$eval('.atu-manual', (e) => e.textContent), /Copie com Ctrl\+C/);
  assert.equal(await q.$$eval('.atu-arq.feito', (l) => l.length), 0, 'não marca como feito');
});

await caso('atualização: hash que não confere mostra o erro e não copia nada', async () => {
  const p = await abrir(amb, PC, url, { antes: async (pg) => { pg.github.resposta = githubFalso({ versao: VERSAO_NOVA, adulterar: 'src/Index.html' }); await copiasFalsas(pg); } });
  await pronto(p); await verificarJa(p); await estadoAtu(p, 'nova');
  await irPara(p, 'ajustes', 'atualizacoes'); await p.click('[data-acao="atualizar"]'); await folhaAberta(p);
  await p.waitForSelector('.atu-arq'); await p.click('[data-f="copiar"][data-i="1"]');
  await p.waitForSelector('.atu-erro');
  assert.equal(await p.$eval('.atu-erro', (e) => e.textContent), 'O arquivo baixado não confere com a versão publicada. Tente de novo mais tarde.');
  assert.equal(await p.evaluate(() => window.__copiado.length), 0, 'nada copiado');
  assert.equal(await p.$$eval('.atu-arq.feito', (l) => l.length), 0);
  assert.equal(await p.$eval('[data-f="copiar"][data-i="1"]', (e) => e.textContent), 'Copiar');
  await p.click('[data-f="copiar"][data-i="0"]');
  await p.waitForFunction(() => window.__copiado.length === 1);
});

await caso('atualização: tag ainda não publicada mostra a mensagem de espera', async () => {
  const p = await abrir(amb, PC, url, { antes: async (pg) => {
    const base = githubFalso({ versao: VERSAO_NOVA });
    pg.github.resposta = (u) => (u.includes('/v' + VERSAO_NOVA + '/') || u.includes('@v' + VERSAO_NOVA + '/') ? { status: 404, body: '404' } : base(u));
  } });
  await pronto(p); await verificarJa(p); await estadoAtu(p, 'nova');
  await irPara(p, 'ajustes', 'atualizacoes'); await p.click('[data-acao="atualizar"]'); await folhaAberta(p);
  await p.waitForSelector('.atu-erro');
  assert.equal(await p.$eval('.atu-erro', (e) => e.textContent), `A versão ${VERSAO_NOVA} ainda está sendo publicada. Tente de novo em alguns minutos.`);
});

await caso('atualização: com o interruptor desligado não faz nenhuma requisição ao GitHub', async () => {
  const chave = `bf:arquivo:${new URL(url).pathname}:atualizacao-auto`;
  const p = await abrir(amb, PC, url, { antes: async (pg) => {
    pg.github.resposta = githubFalso({ versao: VERSAO_NOVA });
    await pg.evaluateOnNewDocument((k) => localStorage.setItem(k, 'false'), chave);
  } });
  await pronto(p); await irPara(p, 'ajustes', 'atualizacoes');
  assert.equal(await p.$eval('[data-mudar="atualizacao-auto"]', (e) => e.checked), false);
  await sleep(4600);
  assert.deepEqual(p.github.pedidos, [], 'nenhuma requisição, nem após o prazo automático');
  await p.evaluate(() => verificarAtualizacao());
  assert.deepEqual(p.github.pedidos, []);
  await p.click('[data-acao="verificar-atualizacao"]');
  await estadoAtu(p, 'nova');
  assert.ok(p.github.pedidos.length > 0, 'Verificar agora consulta mesmo assim');
  await sleep(250);
  await p.$eval('[data-mudar="atualizacao-auto"]', (e) => e.click());
  assert.equal(await p.evaluate(() => LS.ler('atualizacao-auto')), true);
});

await caso('atualização: celular (390 px) sem transbordo no cartão e na folha; prints', async () => {
  const p = await abrir(amb, CEL, url, { tema: 'dark', antes: async (pg) => { pg.github.resposta = githubFalso({ versao: VERSAO_NOVA, novidades: ['Aviso de versão nova com um título bem comprido para testar a quebra de linha no celular', 'Atualização assistida', 'Terceira', 'Quarta', 'Quinta'] }); await copiasFalsas(pg); } });
  await pronto(p); await fontes(p);
  await verificarJa(p); await estadoAtu(p, 'nova');
  assert.ok(await p.$('.inf-item[data-tela="ajustes"] .ponto-novo'), 'ponto na barra de baixo');
  assert.equal(await p.$eval('.inf-item[data-tela="ajustes"]', (e) => e.getAttribute('aria-label')), 'Ajustes, nova versão disponível');
  await p.tap('.inf-item[data-tela="ajustes"]'); await sleep(200);
  await p.tap('.aj-item[data-secao="atualizacoes"]'); await sleep(200);
  await p.waitForSelector('#atu-estado');
  await p.evaluate(() => document.querySelector('#atu-estado').closest('.cartao').scrollIntoView({ block: 'center' }));
  await sleep(150);
  const sobra = (pg) => pg.evaluate(() => {
    const raiz = document.documentElement;
    const escopo = document.querySelector('.folha') || document.querySelector('#atu-estado').closest('.cartao');
    const fora = Array.from(escopo.querySelectorAll('*')).filter((e) => e.getBoundingClientRect().width && e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.className || e.tagName);
    return { pagina: raiz.scrollWidth - raiz.clientWidth, escopo: escopo.scrollWidth - escopo.clientWidth, fora };
  });
  let r = await sobra(p);
  assert.ok(r.pagina <= 0 && r.escopo <= 0 && !r.fora.length, 'cartão: ' + JSON.stringify(r));
  const alturas = await p.$$eval('#atu-acoes .botao, .interruptor', (l) => l.map((e) => e.getBoundingClientRect().height));
  assert.ok(alturas.every((h) => h >= 43.5), 'alvos de 44 px: ' + alturas);
  await p.screenshot({ path: path.join(pastaAtu, 'celular-escuro-cartao.png') });
  await p.tap('[data-acao="atualizar"]'); await folhaAberta(p);
  await p.waitForFunction(() => document.querySelectorAll('.atu-arq').length === 5);
  r = await sobra(p);
  assert.ok(r.pagina <= 0 && r.escopo <= 0 && !r.fora.length, 'folha: ' + JSON.stringify(r));
  const botoes = await p.$$eval('.folha .botao', (l) => l.map((e) => e.getBoundingClientRect().height));
  assert.ok(botoes.every((h) => h >= 43.5), 'alvos da folha: ' + botoes);
  await p.tap('[data-f="copiar"][data-i="0"]');
  await p.waitForFunction(() => window.__copiado.length === 1);
  await p.screenshot({ path: path.join(pastaAtu, 'celular-escuro-folha.png') });
  r = await sobra(p);
  assert.ok(r.pagina <= 0 && r.escopo <= 0 && !r.fora.length, 'folha após copiar: ' + JSON.stringify(r));
});

/* ---------- 2.8.0: quitar, encerrar, estorno, lançamento rápido, valores ---------- */
const catsBase = () => [
  { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 },
  { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 2 },
  { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 3 },
];
const configDe = (a, chave) => a.servidor.planilha.ler('config').find((l) => l[0] === chave);
const textoAviso = (p) => p.$eval('.aviso .aviso-txt', (e) => e.textContent);

await caso('2.8.0 quitar: conta fixa paga em parte libera o que faltava, grava a marca e o Desfazer devolve', async () => {
  const dados = {
    nome: 'Quitar', categorias: catsBase(),
    anos: { 2026: { lancamentos: [
      { id: 'q1', mes: 11, dia: 5, categoriaId: 'aluguel', descricao: '', valor: 209.36 },
      { id: 'q2', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
    ], orcamento: { aluguel: { 11: 350 }, salario: { 11: 5000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'quitar-conta'));
  await pronto(p);
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(5000 - 209.36 - 140.64), 'antes: 140,64 ainda reservados');
  const cartao = await p.$eval('#h-vencer', (e) => e.closest('section').innerText);
  assert.ok(cartao.includes('Aluguel') && cartao.includes('Liberar'), 'a conta aparece com Liberar');
  await p.click('[data-acao="encerrar"][data-cat="aluguel"]');
  await esperarHeroi(p, moeda(5000 - 209.36)); await sincronizado(p);
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(4790.64), 'o herói sobe 140,64');
  const marca = configDe(a, 'encerrada:2026-11:aluguel');
  assert.ok(marca && String(marca[1]) === '1', 'marca gravada na aba config: ' + JSON.stringify(a.servidor.planilha.ler('config')));
  await p.click('.aviso-acao');
  await esperarHeroi(p, moeda(4650)); await sincronizado(p);
  assert.equal(configDe(a, 'encerrada:2026-11:aluguel'), undefined, 'o Desfazer apaga a linha');
  await p.close();
});

await caso('2.8.0 encerrar e reabrir uma categoria variável pelo painel', async () => {
  const dados = {
    nome: 'Encerrar', categorias: catsBase(),
    anos: { 2026: { lancamentos: [
      { id: 'e1', mes: 11, dia: 5, categoriaId: 'mercado', descricao: '', valor: 100 },
      { id: 'e2', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
    ], orcamento: { mercado: { 11: 300 }, salario: { 11: 1000 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'encerrar-reabrir'));
  await pronto(p);
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(700));
  await p.evaluate(() => abrirCategoria('mercado', 2026, 11)); await folhaAberta(p);
  assert.equal(await p.$eval('.folha [data-f="encerrar"]', (e) => e.textContent.trim()), `Liberar ${moeda(200)}`);
  await p.click('.folha [data-f="encerrar"]');
  await p.waitForSelector('.folha [data-f="reabrir"]'); await sincronizado(p);
  assert.equal(await p.$eval('.folha [data-f="reabrir"]', (e) => e.textContent.trim()), 'Voltar a reservar');
  assert.equal(String(configDe(a, 'encerrada:2026-11:mercado')[1]), '1', 'marca gravada');
  await esperarHeroi(p, moeda(900));
  await p.click('.folha [data-f="reabrir"]');
  await p.waitForSelector('.folha [data-f="encerrar"]'); await sincronizado(p);
  assert.equal(configDe(a, 'encerrada:2026-11:mercado'), undefined, 'a marca saiu da planilha');
  await esperarHeroi(p, moeda(700));
  await p.close();
});

/* ---------- 3.4.0: liberar a sobra de um plano ---------- */
const dadosLiberar = () => ({
  nome: 'Liberar', categorias: [...catsBase(), { id: 'lazer', nome: 'Lazer', grupo: 'variavel', ordem: 4 }],
  anos: { 2026: { lancamentos: [
    { id: 'l1', mes: 11, dia: 5, categoriaId: 'mercado', descricao: '', valor: 100 },
    { id: 'l2', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: { mercado: { 11: 300 }, lazer: { 11: 200 }, salario: { 11: 1000 } } } },
});

await caso('3.4.0 Liberar uma categoria pela composição e desfazer', async () => {
  const a = criarAmbiente(abasDoBackup(dadosLiberar()));
  const p = await abrir(a, CEL, montarPagina(a, 'liberar-composicao'));
  await pronto(p);
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(500));
  await p.click('[data-acao="detalhe-reserva"]'); await folhaAberta(p);
  await p.click('.folha [data-f="liberar"][data-cat="mercado"]');
  await esperarHeroi(p, moeda(700)); await sincronizado(p);
  const aviso = await textoAviso(p);
  assert.ok(aviso.includes('O plano fechou em') && aviso.includes(moeda(100)), 'o aviso diz o que fechou: ' + aviso);
  await p.click('.aviso-acao');
  await esperarHeroi(p, moeda(500)); await sincronizado(p);
  await p.close();
});

await caso('3.4.0 Liberar todos e um só Desfazer', async () => {
  const a = criarAmbiente(abasDoBackup(dadosLiberar()));
  const p = await abrir(a, CEL, montarPagina(a, 'liberar-todos'));
  await pronto(p);
  await p.click('[data-acao="detalhe-reserva"]'); await folhaAberta(p);
  await p.click('.folha [data-f="liberar-todos"]');
  await esperarHeroi(p, moeda(900)); await sincronizado(p);
  await esperar(() => p.evaluate(() => !document.querySelector('#reserva-planos')));
  assert.equal(await p.$('#reserva-planos'), null, 'o bloco Ainda nos planos some quando nada mais sobra');
  await p.click('.aviso-acao');
  await esperarHeroi(p, moeda(500)); await sincronizado(p);
  await p.close();
});

await caso('3.4.0 Liberar: tocar na linha abre a categoria', async () => {
  const a = criarAmbiente(abasDoBackup(dadosLiberar()));
  const p = await abrir(a, CEL, montarPagina(a, 'liberar-linha'));
  await pronto(p);
  await p.click('[data-acao="detalhe-reserva"]'); await folhaAberta(p);
  await p.click('.folha [data-f="abrir"][data-cat="mercado"]');
  await esperar(() => p.$$eval('.folha h2', (hs) => hs.some((h) => h.textContent.includes('Mercado'))));
  await p.close();
});

await caso('3.4.0 Liberar: Revisar sobras só nos últimos 7 dias', async () => {
  const a = criarAmbiente(abasDoBackup(dadosLiberar()));
  const p = await abrir(a, CEL, montarPagina(a, 'liberar-sobras-18'));
  await pronto(p);
  assert.equal(await p.$('[data-acao="revisar-sobras"]'), null, 'em 18/11 ainda faltam mais de 7 dias: sem Revisar sobras');
  await p.close();
  const p2 = await abrir(a, CEL, montarPagina(a, 'liberar-sobras-25'), { agora: Date.parse('2026-11-25T12:00:00') });
  await pronto(p2);
  assert.ok((await p2.$eval('[data-acao="revisar-sobras"]', (e) => e.textContent)).includes('Revisar sobras'), 'em 25/11 o herói mostra Revisar sobras');
  await p2.click('[data-acao="revisar-sobras"]'); await folhaAberta(p2);
  assert.ok(await p2.$('#reserva-planos'), 'Revisar sobras abre a composição com o bloco Ainda nos planos');
  await p2.close();
});

await caso('3.4.0 Liberar: no celular a folha da categoria não foca o Valor', async () => {
  const a = criarAmbiente(abasDoBackup(dadosLiberar()));
  const p = await abrir(a, CEL, montarPagina(a, 'liberar-foco'));
  await pronto(p);
  await p.evaluate(() => abrirCategoria('mercado', 2026, 11)); await folhaAberta(p);
  await sleep(300);
  assert.notEqual(await p.evaluate(() => document.activeElement.id), 'fc-valor', 'no celular a folha não foca o Valor');
  assert.equal(await p.$eval('.folha [data-f="encerrar"]', (e) => e.textContent.trim()), `Liberar ${moeda(200)}`);
  await p.close();
});

await caso('2.8.0 renda: receber o vale não muda o herói; “Não vem mais” tira o que faltava receber', async () => {
  const dados = {
    nome: 'Não vem mais', categorias: catsBase(),
    anos: { 2026: { lancamentos: [
      { id: 'n1', mes: 11, dia: 5, categoriaId: 'salario', descricao: 'Adiantamento', valor: 1000 },
    ], orcamento: { salario: { 11: 7900 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'nao-vem-mais'));
  await pronto(p);
  const antes = await p.$eval('.numero-heroi', (e) => e.textContent);
  assert.equal(antes, moeda(7900));
  await p.evaluate(() => registrar({ t: 'lanc', l: { id: novoId(), ano: S.ano, mes: S.mes, dia: hoje().dia, categoriaId: 'salario', descricao: 'Vale', valor: 2160 } }));
  await sincronizado(p);
  await p.waitForFunction(() => (document.querySelector('.heroi-composicao > div')?.textContent || '').includes('recebida'), {}, 0);
  assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), antes, 'lançar o vale não muda o herói');
  assert.equal((await rendaDe(p)).aReceber, moeda(4740), 'faltam 4.740 a receber');
  assert.ok((await cartaoDe(p, 'h-vencer')).includes('Salário') && (await cartaoDe(p, 'h-vencer')).includes('Não vem'), 'o cartão oferece “Não vem” para o salário');
  await p.evaluate(() => abrirCategoria('salario', 2026, 11)); await folhaAberta(p);
  assert.equal(await p.$eval('.folha [data-f="encerrar"]', (e) => e.textContent.trim()), `Não vem mais (tira ${moeda(4740)})`);
  await p.click('.folha [data-f="encerrar"]'); await sincronizado(p);
  await esperarHeroi(p, moeda(7900 - 4740));
  assert.equal(String(configDe(a, 'encerrada:2026-11:salario')[1]), '1');
  await p.close();
});

await caso('2.8.0 estorno: o seletor de tipo grava −50, no computador e no celular (teclado)', async () => {
  const dados = { nome: 'Estorno', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'x1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: { salario: { 11: 1000 } } } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const estornos = () => a.linhas().filter((l) => l[6] === -50);
  const pc2 = await abrir(a, PC, montarPagina(a, 'estorno'));
  await pronto(pc2);
  await pc2.click('[data-foco="novo-topo"]'); await folhaAberta(pc2);
  await pc2.click('[data-f="tipo"][data-v="estorno"]');
  await pc2.type('#nv-texto', '50');
  await pc2.click('[data-f="cat"][data-v="mercado"]');
  assert.equal(await pc2.$eval('#nv-salvar', (e) => e.textContent), 'Salvar ' + moeda(-50));
  await pc2.click('#nv-salvar'); await semFolha(pc2); await sincronizado(pc2);
  assert.equal(estornos().length, 1, 'estorno do computador gravado');
  assert.equal(estornos()[0][4], 'mercado');
  await pc2.close();
  const c2 = await abrir(a, CEL, montarPagina(a, 'estorno-cel'));
  await pronto(c2);
  await c2.tap('.inf-mais'); await folhaAberta(c2);
  await c2.tap('[data-f="tipo"][data-v="estorno"]'); await sleep(80);
  await digitarTeclado(c2, ['5', '0', '00']);
  assert.equal(await c2.$eval('#nv-valor', (e) => e.textContent), moeda(-50));
  await c2.tap('[data-f="cat"][data-v="mercado"]'); await sleep(80);
  await c2.tap('#nv-salvar'); await semFolha(c2); await sincronizado(c2);
  assert.equal(estornos().length, 2, 'estorno do celular gravado: ' + JSON.stringify(a.linhas()));
  await c2.close();
});

await caso('2.8.0 lançamento rápido em outro mês: grava no mês da tela, sem dia, e avisa', async () => {
  const dados = { nome: 'Rápido outro mês', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'o1', mes: 9, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
    { id: 'o2', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'rapido-outro-mes'));
  await pronto(p);
  assert.equal(await p.$eval('#quick-mes', (e) => e.textContent), 'hoje');
  await p.click('[data-acao="mes-ant"]'); await p.click('[data-acao="mes-ant"]');
  await p.waitForFunction(() => document.querySelector('#quick-mes')?.textContent === 'em Set 2026');
  await p.click('#quick');
  await p.type('#quick', '1,11 mercado teste');
  await p.keyboard.press('Enter'); await sincronizado(p);
  const linha = a.linhas().find((l) => l[6] === 1.11);
  assert.ok(linha, 'gravado');
  assert.deepEqual([linha[1], linha[2], linha[4], linha[5]], [2026, 9, 'mercado', 'teste']);
  assert.ok(linha[3] === '' || linha[3] === null || linha[3] === undefined, 'sem dia: ' + JSON.stringify(linha[3]));
  await p.waitForSelector('.aviso .aviso-txt');
  assert.ok((await textoAviso(p)).includes('setembro de 2026, sem dia'), await textoAviso(p));
  await p.close();
});

await caso('2.8.0 valor fora do normal: pede confirmação antes de gravar', async () => {
  const dados = { nome: 'Fora do normal', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'h8', mes: 8, dia: 5, categoriaId: 'mercado', descricao: '', valor: 100 },
    { id: 'h9', mes: 9, dia: 5, categoriaId: 'mercado', descricao: '', valor: 95 },
    { id: 'h10', mes: 10, dia: 5, categoriaId: 'mercado', descricao: '', valor: 105 },
    { id: 'h11', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'fora-do-normal'));
  await pronto(p);
  await p.click('[data-foco="novo-topo"]'); await folhaAberta(p);
  await p.type('#nv-texto', '9000');
  await p.click('[data-f="cat"][data-v="mercado"]');
  await p.click('#nv-salvar'); await sleep(250); await sincronizado(p);
  assert.ok(!a.linhas().some((l) => l[6] === 9000), 'o primeiro clique não grava');
  assert.equal(await p.$eval('#nv-salvar', (e) => e.textContent), 'Confirmar ' + moeda(9000));
  // O aviso de “confirme” fica por cima do rodapé; o clique vai direto no botão, como o toque de quem fecha o aviso antes.
  await p.$eval('#nv-salvar', (e) => e.click()); await semFolha(p); await sincronizado(p);
  assert.ok(a.linhas().some((l) => l[6] === 9000 && l[4] === 'mercado'), 'o segundo clique grava');
  await p.close();
});

await caso('2.8.0 editar um estorno sem mexer: o campo mostra −50,00 e salvar mantém −50', async () => {
  const dados = { nome: 'Editar estorno', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'es1', mes: 11, dia: 6, categoriaId: 'mercado', descricao: 'Devolução', valor: -50 },
    { id: 'es2', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'editar-estorno'));
  await pronto(p);
  await p.evaluate(() => abrirEditar('es1')); await folhaAberta(p);
  assert.equal(await p.$eval('#ed-valor', (e) => e.value), '−50,00');
  await p.click('.folha [data-f="salvar"]'); await sleep(200);
  assert.equal(await p.$('#ed-erro:not(:empty)'), null, 'sem mensagem de erro');
  await semFolha(p); await sincronizado(p);
  const linhas = a.linhas().filter((l) => l[0] === 'es1');
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0][6], -50, 'continua −50');
  await p.close();
});

await caso('2.8.0 vários valores no painel da categoria: “217,93 176,15” vira dois lançamentos', async () => {
  const dados = { nome: 'Vários valores', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'vv1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: { mercado: { 11: 1000 } } } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'varios-valores'));
  await pronto(p);
  await p.evaluate(() => abrirCategoria('mercado', 2026, 11)); await folhaAberta(p);
  await p.type('#fc-valor', '217,93 176,15');
  await p.keyboard.press('Enter'); await sleep(200); await sincronizado(p);
  const valores = a.linhas().filter((l) => l[4] === 'mercado').map((l) => l[6]).sort((x, y) => x - y);
  assert.deepEqual(valores, [176.15, 217.93]);
  assert.ok(!a.linhas().some((l) => l[6] > 1e6), 'nunca 21.793.176,15');
  await p.keyboard.press('Escape'); await semFolha(p);
  await p.close();
});

await caso('2.8.0 aviso único da mudança: só para quem veio de antes da 2.8.0, some no Entendi e não volta', async () => {
  const dados = { nome: 'Aviso mudança', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'am1', mes: 10, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
    { id: 'am2', mes: 10, dia: 2, categoriaId: 'mercado', descricao: '', valor: 100 },
    { id: 'am3', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: { mercado: { 11: 300 }, salario: { 11: 1000 } } } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const arq = montarPagina(a, 'aviso-mudanca');
  const ctx = await browser.createBrowserContext();
  const p = await abrir(a, PC, arq, { contexto: ctx });
  await pronto(p);
  await sleep(500);
  assert.equal(await p.$('.aviso-mudanca'), null, 'instalação nova não conheceu a regra antiga: sem aviso');
  // Simula quem atualizou da 2.7.1: o cache local deste aparelho ainda é daquela versão.
  for (let i = 0; i < 2; i++) {
    await p.evaluate(() => LS.gravar('cache', Object.assign({}, S.dados, { versaoApp: '2.7.1' })));
    await sleep(400);
  }
  await p.reload({ waitUntil: 'domcontentloaded' }); await pronto(p);
  await p.waitForSelector('.aviso-mudanca');
  assert.ok((await p.$eval('.aviso-mudanca', (e) => e.textContent)).includes('As contas do mês mudaram na versão 2.8.0'));
  await p.click('[data-acao="aviso-mudanca-ok"]');
  await p.waitForFunction(() => !document.querySelector('.aviso-mudanca'));
  await p.reload({ waitUntil: 'domcontentloaded' }); await pronto(p);
  assert.equal(await p.$('.aviso-mudanca'), null, 'recarregar não mostra de novo');
  const q = await abrir(a, PC, arq, { contexto: ctx });
  await pronto(q);
  assert.equal(await q.$('.aviso-mudanca'), null, 'nova página no mesmo navegador não mostra de novo');
  await q.close(); await p.close();

  const novo = {
    nome: 'Sem passado', categorias: catsBase(),
    anos: { 2026: { lancamentos: [{ id: 'sp1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 }], orcamento: { salario: { 11: 1000 } } } },
  };
  const b = criarAmbiente(abasDoBackup(novo));
  const r = await abrir(b, PC, montarPagina(b, 'aviso-mudanca-novo'));
  await pronto(r);
  assert.equal(await r.$('.aviso-mudanca'), null, 'sem meses anteriores, sem aviso');
  await r.close();
});

/* ---------- 2.8.1: avisos, repetir, grupo, economia, importação, Ctrl+Z ---------- */
await caso('2.8.1 avisos fora da folha: no computador à esquerda do painel, no celular no topo; com-folha e inert', async () => {
  const dados = { nome: 'Avisos', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'av1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'avisos-pc'));
  await pronto(p);
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('com-folha')), false);
  assert.equal(await p.evaluate(() => document.querySelector('#app').inert), false);
  await p.click('[data-foco="novo-topo"]'); await folhaAberta(p);
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('com-folha')), true, 'com-folha com a folha aberta');
  assert.equal(await p.evaluate(() => document.querySelector('#app').inert), true, '#app inerte com a folha aberta');
  await p.evaluate(() => aviso('teste', { acao: 'Desfazer', fn: () => {} }));
  await p.waitForSelector('.aviso'); await sleep(400);
  const r = await p.evaluate(() => {
    const t = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    return { aviso: t('.aviso'), salvar: t('#nv-salvar'), folha: t('.folha.aberta') };
  });
  const cruza = (x, y) => x.l < y.r && x.r > y.l && x.t < y.b && x.b > y.t;
  assert.ok(!cruza(r.aviso, r.salvar), 'o aviso não cobre o Salvar: ' + JSON.stringify(r));
  assert.ok(!cruza(r.aviso, r.folha), 'o aviso não cobre o painel: ' + JSON.stringify(r));
  assert.ok(r.aviso.r <= r.folha.l + 1, 'o aviso fica à esquerda do painel');
  await p.keyboard.press('Escape'); await semFolha(p);
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('com-folha')), false, 'sem com-folha depois de fechar');
  assert.equal(await p.evaluate(() => document.querySelector('#app').inert), false, '#app volta ao normal');
  await p.close();

  const c = await abrir(a, CEL, montarPagina(a, 'avisos-cel'));
  await pronto(c);
  await c.tap('.inf-mais'); await folhaAberta(c);
  await c.evaluate(() => aviso('teste', { acao: 'Desfazer', fn: () => {} }));
  await c.waitForSelector('.aviso'); await sleep(400);
  const t = await c.evaluate(() => ({ aviso: document.querySelector('.aviso').getBoundingClientRect().top, folha: document.querySelector('.folha.aberta').getBoundingClientRect().top }));
  assert.ok(t.aviso < t.folha, 'no celular o aviso fica acima da folha: ' + JSON.stringify(t));
  assert.equal(await c.evaluate(() => document.documentElement.classList.contains('com-folha')), true);
  await c.close();
});

await caso('2.8.1 repetir até dezembro: pede confirmação antes de substituir e o Desfazer devolve dezembro', async () => {
  const dados = { nome: 'Repetir', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'rp1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: { mercado: { 11: 300, 12: 500 } } } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'repetir-confirma'));
  await pronto(p);
  const planos = () => JSON.stringify(a.servidor.planilha.ler('orcamento'));
  const antes = planos();
  await p.evaluate(() => abrirCategoria('mercado', 2026, 11)); await folhaAberta(p);
  await substituir(p, '#fc-plano', '400');
  await p.$eval('#fc-plano', (e) => e.dispatchEvent(new Event('change', { bubbles: true })));
  await sincronizado(p);
  await p.click('[data-f="repetir"]'); await sleep(250); await sincronizado(p);
  assert.equal(await p.$eval('[data-f="repetir"]', (e) => e.textContent), 'Substituir 1 plano? Toque de novo');
  const dez = await p.evaluate(() => planoExp('mercado', 2026, 12));
  assert.equal(dez, 500, 'dezembro não foi gravado no primeiro clique');
  await p.click('[data-f="repetir"]'); await sleep(250); await sincronizado(p);
  assert.deepEqual(await p.evaluate(() => [planoExp('mercado', 2026, 11), planoExp('mercado', 2026, 12)]), [400, 400]);
  assert.ok(planos() !== antes, 'planilha mudou');
  await p.waitForSelector('.aviso-acao'); await p.click('.aviso-acao'); await sleep(250); await sincronizado(p);
  // O campo de plano já gravou 400 em novembro ao sair do campo (change); o Desfazer do “repetir” devolve o que havia antes dele: 400 e 500.
  assert.deepEqual(await p.evaluate(() => [planoExp('mercado', 2026, 11), planoExp('mercado', 2026, 12)]), [400, 500], 'Desfazer devolve dezembro (500) e novembro como estava antes do repetir');
  assert.equal(await p.evaluate(() => planoExp('mercado', 2026, 12)), 500);
  await p.close();
});

/** Abre a folha de uma categoria pela lista de Ajustes › Categorias. */
const abrirCatNaFolha = async (p, id) => {
  await irPara(p, 'ajustes', 'categorias');
  await p.$eval(`[data-acao="cat-editar"][data-cat="${id}"]`, (e) => e.click()); await folhaAberta(p);
};
const grupoNaFolha = (p) => p.$eval('.folha [data-f="grupo"][aria-pressed="true"]', (e) => e.dataset.v);
const escolherGrupo = async (p, g) => { await p.$eval(`.folha [data-f="grupo"][data-v="${g}"]`, (e) => e.click()); await sleep(250); await sincronizado(p); };

await caso('2.8.1 grupo protegido: com lançamentos não vira renda; Fixos↔Variáveis tem Desfazer; sem lançamentos pode virar renda', async () => {
  const dados = { nome: 'Grupo', categorias: [...catsBase(), { id: 'lazer', nome: 'Lazer', grupo: 'variavel', ordem: 4 }], anos: { 2026: { lancamentos: [
    { id: 'gp1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
    { id: 'gp2', mes: 11, dia: 2, categoriaId: 'mercado', descricao: '', valor: 50 },
    { id: 'gp3', mes: 11, dia: 3, categoriaId: 'aluguel', descricao: '', valor: 300 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'grupo-protegido'));
  await pronto(p);
  const cats = () => JSON.stringify(a.servidor.planilha.ler('categorias'));
  const antes = cats();
  await abrirCatNaFolha(p, 'mercado');
  await escolherGrupo(p, 'renda');
  assert.equal(await grupoNaFolha(p), 'variavel', 'o botão volta para Variáveis');
  assert.ok(await p.$('.aviso.erro'), 'aviso de erro');
  assert.equal(cats(), antes, 'categorias não mudou');
  await fecharFolhas(p);
  // Fixos -> Variáveis
  await abrirCatNaFolha(p, 'aluguel');
  await escolherGrupo(p, 'variavel');
  assert.notEqual(cats(), antes, 'a troca Fixos para Variáveis foi gravada');
  assert.equal(await p.evaluate(() => catPorId('aluguel').grupo), 'variavel');
  assert.equal(await grupoNaFolha(p), 'variavel');
  await p.waitForSelector('.aviso-acao'); await p.click('.aviso-acao'); await sleep(250); await sincronizado(p);
  assert.equal(await p.evaluate(() => catPorId('aluguel').grupo), 'fixo', 'Desfazer volta');
  assert.equal(await grupoNaFolha(p), 'fixo', 'a folha acompanha o Desfazer');
  assert.equal(cats(), antes);
  await fecharFolhas(p);
  // sem lançamentos -> renda
  await abrirCatNaFolha(p, 'lazer');
  await escolherGrupo(p, 'renda');
  assert.equal(await p.evaluate(() => catPorId('lazer').grupo), 'renda', 'sem lançamentos pode virar renda');
  assert.ok(a.servidor.planilha.ler('categorias').some((l) => l[0] === 'lazer' && l.includes('renda')), 'gravado na planilha');
  await p.close();
});

await caso('2.8.1 categoria de economia: o id vai para a config e o botão de apagar fica desabilitado, com o motivo em texto', async () => {
  const dados = { nome: 'Economia', categorias: [...catsBase(), { id: 'guardar', nome: 'Guardar', grupo: 'variavel', ordem: 4 }], anos: { 2026: { lancamentos: [
    { id: 'ec1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'categoria-economia'));
  await pronto(p); await sincronizado(p); await sleep(300); await sincronizado(p);
  const cfg = configDe(a, 'categoriaGuardar');
  assert.ok(cfg && cfg[1] === 'guardar', 'config gravada: ' + JSON.stringify(a.servidor.planilha.ler('config')));
  await abrirCatNaFolha(p, 'guardar');
  assert.equal(await p.$eval('#fc-apagar', (e) => e.disabled), true, 'apagar desabilitado');
  assert.match(await p.$eval('#fc-motivo', (e) => e.textContent), /categoria de economia/);
  await fecharFolhas(p);
  await abrirCatNaFolha(p, 'mercado');
  assert.equal(await p.$eval('#fc-apagar', (e) => e.disabled), false, 'outra categoria sem lançamentos continua apagável');
  assert.equal(await p.$eval('#fc-motivo', (e) => e.textContent), '');
  await p.close();
});

await caso('2.8.1 importação: prévia com o que fica de fora; Substituir tudo exige digitar SUBSTITUIR', async () => {
  const dados = { nome: 'Importar', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'im0', mes: 11, dia: 1, categoriaId: 'salario', descricao: 'antigo', valor: 1000 },
    { id: 'im00', mes: 11, dia: 2, categoriaId: 'mercado', descricao: 'antigo 2', valor: 10 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const arq = path.join(SAIDA, 'importar-2-8-1.json');
  fs.mkdirSync(SAIDA, { recursive: true });
  fs.writeFileSync(arq, JSON.stringify({
    versao: 3, app: 'bsdesenv-financas', nome: 'Importado',
    categorias: [
      { id: 'ia', nome: 'Alfa', grupo: 'variavel', ordem: 1 },
      { id: 'ib', nome: 'Beta', grupo: 'renda', ordem: 2 },
      { id: 'ic', nome: '', grupo: 'variavel', ordem: 3 },
    ],
    anos: { 2026: { lancamentos: [
      { id: 'n1', mes: 3, dia: 5, categoriaId: 'ia', descricao: 'um', valor: 10 },
      { id: 'n2', mes: 4, dia: 6, categoriaId: 'ia', descricao: 'dois', valor: 20 },
      { id: 'n3', mes: 5, dia: 7, categoriaId: 'ib', descricao: 'tres', valor: 30 },
      { id: 'n4', mes: 2, dia: 31, categoriaId: 'ia', descricao: 'quatro', valor: 40 },
    ], orcamento: {} } },
  }));
  const p = await abrir(a, PC, montarPagina(a, 'importar-previa'));
  await pronto(p);
  await p.evaluate(() => abrirImportar()); await folhaAberta(p);
  const input = await p.$('#im-arquivo');
  await input.uploadFile(arq);
  await p.waitForSelector('#im-aceitos');
  await p.waitForFunction(() => document.querySelector('#im-aceitos').textContent.includes('Vão entrar'));
  const txt = await p.$eval('#im-aceitos', (e) => e.textContent);
  assert.ok(txt.includes('Vão entrar 2 categorias e 3 lançamentos'), txt);
  assert.ok(txt.includes('2 itens ficam de fora'), txt);
  assert.ok(/sem nome/.test(txt) && /dia inválido/.test(txt), 'motivos: ' + txt);
  assert.equal(await p.$eval('#im-botao', (e) => e.disabled), false, 'Juntar: botão habilitado');
  await p.click('input[name="im-modo"][value="substituir"]'); await sleep(100);
  assert.equal(await p.$eval('#im-substituir', (e) => e.hidden), false, 'área de confirmação visível');
  assert.ok((await p.$eval('#im-substituir', (e) => e.textContent)).includes('Baixar backup agora'));
  assert.equal(await p.$eval('#im-botao', (e) => e.disabled), true, 'desabilitado até digitar');
  await p.type('#im-confirma', 'SUBSTITUIR'); await sleep(100);
  assert.equal(await p.$eval('#im-botao', (e) => e.disabled), false, 'habilitado depois de digitar');
  assert.equal(await p.$eval('#im-botao', (e) => e.textContent), 'Substituir tudo');
  await p.click('#im-botao'); await semFolha(p); await sincronizado(p);
  const linhas = a.linhas();
  assert.equal(linhas.length, 3, 'só os 3 válidos: ' + JSON.stringify(linhas));
  assert.deepEqual(linhas.map((l) => l[0]).sort(), ['n1', 'n2', 'n3']);
  await p.waitForSelector('.aviso .aviso-txt');
  const fim = await textoAviso(p);
  assert.ok(fim.includes('Importação concluída') && fim.includes('de fora'), fim);
  await p.close();
});

await caso('2.8.1 Ctrl+Z: dois lançamentos rápidos saem da planilha, na ordem inversa', async () => {
  const dados = { nome: 'CtrlZ', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'cz1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'ctrl-z'));
  await pronto(p);
  const tem = (v) => a.linhas().some((l) => l[6] === v);
  for (const t of ['10 mercado a', '20 mercado b']) {
    await p.click('#quick'); await p.type('#quick', t); await p.keyboard.press('Enter'); await sincronizado(p); await sleep(250);
  }
  assert.ok(tem(10) && tem(20), 'os dois gravados');
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.down('Control'); await p.keyboard.press('KeyZ'); await p.keyboard.up('Control');
  await sleep(300); await sincronizado(p);
  assert.ok(!tem(20) && tem(10), 'o primeiro Ctrl+Z tira o último (20), não o 10');
  await p.keyboard.down('Control'); await p.keyboard.press('KeyZ'); await p.keyboard.up('Control');
  await sleep(300); await sincronizado(p);
  assert.ok(!tem(20) && !tem(10), 'o segundo tira o 10');
  assert.equal(a.linhas().length, 1, 'sobrou só o salário');
  await p.close();
});

/* ---------- 3.0.0 ---------- */
const numDe = (t) => Number(t.replace(/[^\d,−-]/g, '').replace(',', '.').replace('−', '-'));
/** Altura da página do Início a 390 px com os dados de exemplo, medida na versão anterior (commit 488f5ed^, 2.8.x). */
const ALTURA_390 = { antiga: 3981 };

await caso('3.0.0 Início do mês atual: herói, O que falta pagar, Plano do mês, Onde foi e Últimos, sem KPIs e mais baixo no celular', async () => {
  const a = criarAmbiente(abasDoBackup(exemplo));
  const p = await abrir(a, CEL, montarPagina(a, 'v3-inicio'));
  await pronto(p);
  const ids = await p.$$eval('.grade-inicio > section h2', (els) => els.map((e) => e.id));
  assert.deepEqual(ids, ['h-livre', 'h-vencer', 'h-planos', 'h-onde', 'h-ult'], 'ordem dos cartões');
  const titulos = await p.$$eval('.grade-inicio > section h2', (els) => els.map((e) => e.textContent));
  assert.deepEqual(titulos.slice(1), ['O que falta pagar', 'Plano do mês', 'Onde foi', 'Últimos lançamentos']);
  assert.ok(titulos[0].startsWith('Disponível para gastar'), 'o herói vem primeiro');
  assert.equal(await p.$('.kpi'), null, 'sem os quatro números do topo');
  for (const antigo of ['h-ritmo', 'h-cobertura', 'h-meta', 'h-variaveis', 'h-ano']) assert.equal(await p.$('#' + antigo), null, 'saiu do Início: ' + antigo);
  const ordemY = await p.$$eval('.grade-inicio > section', (els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  assert.deepEqual(ordemY, [...ordemY].sort((x, y) => x - y), 'de cima para baixo, nesta ordem');
  const altura = await p.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  ALTURA_390.nova = altura;
  console.log(`  [3.0.0] altura da página a 390 px: ${altura} px`);
  assert.ok(altura < ALTURA_390.antiga, `a página ficou mais baixa: ${altura} < ${ALTURA_390.antiga} (2.8.x)`);
  await p.close();
});

await caso('3.0.0 Onde foi: barras do maior para o menor, com valor e percentual; clicar abre o painel da categoria', async () => {
  const a = criarAmbiente(abasDoBackup(exemplo));
  const p = await abrir(a, PC, montarPagina(a, 'v3-onde'));
  await pronto(p);
  const linhas = await p.$$eval('.g-onde .onde-linha', (els) => els.map((e) => ({
    nome: e.querySelector('.onde-nome').textContent, valor: e.querySelector('.onde-valor').childNodes[0].textContent.trim(),
    pct: e.querySelector('.onde-valor em').textContent, largura: parseFloat(e.querySelector('.onde-barra i').style.width), botao: e.tagName === 'BUTTON', cat: e.dataset.cat || '',
  })));
  assert.ok(linhas.length >= 3, 'há várias barras');
  const valores = linhas.map((l) => numDe(l.valor));
  assert.deepEqual(valores.slice(0, linhas.filter((l) => l.botao).length), [...valores.slice(0, linhas.filter((l) => l.botao).length)].sort((x, y) => y - x), 'do maior para o menor');
  const larguras = linhas.filter((l) => l.botao).map((l) => l.largura);
  assert.deepEqual(larguras, [...larguras].sort((x, y) => y - x), 'a largura das barras acompanha a ordem');
  assert.equal(larguras[0], 100, 'a maior barra ocupa tudo');
  for (const l of linhas) { assert.match(l.valor, /^R\$/, 'valor em reais'); assert.match(l.pct, /^\d+%$/, 'percentual'); }
  const total = numDe(await p.$eval('#h-onde', (e) => e.closest('section').querySelector('.cartao-topo .sub').textContent));
  linhas.forEach((l, i) => assert.equal(Number(l.pct.replace('%', '')), Math.round((valores[i] / total) * 100), `percentual de ${l.nome}`));
  const primeira = linhas.find((l) => l.botao);
  assert.ok(primeira.cat, 'a primeira barra é um botão da categoria');
  await p.click(`.onde-linha[data-cat="${primeira.cat}"]`); await folhaAberta(p);
  assert.ok((await p.$eval('.folha', (e) => e.innerText)).includes(primeira.nome), 'o painel é o da categoria ' + primeira.nome);
  await p.keyboard.press('Escape'); await semFolha(p);
  await p.close();
});

await caso('3.0.0 Planilha: gráfico do ano no topo e clicar num mês abre o Início daquele mês', async () => {
  const a = criarAmbiente(abasDoBackup(exemplo));
  const p = await abrir(a, PC, montarPagina(a, 'v3-planilha'));
  await pronto(p);
  assert.equal(await p.$('#h-ano'), null, 'o Início não tem mais o gráfico do ano');
  await irPara(p, 'planilha');
  assert.ok(await p.$('.planilha-ano #h-ano'), 'gráfico dentro de .planilha-ano');
  assert.equal(await p.$$eval('.planilha-ano .ga-mes', (e) => e.length), 12, 'doze meses');
  const [topoGrafico, topoTabela] = await p.evaluate(() => [document.querySelector('.planilha-ano').getBoundingClientRect().top, document.querySelector('.planilha-caixa').getBoundingClientRect().top]);
  assert.ok(topoGrafico < topoTabela, 'o gráfico fica acima da tabela');
  await p.click('.planilha-ano .ga-mes[data-mes="9"]');
  await p.waitForFunction(() => S.tela === 'inicio' && S.mes === 9);
  assert.equal(await p.$eval('.titulo-mes', (e) => e.textContent), 'Setembro 2026');
  assert.ok(await p.$('#h-fecho'), 'Início de mês passado (herói de fechamento)');
  await p.close();
});

await caso('3.0.0 fechamento: mês passado com pendência, folha, “Foi pago”, fechar grava fechado: e editar pede o segundo toque', async () => {
  const dados = {
    nome: 'Fechar', categorias: catsBase(),
    anos: { 2026: { lancamentos: [
      { id: 'f1', mes: 10, dia: 5, categoriaId: 'salario', descricao: '', valor: 5000 },
      { id: 'f2', mes: 10, dia: 6, categoriaId: 'mercado', descricao: 'Feira', valor: 300 },
    ], orcamento: { aluguel: { 10: 1000 }, salario: { 10: 5000 }, mercado: { 10: 400 } } } },
  };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'v3-fechar'));
  await pronto(p);
  await p.evaluate(() => irParaMes(2026, 10)); await sleep(150);
  assert.ok((await p.$eval('#h-fecho', (e) => e.closest('section').innerText)).includes('Fechar outubro'), 'o herói oferece fechar outubro');
  await p.click('[data-acao="fechar-mes"][data-foco="fechar-mes"]'); await folhaAberta(p);
  assert.equal(await p.$eval('#fech-ok', (e) => e.disabled), true, 'com pendência, o botão de fechar fica desligado');
  const item = await p.$eval('.fech-item', (e) => e.innerText);
  assert.ok(item.includes('Aluguel') && item.includes('Foi pago') && item.includes('Não aconteceu') && item.includes('Depois'), 'a pendência e as três saídas');
  await p.click('.fech-item [data-f="feito"]'); await sincronizado(p);
  assert.ok(a.linhas().some((l) => l[4] === 'aluguel' && l[2] === 10 && l[6] === 1000), 'o aluguel foi lançado em outubro');
  assert.equal(await p.$eval('#fech-ok', (e) => e.disabled), false, 'sem pendências o botão liga');
  assert.ok((await p.$eval('#fech-sobra', (e) => e.textContent)).includes(moeda(3700)), 'sobra realizada 5.000 − 300 − 1.000');
  await p.click('#fech-ok'); await semFolha(p); await sincronizado(p);
  const marca = configDe(a, 'fechado:2026-10');
  assert.ok(marca && Number(marca[1]) === 3700, 'linha fechado: na config ' + JSON.stringify(marca));
  assert.ok((await p.$eval('#h-fecho', (e) => e.textContent)).includes('Mês fechado'), 'o herói mostra a marca de mês fechado');
  // editar um lançamento daquele mês: primeiro toque avisa, segundo grava
  await irPara(p, 'extrato');
  await p.click('#extrato-lista .linha-lanc[data-id="f2"]'); await folhaAberta(p);
  await substituir(p, '#ed-valor', '350');
  await p.click('.folha [data-f="salvar"]'); await sleep(200);
  assert.ok((await p.$eval('#ed-erro', (e) => e.textContent)).includes('está fechado. Toque de novo'), 'pede o segundo toque');
  assert.equal(a.linhas().find((l) => l[0] === 'f2')[6], 300, 'nada gravado no primeiro toque');
  await p.click('.folha [data-f="salvar"]'); await semFolha(p); await sincronizado(p);
  assert.equal(a.linhas().find((l) => l[0] === 'f2')[6], 350, 'o segundo toque grava');
  await esperar(() => Number((configDe(a, 'fechado:2026-10') || [])[1]) === 3650);
  await p.close();
});

await caso('3.0.0 seletor de mês: março de 2025 pela folha; e a página abre direto com ?tela=mes&ano=2026&mes=3', async () => {
  const a = criarAmbiente(abasDoBackup(exemplo));
  const url0 = montarPagina(a, 'v3-seletor');
  const p = await abrir(a, PC, url0);
  await pronto(p);
  assert.equal(await p.$eval('.titulo-mes', (e) => e.getAttribute('data-acao')), 'seletor-mes');
  await p.click('[data-acao="seletor-mes"]'); await folhaAberta(p);
  assert.equal(await p.$$eval('.seletor-grade .mes-opcao', (e) => e.length), 12, 'doze meses');
  assert.equal(await p.$eval('.seletor-ano strong', (e) => e.textContent), '2026');
  await p.click('[data-f="ano-ant"]'); await sleep(60);
  assert.equal(await p.$eval('.seletor-ano strong', (e) => e.textContent), '2025', 'ano anterior');
  await p.click('.seletor-grade [data-m="3"]'); await semFolha(p);
  assert.equal(await p.$eval('.titulo-mes', (e) => e.textContent), 'Março 2025');
  assert.equal(await p.evaluate(() => [S.ano, S.mes]).then((x) => x.join('-')), '2025-3');
  assert.match(await p.evaluate(() => location.search), /ano=2025/, 'o endereço acompanha o mês');
  assert.match(await p.evaluate(() => location.search), /mes=3/);
  await p.click('[data-acao="seletor-mes"]'); await folhaAberta(p);
  await p.click('[data-f="hoje"]'); await semFolha(p);
  assert.equal(await p.$eval('.titulo-mes', (e) => e.textContent), 'Novembro 2026', '“Hoje” volta ao mês atual');
  await p.close();
  // link direto (a query funciona em file:)
  const q = await abrir(a, PC, url0 + '?tela=mes&ano=2026&mes=3');
  await pronto(q);
  assert.equal(await q.evaluate(() => [S.tela, S.ano, S.mes].join('-')), 'mes-2026-3', 'a tela e o mês do link');
  assert.equal(await q.$eval('.titulo-mes', (e) => e.textContent), 'Março 2026');
  await q.close();
});

await caso('3.0.0 Planejar: “salvo” ao lado do campo, “Copiar de” com duas opções e médias só no segundo toque', async () => {
  const dados = {
    nome: 'Planejar', categorias: [
      { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 1 },
      { id: 'lazer', nome: 'Lazer', grupo: 'variavel', ordem: 2 },
      { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 3 },
    ],
    anos: { 2026: { lancamentos: [], orcamento: { mercado: { 10: 900 } } } },
  };
  for (const mes of [8, 9, 10]) {
    dados.anos[2026].lancamentos.push({ id: 'pm' + mes, mes, dia: 5, categoriaId: 'mercado', descricao: '', valor: 1000 });
    dados.anos[2026].lancamentos.push({ id: 'pl' + mes, mes, dia: 6, categoriaId: 'lazer', descricao: '', valor: 200 });
  }
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'v3-planejar'));
  await pronto(p);
  await irPara(p, 'mes');
  await p.click('[data-modo="planejar"]'); await sleep(100);
  assert.equal(await p.$('.plano-salvo'), null, 'antes de digitar não há “salvo”');
  await substituir(p, '#pl-mercado', '150');
  await p.keyboard.press('Tab'); await sincronizado(p);
  await p.waitForSelector('.plano-salvo');
  assert.equal(await p.$eval('.plano-salvo', (e) => e.textContent), 'salvo');
  assert.equal(await p.$eval('.plano-salvo', (e) => e.closest('.lp-campo').querySelector('#pl-mercado') !== null), true, 'ao lado do campo de Mercado');
  assert.equal(a.servidor.planilha.ler('orcamento').find((l) => l[1] === 'mercado' && l[2] === 11)[3], 150);
  await p.waitForFunction(() => !document.querySelector('.plano-salvo'), { timeout: 6000 });
  // Copiar de outubro
  assert.equal(await p.$eval('[data-acao="plano-copiar"]', (e) => e.textContent), 'Copiar de outubro');
  assert.equal(await p.$('[data-acao="plano-copiar-plano"]'), null, 'as opções só aparecem depois do toque');
  await p.click('[data-acao="plano-copiar"]'); await sleep(100);
  const opcPlano = await p.$eval('[data-acao="plano-copiar-plano"]', (e) => e.textContent);
  const opcReal = await p.$eval('[data-acao="plano-copiar-real"]', (e) => e.textContent);
  assert.ok(opcPlano.includes('Copiar o plano de outubro') && opcPlano.includes('1 categoria') && opcPlano.includes(moeda(900)), opcPlano);
  assert.ok(opcReal.includes('Copiar o lançado em outubro') && opcReal.includes('2 categorias') && opcReal.includes(moeda(1200)), opcReal);
  assert.ok(await p.$('[data-acao="plano-copiar-cancelar"]'), 'dá para cancelar');
  await p.click('[data-acao="plano-copiar-cancelar"]'); await sleep(100);
  assert.equal(await p.$('[data-acao="plano-copiar-plano"]'), null, 'cancelar fecha a escolha');
  assert.equal(a.servidor.planilha.ler('orcamento').find((l) => l[1] === 'mercado' && l[2] === 11)[3], 150, 'cancelar não grava nada');
  // Preencher com as médias: só no segundo toque
  const planosNov = () => a.servidor.planilha.ler('orcamento').filter((l) => l[2] === 11).map((l) => l.join('|')).sort().join(';');
  const antes = planosNov();
  await p.click('[data-acao="plano-media"]'); await sleep(200); await sincronizado(p);
  assert.equal(planosNov(), antes, 'o primeiro toque não grava');
  assert.ok((await p.$eval('[data-acao="plano-media"]', (e) => e.textContent)).includes('Toque de novo'), 'o botão pede o segundo toque');
  await p.click('[data-acao="plano-media"]'); await sincronizado(p); await sleep(200);
  const orc = a.servidor.planilha.ler('orcamento').filter((l) => l[2] === 11);
  assert.equal(orc.find((l) => l[1] === 'mercado')[3], 1000, 'média do mercado gravada');
  assert.equal(orc.find((l) => l[1] === 'lazer')[3], 200, 'média do lazer gravada');
  // Limpar o mês: também só no segundo toque
  await p.click('[data-acao="plano-limpar"]'); await sleep(200); await sincronizado(p);
  assert.equal(a.servidor.planilha.ler('orcamento').filter((l) => l[2] === 11).length, 2, 'o primeiro toque não limpa');
  await p.click('[data-acao="plano-limpar"]'); await sincronizado(p); await sleep(200);
  assert.equal(a.servidor.planilha.ler('orcamento').filter((l) => l[2] === 11).length, 0, 'o segundo toque limpa');
  await p.close();
});

await caso('3.0.0 primeiro acesso: o modo exemplo não grava nada e “Começar do zero” volta às boas-vindas', async () => {
  const vazio = criarAmbiente({});
  const p = await abrir(vazio, CEL, montarPagina(vazio, 'v3-exemplo'));
  await p.waitForSelector('#boasvindas:not([hidden]) .bv');
  const chavesAntes = await p.evaluate(() => Object.keys(localStorage).sort());
  await p.tap('[data-b="exemplo"]');
  await p.waitForFunction(() => S.exemplo && S.montado && !document.querySelector('#app').hidden);
  await p.waitForSelector('#faixa-exemplo');
  assert.ok((await p.$eval('#faixa-exemplo', (e) => e.innerText)).includes('Começar do zero'), 'faixa do modo exemplo');
  assert.ok(await p.$eval('.numero-heroi', (e) => e.textContent.length > 0), 'o Início mostra os dados de exemplo');
  // mexe nos dados de exemplo: lançar e planejar não podem chegar à planilha
  await p.tap('.inf-mais'); await folhaAberta(p);
  await digitarTeclado(p, ['9', '9', '0', '0']);
  await p.tap('#nv-salvar'); await semFolha(p); await sleep(400);
  await p.evaluate(() => registrar({ t: 'cfg', k: 'nome', v: 'Mudado no exemplo' }));
  await sleep(600);
  assert.equal(vazio.servidor.planilha.ler('lancamentos').length, 0, 'nenhum lançamento na planilha');
  assert.equal(vazio.servidor.planilha.ler('categorias').length, 0, 'nenhuma categoria na planilha');
  assert.equal(vazio.servidor.planilha.ler('orcamento').length, 0, 'nenhum plano na planilha');
  assert.ok(!vazio.servidor.planilha.ler('config').some((l) => l[1] === 'Mudado no exemplo'), 'a config não mudou');
  const chavesDepois = await p.evaluate(() => Object.keys(localStorage).sort());
  assert.deepEqual(chavesDepois, chavesAntes, 'nada novo no localStorage (cache e fila ficam de fora)');
  assert.equal(await p.evaluate(() => S.fila.length), 0, 'a fila de envio fica vazia');
  await p.tap('[data-acao="sair-exemplo"]');
  await p.waitForSelector('#boasvindas:not([hidden]) .bv');
  assert.equal(await p.$('#faixa-exemplo'), null, 'a faixa some');
  assert.equal(await p.$eval('#app', (e) => e.hidden), true, 'o app fica escondido atrás das boas-vindas');
  assert.ok((await p.$eval('#boasvindas', (e) => e.innerText)).includes('Bem-vindo'), 'volta ao passo 1');
  await sleep(300);
  assert.equal(vazio.servidor.planilha.ler('lancamentos').length + vazio.servidor.planilha.ler('categorias').length, 0, 'a planilha continua vazia');
  assert.deepEqual(await p.evaluate(() => Object.keys(localStorage).sort()), chavesAntes, 'localStorage igual ao do começo');
});

const REPETICOES_SEU_MES = 3;
for (let rodada = 1; rodada <= REPETICOES_SEU_MES; rodada++) {
  await caso(`3.0.0 primeiro acesso: passo “Seu mês” preenchido grava renda, moradia, meta e o gasto anterior (execução ${rodada}/${REPETICOES_SEU_MES})`, async () => {
    const vazio = criarAmbiente({});
    const p = await abrir(vazio, CEL, montarPagina(vazio, 'v3-seu-mes-' + rodada));
    await p.waitForSelector('#boasvindas:not([hidden]) .bv');
    await p.type('#bv-nome', 'Meu mês');
    await p.tap('[data-b="avancar"]'); await sleep(100);
    await p.tap('input[value="familia"]');
    await p.tap('[data-b="seu-mes"]');
    await p.waitForSelector('#bv-renda');
    assert.equal(await p.$eval('h1', (e) => e.textContent), 'Seu mês');
    assert.ok(await p.$('#bv-moradia'), 'o modelo tem Moradia, então o campo aparece');
    await digitarValor(p, '#bv-renda', '7.900');
    await digitarValor(p, '#bv-moradia', '1.850');
    await digitarValor(p, '#bv-meta', '500');
    await digitarValor(p, '#bv-gasto', '320');
    assert.deepEqual(await p.evaluate(() => ['renda', 'moradia', 'meta', 'gasto'].map((k) => document.querySelector('#bv-' + k).value)), ['7.900', '1.850', '500', '320'], 'os quatro campos ficaram como digitados');
    await p.tap('[data-b="concluir"]');
    await p.waitForFunction(() => S.montado && !document.querySelector('#app').hidden);
    await sincronizado(p);
    await sleep(150);
    const cats = vazio.servidor.planilha.ler('categorias');
    const idDe = (nome) => (cats.find((l) => l[1] === nome) || [])[0];
    const plano = (nome) => (vazio.servidor.planilha.ler('orcamento').find((l) => Number(l[0]) === 2026 && l[1] === idDe(nome) && l[2] === 11) || [])[3];
    assert.equal(plano('Salário'), 7900, 'plano de renda');
    assert.equal(plano('Moradia'), 1850, 'plano de Moradia');
    assert.equal(plano('Guardar'), 500, 'plano de Guardar');
    const gasto = vazio.servidor.planilha.ler('lancamentos').filter((l) => l[5] === 'Antes de começar o app');
    assert.equal(gasto.length, 1, 'um lançamento “Antes de começar o app”');
    assert.equal(gasto[0][6], 320);
    assert.equal(gasto[0][4], idDe('Outros'));
    assert.equal(vazio.servidor.planilha.ler('orcamento').filter((l) => l[2] === 11).length, 3, 'só os três planos');
    assert.equal(await p.$eval('.numero-heroi', (e) => e.textContent), moeda(7900 - 320 - 1850 - 500), 'o herói reflete tudo');
    await p.close();
  });
}

/* ---------- 3.1.0: C (recorrências) e D (parcelas) ---------- */
/** Clica em Salvar/Criar da folha de cima (a de recorrência abre por cima da categoria). */
const salvarTopo = (p) => p.evaluate(() => { const f = [...document.querySelectorAll('.folha.aberta')].pop(); f.querySelector('[data-f="salvar"]').click(); });
const recsDe = (a) => a.servidor.planilha.ler('recorrencias');

await caso('3.1.0 recorrências: criar pela categoria, plano vem da recorrência, “Não vem em”, mudar valor com escolha, encerrar e confirmar', async () => {
  const dados = { nome: 'Recorrências', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'r1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: { salario: { 11: 5000 } } } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'recorrencias'));
  await pronto(p);
  await p.evaluate(() => abrirCategoria('aluguel', 2026, 11)); await folhaAberta(p);
  assert.ok(await p.$('#fc-rec [data-f="rec-nova"]'), 'o bloco Todo mês oferece criar');
  await p.$eval('#fc-rec [data-f="rec-nova"]', (e) => e.click());
  await p.waitForSelector('#rc-valor');
  await p.type('#rc-valor', '1200'); await p.type('#rc-dia', '25');
  await p.click('#rc-auto');
  await salvarTopo(p); await sincronizado(p);
  assert.equal(recsDe(a).length, 1, 'uma recorrência na planilha');
  assert.equal(await p.evaluate(() => [planoExp('aluguel', 2026, 11), planoExp('aluguel', 2027, 3), planoExp('aluguel', 2026, 8)]).then((x) => x.join(',')), '1200,1200,0', 'o plano vem da recorrência, só a partir do começo');
  assert.equal(a.servidor.planilha.ler('orcamento').filter((l) => l[1] === 'aluguel').length, 0, 'nada gravado no orçamento');
  assert.ok((await p.$eval('#fc-rec', (e) => e.textContent)).includes('sai sozinha dia 25'), await p.$eval('#fc-rec', (e) => e.textContent));
  // Não vem em novembro, e Desfazer
  await p.$eval('#fc-rec [data-f="rec-pular"]', (e) => e.click()); await sincronizado(p);
  assert.ok(a.servidor.planilha.ler('config').some((l) => String(l[0]).startsWith('pular:2026-11:') && String(l[1]) === '1'), 'marca pular gravada');
  assert.equal(await p.evaluate(() => planoExp('aluguel', 2026, 11)), 0, 'novembro sem a conta');
  await p.$eval('#fc-rec [data-f="rec-voltar"]', (e) => e.click()); await sincronizado(p);
  assert.ok(!a.servidor.planilha.ler('config').some((l) => String(l[0]).startsWith('pular:') && String(l[1]) === '1'), 'marca apagada');
  assert.equal(await p.evaluate(() => planoExp('aluguel', 2026, 11)), 1200);
  // em dezembro: mudar o valor abre a escolha inline e “De dezembro em diante” parte a recorrência
  await p.evaluate(() => fecharFolha()); await semFolha(p);
  await p.evaluate(() => abrirCategoria('aluguel', 2026, 12)); await folhaAberta(p);
  await p.$eval('#fc-rec [data-f="rec-editar"]', (e) => e.click());
  await p.waitForSelector('#rc-valor');
  await p.$eval('#rc-valor', (e) => { e.value = ''; });
  await p.type('#rc-valor', '1300');
  await salvarTopo(p);
  await p.waitForSelector('#rc-escolha [data-f="em-diante"]');
  assert.equal(await p.$('#rc-escolha [data-f="so-mes"]') !== null, true, 'mês sem plano gravado oferece “Só em”');
  await p.$eval('#rc-escolha [data-f="em-diante"]', (e) => e.click()); await p.waitForSelector('#rc-valor', { hidden: true }); await sincronizado(p);
  assert.equal(recsDe(a).length, 2, 'a antiga foi encerrada e há uma nova');
  assert.equal(await p.evaluate(() => [planoExp('aluguel', 2026, 11), planoExp('aluguel', 2026, 12), planoExp('aluguel', 2027, 1)].join(',')), '1200,1300,1300');
  // encerrar
  await p.$eval('#fc-rec [data-f="rec-encerrar"]', (e) => e.click()); await sincronizado(p);
  assert.equal(await p.evaluate(() => [planoExp('aluguel', 2026, 11), planoExp('aluguel', 2026, 12), planoExp('aluguel', 2027, 1)].join(',')), '1200,0,0', 'a nova ainda nem tinha começado: some, e a antiga continua até novembro');
  // Desfazer do aviso devolve
  await p.$eval('.aviso .aviso-acao', (e) => e.click()); await sincronizado(p);
  assert.equal(await p.evaluate(() => planoExp('aluguel', 2026, 12)), 1300, 'Desfazer devolve a recorrência');
  await p.close();
});

await caso('3.1.0 recorrências: fim gravado além de 60 meses do começo continua selecionado ao abrir em Editar e salvar sem mudança', async () => {
  const dados = { nome: 'Fim antigo', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'r1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: { salario: { 11: 5000 } } } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'recorrencia-fim-antigo'));
  await pronto(p);
  await p.evaluate(() => registrar({ t: 'rec', r: { id: 'antiga', categoriaId: 'aluguel', valor: 800, dia: 5, automatico: false, descricao: '', inicio: 202101, fim: null } }));
  await sincronizado(p);
  await p.evaluate(() => abrirCategoria('aluguel', 2026, 11)); await folhaAberta(p);
  await p.$eval('#fc-rec [data-f="rec-encerrar"]', (e) => e.click()); await sincronizado(p);
  assert.equal(Number(recsDe(a)[0][6]), 202610, 'encerrada até outubro, com começo há mais de 5 anos');
  await p.evaluate(() => fecharFolha()); await semFolha(p);
  await p.evaluate(() => abrirCategoria('aluguel', 2026, 10)); await folhaAberta(p);
  await p.$eval('#fc-rec [data-f="rec-editar"]', (e) => e.click());
  await p.waitForSelector('#rc-valor');
  assert.equal(await p.$eval('#rc-fim', (e) => e.value), '202610', 'o fim gravado existe como opção e fica selecionado');
  await salvarTopo(p);
  await p.waitForSelector('#rc-valor', { hidden: true }); await sincronizado(p);
  assert.equal(recsDe(a).length, 1, 'continua uma recorrência só');
  assert.equal(Number(recsDe(a)[0][6]), 202610, 'salvar sem mudar nada mantém o fim');
  await p.close();
});

await caso('3.1.0 recorrências: “De mês em diante” numa recorrência que já termina antes do mês não cria recorrência sem fim', async () => {
  const dados = { nome: 'Termina antes', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'r1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: { salario: { 11: 5000 } } } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'recorrencia-termina-antes'));
  await pronto(p);
  await p.evaluate(() => registrar({ t: 'rec', r: { id: 'termina', categoriaId: 'aluguel', valor: 800, dia: 5, automatico: false, descricao: '', inicio: 202601, fim: 202610 } }));
  await sincronizado(p);
  await p.evaluate(() => abrirCategoria('aluguel', 2026, 10)); await folhaAberta(p);
  await p.$eval('#fc-rec [data-f="rec-editar"]', (e) => e.click());
  await p.waitForSelector('#rc-valor');
  await p.$eval('#rc-valor', (e) => { e.value = ''; });
  await p.type('#rc-valor', '1300');
  await salvarTopo(p);
  await p.waitForSelector('#rc-escolha [data-f="em-diante"]');
  await p.$eval('#rc-escolha [data-f="em-diante"]', (e) => e.click());
  await p.waitForSelector('#rc-valor', { hidden: true }); await sincronizado(p);
  assert.equal(recsDe(a).length, 1, 'nenhuma recorrência nova: o valor novo não entra porque a antiga já termina antes de novembro');
  assert.equal(Number(recsDe(a)[0][6]), 202610, 'o fim da antiga continua outubro');
  assert.equal(await p.evaluate(() => [planoExp('aluguel', 2026, 10), planoExp('aluguel', 2026, 11), planoExp('aluguel', 2026, 12)].join(',')), '800,0,0', 'nada depois de outubro');
  await p.close();
});

await caso('3.1.0 recorrências: o que falta pagar mostra o vencimento, e o fechamento confirma todas as automáticas de uma vez', async () => {
  const dados = { nome: 'Vencimentos', categorias: [
    { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 }, { id: 'luz', nome: 'Luz', grupo: 'fixo', ordem: 2 },
    { id: 'net', nome: 'Internet', grupo: 'fixo', ordem: 3 }, { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 4 },
  ], anos: { 2026: { lancamentos: [{ id: 'v1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 }], orcamento: { salario: { 11: 5000 } } } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'recorrencias-venc'));
  await pronto(p);
  await p.evaluate(() => {
    const base = { descricao: '', inicio: 202601, fim: null };
    registrar({ t: 'rec', r: { id: 'ra', categoriaId: 'aluguel', valor: 900, dia: 10, automatico: false, ...base } });
    registrar({ t: 'rec', r: { id: 'rb', categoriaId: 'luz', valor: 150, dia: 25, automatico: true, ...base } });
    registrar({ t: 'rec', r: { id: 'rc', categoriaId: 'net', valor: 100, dia: 28, automatico: true, ...base } });
  });
  await sincronizado(p); await sleep(200);
  const cartao = await p.$eval('.g-pagar', (e) => e.textContent);
  assert.ok(cartao.includes('atrasada desde dia 10'), cartao);
  assert.ok(cartao.includes('sai sozinha dia 25') && cartao.includes('sai sozinha dia 28'), cartao);
  const ordem = await p.$$eval('.g-pagar .iv-venc', (els) => els.length);
  assert.ok(ordem >= 1, 'a atrasada tem o selo');
  // fechamento de novembro: botão “todas as automáticas”
  await p.evaluate(() => abrirFechamento(2026, 11)); await folhaAberta(p);
  const botao = await p.$('[data-f="todas-auto"]');
  assert.ok(botao, 'botão de confirmar as automáticas');
  assert.ok((await p.$eval('[data-f="todas-auto"]', (e) => e.textContent)).includes('(2)'));
  const antes = a.linhas().length;
  await p.click('[data-f="todas-auto"]'); await sincronizado(p);
  assert.equal(a.linhas().length, antes + 2, 'dois lançamentos');
  assert.deepEqual(a.linhas().filter((l) => ['luz', 'net'].includes(l[4])).map((l) => l[6]).sort((x, y) => x - y), [100, 150]);
  await p.$eval('.aviso .aviso-acao', (e) => e.click()); await sincronizado(p);
  assert.equal(a.linhas().length, antes, 'um Desfazer devolve os dois');
  await p.close();
});

await caso('3.1.0 parcelas: Parcelar no Novo, prévia, N lançamentos, Desfazer único', async () => {
  const dados = { nome: 'Parcelas', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'pa', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'parcelas'));
  await pronto(p);
  await p.click('[data-foco="novo-topo"]'); await folhaAberta(p);
  await p.type('#nv-texto', '1200,55 geladeira');
  await p.click('[data-f="cat"][data-v="mercado"]');
  await p.click('[data-f="parcelar"]');
  await p.waitForSelector('#nv-parc:not([hidden])');
  await p.$eval('#nv-n', (e) => { e.value = ''; });
  await p.type('#nv-n', '10');
  const previa = await p.$eval('#nv-previa', (e) => e.textContent);
  assert.ok(previa.includes('10×') && previa.includes('120,10') && previa.includes('120,05') && previa.includes('1.200,55'), previa);
  assert.equal(await p.$eval('#nv-salvar', (e) => e.textContent), 'Salvar 10× · ' + moeda(1200.55));
  await p.click('#nv-salvar'); await semFolha(p); await sincronizado(p);
  const parcelas = a.linhas().filter((l) => /^p[a-z0-9]{10}-\d{2}$/.test(l[0]));
  assert.equal(parcelas.length, 10, 'dez lançamentos');
  assert.equal(Math.round(parcelas.reduce((s, l) => s + l[6], 0) * 100), 120055, 'a soma fecha no total');
  assert.deepEqual(parcelas.map((l) => l[5]).slice(0, 2).sort(), ['geladeira (1/10)', 'geladeira (2/10)']);
  const meses = parcelas.map((l) => l[1] * 100 + l[2]).sort((x, y) => x - y);
  assert.equal(meses[0], 202612, 'a primeira, por padrão, no mês seguinte');
  assert.equal(meses[9], 202709);
  await p.$eval('.aviso .aviso-acao', (e) => e.click()); await sincronizado(p);
  assert.equal(a.linhas().filter((l) => /^p[a-z0-9]{10}-\d{2}$/.test(l[0])).length, 0, 'um Desfazer apaga as dez');
  await p.close();
});

await caso('3.1.0 parcelas: “1200x10” abre o Novo já parcelado; editar “nesta e nas próximas”; apagar uma; Duplicar', async () => {
  const dados = { nome: 'Parcelas 2', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'pb', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'parcelas-2'));
  await pronto(p);
  await p.click('#quick');
  await p.type('#quick', '1200x4 geladeira');
  await p.keyboard.press('Enter');
  await folhaAberta(p);
  assert.equal(await p.$eval('#nv-parc', (e) => e.hidden), false, 'o painel de parcelas já vem aberto');
  assert.equal(await p.$eval('#nv-n', (e) => e.value), '4');
  await p.click('[data-f="cat"][data-v="mercado"]');
  await p.click('#nv-salvar'); await semFolha(p); await sincronizado(p);
  const pegar = () => a.linhas().filter((l) => /^p[a-z0-9]{10}-\d{2}$/.test(l[0])).sort((x, y) => x[0].localeCompare(y[0]));
  assert.equal(pegar().length, 4);
  assert.deepEqual(pegar().map((l) => l[6]), [300, 300, 300, 300]);
  // editar a segunda: valor e descrição, nesta e nas próximas
  const id2 = pegar()[1][0];
  await p.evaluate((i) => abrirEditar(i), id2); await folhaAberta(p);
  assert.ok((await p.$eval('.folha.aberta', (e) => e.textContent)).includes('parcela 2 de 4'));
  assert.equal(await p.$('[data-f="duplicar"]'), null, 'parcela não oferece Duplicar');
  await p.$eval('#ed-valor', (e) => { e.value = ''; }); await p.type('#ed-valor', '250');
  await p.$eval('#ed-desc', (e) => { e.value = ''; }); await p.type('#ed-desc', 'fogão');
  await p.click('[data-f="salvar"]');
  await p.waitForSelector('#ed-escolha [data-f="com-proximas"]');
  assert.ok((await p.$eval('#ed-escolha', (e) => e.textContent)).includes('Nesta e nas próximas (2)'));
  await p.click('#ed-escolha [data-f="com-proximas"]'); await semFolha(p); await sincronizado(p);
  assert.deepEqual(pegar().map((l) => l[6]), [300, 250, 250, 250]);
  assert.deepEqual(pegar().map((l) => l[5]), ['geladeira (1/4)', 'fogão (2/4)', 'fogão (3/4)', 'fogão (4/4)']);
  await p.$eval('.aviso .aviso-acao', (e) => e.click()); await sincronizado(p);
  assert.deepEqual(pegar().map((l) => l[6]), [300, 300, 300, 300], 'Desfazer devolve as três');
  // apagar só uma
  await p.evaluate((i) => abrirEditar(i), pegar()[2][0]); await folhaAberta(p);
  await p.click('[data-f="apagar"]');
  await p.waitForSelector('#ed-escolha [data-f="apagar-esta"]');
  await p.click('#ed-escolha [data-f="apagar-esta"]'); await semFolha(p); await sincronizado(p);
  assert.equal(pegar().length, 3);
  // Duplicar um lançamento comum
  const antes = a.linhas().length;
  await p.evaluate(() => abrirEditar('pb')); await folhaAberta(p);
  await p.click('[data-f="duplicar"]'); await semFolha(p); await sincronizado(p);
  assert.equal(a.linhas().length, antes + 1, 'cópia gravada');
  assert.equal(a.linhas().filter((l) => l[6] === 5000).length, 2);
  await p.$eval('.aviso .aviso-acao', (e) => e.click()); await sincronizado(p);
  assert.equal(a.linhas().length, antes, 'Desfazer remove a cópia');
  // Repetir no próximo mês: cópia em dezembro, mesmo dia
  await p.evaluate(() => abrirEditar('pb')); await folhaAberta(p);
  await p.click('[data-f="prox-mes"]'); await semFolha(p); await sincronizado(p);
  assert.ok(a.linhas().some((l) => l[0] !== 'pb' && l[1] === 2026 && l[2] === 12 && l[3] === 1 && l[6] === 5000), 'cópia em dezembro, dia 1');
  // Repetir todo mês: abre a recorrência já preenchida e fecha o editar ao criar
  await p.evaluate(() => abrirEditar('pb')); await folhaAberta(p);
  await p.click('[data-f="todo-mes"]'); await p.waitForSelector('#rc-valor');
  assert.equal(numDe(await p.$eval('#rc-valor', (e) => e.value)), 5000);
  await salvarTopo(p); await semFolha(p); await sincronizado(p);
  assert.equal(recsDe(a).length, 1, 'recorrência criada a partir do lançamento');
  await p.close();
});

await caso('3.1.0 parcelas no celular: o painel Parcelar cabe na tela, sem rolagem lateral', async () => {
  const dados = { nome: 'Parcelas cel', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'pc1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, CEL, montarPagina(a, 'parcelas-cel'));
  await pronto(p);
  await p.tap('.inf-mais'); await folhaAberta(p);
  await digitarTeclado(p, ['1', '2', '0', '0']);
  await p.tap('[data-f="cat"][data-v="mercado"]');
  await p.tap('[data-f="parcelar"]');
  await p.waitForSelector('#nv-parc:not([hidden])');
  const sobra = await p.evaluate(() => { const f = document.querySelector('.folha.aberta'); return f.scrollWidth - f.clientWidth; });
  assert.ok(sobra <= 1, 'sem rolagem lateral: ' + sobra);
  await p.type('#nv-n', '10');
  assert.match(await p.$eval('#nv-previa', (e) => e.textContent), /\d+×/);
  await p.close();
});

/* ---------- 3.1.0: E (transporte de sobra), F (importar extrato) e G (backup em Ajustes) ---------- */
const linhasSobra = (a) => a.linhas().filter((l) => l[0] === 's202610');
const arquivoSintetico = (nome, conteudo) => { fs.mkdirSync(SAIDA, { recursive: true }); const arq = path.join(SAIDA, nome); fs.writeFileSync(arq, conteudo); return arq; };
const capturarDownloads = (p) => p.evaluate(() => { window.__baixados = []; window.baixar = (nome, conteudo, tipo) => { window.__baixados.push({ nome, conteudo, tipo }); }; });

await caso('3.1.0 transporte de sobra: fechar outubro leva a sobra para novembro, não conta como renda do ano, e Desfazer devolve tudo', async () => {
  const dados = { nome: 'Sobra', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'so1', mes: 10, dia: 5, categoriaId: 'salario', descricao: '', valor: 5000 },
    { id: 'so2', mes: 10, dia: 6, categoriaId: 'mercado', descricao: 'Feira', valor: 300 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'sobra'));
  await pronto(p);
  await p.evaluate(() => abrirFechamento(2026, 10)); await folhaAberta(p);
  assert.equal(await p.$eval('#fech-levar', (e) => e.hidden), false, 'com sobra, a opção de levar aparece');
  assert.ok((await p.$eval('#fech-levar-t', (e) => e.textContent)).includes('Levar ' + moeda(4700) + ' para Novembro'), await p.$eval('#fech-levar-t', (e) => e.textContent));
  assert.equal(await p.$eval('#fech-levar-cb', (e) => e.checked), true, 'já vem marcada');
  await p.click('#fech-ok'); await semFolha(p); await sincronizado(p);
  const s = linhasSobra(a);
  assert.equal(s.length, 1, 'um lançamento da sobra');
  assert.deepEqual([s[0][1], s[0][2], s[0][3], s[0][5], s[0][6]], [2026, 11, 1, 'Sobra de outubro', 4700]);
  const cfg = configDe(a, 'categoriaSobra');
  assert.ok(cfg && cfg[1], 'a categoria da sobra ficou na config');
  const cat = a.servidor.planilha.ler('categorias').find((l) => l[0] === cfg[1]);
  assert.ok(cat && cat[1] === 'Sobra do mês anterior' && cat[2] === 'renda', JSON.stringify(cat));
  const r = await p.evaluate(() => { const x = resumo(2026, 11); return { t: x.transporte, res: x.resultado }; });
  assert.equal(r.t, 4700, 'o transporte aparece em novembro');
  assert.equal(r.res, 0, 'o resultado de novembro não conta a sobra como renda nova');
  assert.equal(await p.evaluate(() => ehSobra(catPorId(S.dados.categoriaSobra))), true);
  // Desfazer devolve o lançamento, a categoria e a config
  await p.$eval('.aviso .aviso-acao', (e) => e.click()); await sincronizado(p);
  assert.equal(linhasSobra(a).length, 0, 'lançamento da sobra apagado');
  assert.ok(!a.servidor.planilha.ler('categorias').some((l) => l[0] === cfg[1]), 'categoria criada pelo fechamento removida');
  const cfg2 = configDe(a, 'categoriaSobra');
  assert.ok(!cfg2 || !cfg2[1], 'config limpa');
  await p.close();
});

await caso('3.1.0 transporte de sobra: desmarcar a caixa fecha sem levar; refechar com outro valor atualiza o lançamento', async () => {
  const dados = { nome: 'Sobra 2', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'sa1', mes: 10, dia: 5, categoriaId: 'salario', descricao: '', valor: 5000 },
    { id: 'sa2', mes: 10, dia: 6, categoriaId: 'mercado', descricao: 'Feira', valor: 300 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'sobra-2'));
  await pronto(p);
  await p.evaluate(() => abrirFechamento(2026, 10)); await folhaAberta(p);
  await p.click('#fech-levar-cb');
  await p.click('#fech-ok'); await semFolha(p); await sincronizado(p);
  assert.equal(linhasSobra(a).length, 0, 'sem levar, nada entra em novembro');
  assert.ok(configDe(a, 'fechado:2026-10'), 'o mês fechou');
  await p.evaluate(() => registrar({ t: 'lanc', l: { id: 'sa3', ano: 2026, mes: 10, dia: 8, categoriaId: 'mercado', descricao: 'Mais feira', valor: 200 } }));
  await sincronizado(p);
  await p.evaluate(() => abrirFechamento(2026, 10)); await folhaAberta(p);
  await p.click('#fech-ok'); await semFolha(p); await sincronizado(p);
  assert.equal(linhasSobra(a).length, 1);
  assert.equal(linhasSobra(a)[0][6], 4500, '5.000 − 300 − 200');
  await p.evaluate(() => registrar({ t: 'lanc', l: { id: 'sa4', ano: 2026, mes: 10, dia: 9, categoriaId: 'mercado', descricao: 'Ainda mais', valor: 100 } }));
  await sincronizado(p);
  await p.evaluate(() => abrirFechamento(2026, 10)); await folhaAberta(p);
  assert.ok((await p.$eval('#fech-levar-t', (e) => e.textContent)).includes('Atualizar a sobra levada para Novembro'), 'oferece atualizar');
  await p.click('#fech-ok'); await semFolha(p); await sincronizado(p);
  assert.equal(linhasSobra(a).length, 1, 'continua um só');
  assert.equal(linhasSobra(a)[0][6], 4400);
  await p.close();
});

const CSV_EXTRATO = [
  'Data;Descrição;Valor',
  '05/11/2026;Mercado Central;-45,90',
  '06/11/2026;Salário Empresa Alfa;5.000,00',
  '07/11/2026;Farmácia Boa Saúde;-32,10',
  '31/02/2026;Linha com data ruim;-10,00',
  '08/11/2026;Mercado Central;-45,90',
].join('\n');

await caso('3.1.0 importar extrato CSV: prévia, repetidas, categorias, sinais, Importar, reimportar tudo “já importado” e Desfazer', async () => {
  const dados = { nome: 'Extrato', categorias: [...catsBase(), { id: 'saude', nome: 'Saúde', grupo: 'variavel', ordem: 4 }], anos: { 2026: { lancamentos: [
    { id: 'ex0', mes: 11, dia: 5, categoriaId: 'mercado', descricao: 'Mercado Central', valor: 45.9 },
    { id: 'ex1', mes: 10, dia: 2, categoriaId: 'salario', descricao: 'Salário Empresa Alfa', valor: 5000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const arq = arquivoSintetico('extrato-sintetico.csv', CSV_EXTRATO);
  const p = await abrir(a, PC, montarPagina(a, 'extrato-csv'));
  await pronto(p);
  await irPara(p, 'extrato');
  await p.click('.ie-abrir'); await folhaAberta(p);
  await (await p.$('#ie-arquivo')).uploadFile(arq);
  await p.waitForSelector('#ie-previa:not([hidden])');
  assert.equal(await p.$eval('#ie-csv', (e) => e.hidden), false, 'CSV mostra o mapeamento de colunas');
  assert.deepEqual(await p.$$eval('#ie-col-data, #ie-col-desc, #ie-col-valor', (els) => els.map((e) => e.value)), ['0', '1', '2'], 'colunas adivinhadas');
  assert.equal(await p.$eval('#ie-cab', (e) => e.checked), true);
  assert.equal(await p.$$eval('.ie-linha', (e) => e.length), 5);
  const resumoTxt = await p.$eval('#ie-resumo', (e) => e.textContent);
  assert.ok(resumoTxt.includes('3 para importar') && resumoTxt.includes('2 ignoradas'), resumoTxt);
  assert.equal(await p.$$eval('.ie-linha.possivel-duplicada', (e) => e.length), 1, 'o Mercado Central de 5/11 já existe');
  assert.equal(await p.$$eval('.ie-linha.invalida', (e) => e.length), 1, 'a data inexistente é inválida');
  const sugerida = await p.$$eval('.ie-cat', (els) => els.map((e) => e.value));
  assert.ok(sugerida.includes('salario') && sugerida.includes('mercado'), 'categorias sugeridas pelo histórico: ' + sugerida);
  assert.equal(await p.$eval('#ie-botao', (e) => e.textContent), 'Importar 3 lançamentos');
  // a saída sem histórico cai na categoria padrão das saídas; escolho Saúde na linha da farmácia
  const idxFarmacia = await p.$$eval('.ie-linha', (els) => els.findIndex((e) => e.textContent.includes('Farmácia')));
  await p.select(`.ie-linha:nth-child(${idxFarmacia + 1}) .ie-cat`, 'saude');
  await p.click('#ie-botao'); await semFolha(p); await sincronizado(p);
  const novas = a.linhas().filter((l) => /^x/.test(l[0]));
  assert.equal(novas.length, 3, 'três lançamentos importados');
  const por = (d) => novas.find((l) => String(l[5]).includes(d));
  assert.equal(por('Farmácia')[6], 32.1, 'débito em gasto vira gasto positivo');
  assert.equal(por('Farmácia')[4], 'saude');
  assert.equal(por('Salário')[6], 5000);
  assert.equal(por('Salário')[4], 'salario');
  assert.equal(novas.filter((l) => String(l[5]).includes('Mercado')).length, 1, 'o segundo Mercado Central do dia 8 entrou');
  // reimportar: tudo já importado
  await p.click('.ie-abrir'); await folhaAberta(p);
  await (await p.$('#ie-arquivo')).uploadFile(arq);
  await p.waitForSelector('#ie-previa:not([hidden])');
  const r2 = await p.$eval('#ie-resumo', (e) => e.textContent);
  assert.ok(r2.includes('0 para importar') && r2.includes('já importadas antes'), r2);
  assert.equal(await p.$eval('#ie-botao', (e) => e.disabled), true);
  await p.evaluate(() => fecharFolha()); await semFolha(p);
  // Desfazer tira os três de uma vez
  await p.evaluate(() => { aviso('x'); });
  await p.close();
});

await caso('3.1.0 importar extrato CSV: Desfazer do aviso tira todos; fatura inverte o sinal; fechado pede segundo toque', async () => {
  const dados = { nome: 'Extrato 2', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'eb0', mes: 10, dia: 2, categoriaId: 'salario', descricao: 'Salário', valor: 5000 },
    { id: 'eb1', mes: 10, dia: 3, categoriaId: 'mercado', descricao: 'Feira', valor: 100 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const arq = arquivoSintetico('fatura-sintetica.csv', ['Data,Estabelecimento,Valor', '2026-11-03,Loja Alfa,120.50', '2026-11-04,Loja Beta,89.90', '2026-11-05,Pagamento recebido,-210.40'].join('\n'));
  const p = await abrir(a, PC, montarPagina(a, 'extrato-fatura'));
  await pronto(p);
  await p.evaluate(() => abrirImportarExtrato()); await folhaAberta(p);
  await (await p.$('#ie-arquivo')).uploadFile(arq);
  await p.waitForSelector('#ie-previa:not([hidden])');
  await p.click('#ie-fatura'); await sleep(150);
  const valores = await p.$$eval('.ie-valor', (els) => els.map((e) => e.textContent));
  assert.ok(valores[0].includes('120,50') && valores[0].includes('−'), 'compra positiva vira saída: ' + valores[0]);
  assert.ok(!valores[2].includes('−') && valores[2].includes('210,40'), 'pagamento vira valor positivo: ' + valores[2]);
  await p.click('#ie-botao'); await semFolha(p); await sincronizado(p);
  const novas = a.linhas().filter((l) => /^x/.test(l[0]));
  assert.equal(novas.length, 3);
  assert.equal(novas.find((l) => String(l[5]).includes('Alfa'))[6], 120.5);
  assert.deepEqual([novas.find((l) => String(l[5]).includes('Pagamento'))[4], novas.find((l) => String(l[5]).includes('Pagamento'))[6]], ['salario', 210.4], 'o valor positivo da fatura invertida cai na categoria padrão das rendas');
  await p.$eval('.aviso .aviso-acao', (e) => e.click()); await sincronizado(p);
  assert.equal(a.linhas().filter((l) => /^x/.test(l[0])).length, 0, 'um Desfazer tira os três');
  // mês fechado: importar para outubro pede o segundo toque
  await p.evaluate(() => registrar({ t: 'cfg', k: 'fechado:2026-10', v: '4900' })); await sincronizado(p);
  const arq2 = arquivoSintetico('extrato-outubro.csv', ['Data;Descrição;Valor', '10/10/2026;Compra de outubro;-50,00'].join('\n'));
  await p.evaluate(() => abrirImportarExtrato()); await folhaAberta(p);
  await (await p.$('#ie-arquivo')).uploadFile(arq2);
  await p.waitForSelector('#ie-previa:not([hidden])');
  await p.click('#ie-botao'); await sleep(200);
  assert.equal(await p.$eval('#ie-fechado', (e) => e.hidden), false, 'o aviso de mês fechado aparece');
  assert.equal(a.linhas().filter((l) => /^x/.test(l[0])).length, 0, 'nada gravado no primeiro toque');
  await p.click('#ie-botao'); await semFolha(p); await sincronizado(p);
  assert.equal(a.linhas().filter((l) => /^x/.test(l[0])).length, 1, 'o segundo toque grava');
  await p.close();
});

await caso('3.1.0 importar extrato OFX: lê FITID e conta, sem mapeamento de colunas, e não repete ao reimportar', async () => {
  const dados = { nome: 'OFX', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'of0', mes: 10, dia: 2, categoriaId: 'salario', descricao: 'Salário', valor: 5000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const ofx = [
    'OFXHEADER:100', 'DATA:OFXSGML', 'VERSION:102', 'CHARSET:1252', '', '<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS>',
    '<BANKACCTFROM><BANKID>999<ACCTID>12345-6</BANKACCTFROM>', '<BANKTRANLIST>',
    '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261103120000<TRNAMT>-80.25<FITID>SINT0001<MEMO>Padaria Sintetica</STMTTRN>',
    '<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261104120000<TRNAMT>150.00<FITID>SINT0002<MEMO>Pix recebido</STMTTRN>',
    '</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>',
  ].join('\n');
  const arq = arquivoSintetico('extrato-sintetico.ofx', ofx);
  const p = await abrir(a, PC, montarPagina(a, 'extrato-ofx'));
  await pronto(p);
  await p.evaluate(() => abrirImportarExtrato()); await folhaAberta(p);
  await (await p.$('#ie-arquivo')).uploadFile(arq);
  await p.waitForSelector('#ie-previa:not([hidden])');
  assert.equal(await p.$eval('#ie-csv', (e) => e.hidden), true, 'OFX não pede colunas');
  assert.equal(await p.$$eval('.ie-linha', (e) => e.length), 2);
  assert.equal(await p.$eval('#ie-botao', (e) => e.textContent), 'Importar 2 lançamentos');
  await p.click('#ie-botao'); await semFolha(p); await sincronizado(p);
  const novas = a.linhas().filter((l) => /^x/.test(l[0]));
  assert.equal(novas.length, 2);
  assert.equal(novas.find((l) => String(l[5]).includes('Padaria'))[6], 80.25);
  assert.deepEqual([novas.find((l) => String(l[5]).includes('Pix'))[4], novas.find((l) => String(l[5]).includes('Pix'))[6]], ['salario', 150], 'crédito cai na categoria padrão das rendas');
  await p.evaluate(() => abrirImportarExtrato()); await folhaAberta(p);
  await (await p.$('#ie-arquivo')).uploadFile(arq);
  await p.waitForSelector('#ie-previa:not([hidden])');
  assert.ok((await p.$eval('#ie-resumo', (e) => e.textContent)).includes('2 já importadas antes'));
  await p.close();
});

await caso('3.1.0 importar extrato no celular: a folha cabe na tela, sem rolagem lateral', async () => {
  const dados = { nome: 'Extrato cel', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'ec0', mes: 11, dia: 1, categoriaId: 'salario', descricao: 'Salário', valor: 5000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const arq = arquivoSintetico('extrato-cel.csv', ['Data;Descrição;Valor', '05/11/2026;Compra com um nome de estabelecimento bem comprido para quebrar linha;-1.234,56', '06/11/2026;Pix;300,00'].join('\n'));
  const p = await abrir(a, CEL, montarPagina(a, 'extrato-cel'));
  await pronto(p);
  await p.evaluate(() => abrirImportarExtrato()); await folhaAberta(p);
  await (await p.$('#ie-arquivo')).uploadFile(arq);
  await p.waitForSelector('#ie-previa:not([hidden])');
  await sleep(200);
  const sobra = await p.evaluate(() => { const f = document.querySelector('.folha.aberta'); const c = f.querySelector('.folha-corpo'); return [f.scrollWidth - f.clientWidth, c.scrollWidth - c.clientWidth, document.documentElement.scrollWidth - window.innerWidth]; });
  assert.ok(sobra.every((x) => x <= 1), 'sem rolagem lateral: ' + sobra);
  await p.close();
});

await caso('3.1.0 backup em Ajustes: último backup, JSON v3 com recorrências, dois CSV, e a prévia do backup conta recorrências', async () => {
  const dados = { nome: 'Backup', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'bk1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
    { id: 'bk2', mes: 11, dia: 3, categoriaId: 'mercado', descricao: '=cmd injetado', valor: 80 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'backup'));
  await pronto(p);
  await p.evaluate(() => registrar({ t: 'rec', r: { id: 'bkr', categoriaId: 'aluguel', valor: 900, dia: 10, automatico: false, descricao: '', inicio: 202601, fim: null } }));
  await sincronizado(p);
  await capturarDownloads(p);
  await irPara(p, 'ajustes', 'dados');
  assert.ok((await p.$eval('#aj-backup', (e) => e.textContent)).includes('nenhum neste aparelho'), 'começa sem backup');
  await p.click('[data-acao="exportar-json"]');
  const baixados = await p.evaluate(() => window.__baixados);
  assert.equal(baixados.length, 1);
  assert.match(baixados[0].nome, /^financas-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const json = JSON.parse(baixados[0].conteudo);
  assert.equal(json.versao, 3);
  assert.equal(json.recorrencias.length, 1, 'as recorrências vão no backup');
  assert.ok('categoriaSobra' in json.config, 'config leva a categoria da sobra');
  assert.match(await p.$eval('#aj-backup', (e) => e.textContent), /^Último backup: \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.$/);
  await p.click('[data-acao="exportar-csv"]');
  await p.click('[data-acao="exportar-csv-ano"]');
  const csvs = await p.evaluate(() => window.__baixados.slice(1));
  assert.equal(csvs.length, 2);
  assert.ok(csvs[0].conteudo.includes('Ano;Mês;Dia;Grupo;Categoria;Descrição;Valor') && csvs[0].conteudo.includes('cmd injetado') && !csvs[0].conteudo.includes(';=cmd'), 'lançamentos, sem célula que comece com =');
  assert.match(csvs[1].nome, /^financas-tabela-2026\.csv$/);
  assert.ok(csvs[1].conteudo.includes('Grupo;Categoria;Janeiro') && csvs[1].conteudo.includes('Total de saídas') && csvs[1].conteudo.includes('Sobra'), 'tabela do ano');
  // a prévia do backup mostra as recorrências
  const arq = arquivoSintetico('backup-com-rec.json', JSON.stringify({
    versao: 3, app: 'bsdesenv-financas', nome: 'Com rec', categorias: [{ id: 'ia', nome: 'Alfa', grupo: 'fixo', ordem: 1 }],
    anos: { 2026: { lancamentos: [], orcamento: {} } },
    recorrencias: [{ id: 'rx1', categoriaId: 'ia', valor: 50, dia: 5, automatico: false, descricao: '', inicio: 202601, fim: null }, { id: 'rx2', categoriaId: 'nao-existe', valor: 10, dia: 5, automatico: false, descricao: '', inicio: 202601, fim: null }],
  }));
  await p.evaluate(() => abrirImportar()); await folhaAberta(p);
  await (await p.$('#im-arquivo')).uploadFile(arq);
  await p.waitForFunction(() => document.querySelector('#im-aceitos')?.textContent.includes('Vão entrar'));
  const txt = await p.$eval('#im-aceitos', (e) => e.textContent);
  assert.ok(txt.includes('1 recorrência') && txt.includes('1 item fica de fora'), txt);
  await p.close();
});

/* ---------- 3.2.0: C (cartões e fatura no Mês) ---------- */
const cartoesDe = (a) => a.servidor.planilha.ler('cartoes');
const kpisDoMes = (p) => p.$$eval('.kpis-mes strong', (els) => els.map((e) => e.textContent).join('|'));
const avisoDesfazer = (p) => p.$eval('.aviso .aviso-acao', (e) => e.click());
const abrirCartaoEmAjustes = async (p, id) => {
  await irPara(p, 'ajustes', 'cartoes');
  await p.$eval(`[data-acao="cartao-editar"][data-id="${id}"]`, (e) => e.click());
  await folhaAberta(p);
};

for (const [rotuloVp, vp] of [['celular', CEL], ['PC', PC]]) {
  await caso(`3.2.0 cartão e fatura (${rotuloVp}): cadastrar, editar, apagar com Desfazer, arquivar, reativar, fatura no Mês e nome no extrato`, async () => {
    const dados = { nome: 'Cartões', categorias: catsBase(), anos: { 2026: { lancamentos: [
      { id: 'c1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
    ], orcamento: { salario: { 11: 5000 } } } } };
    const a = criarAmbiente(abasDoBackup(dados));
    const p = await abrir(a, vp, montarPagina(a, 'cartao-' + rotuloVp));
    await pronto(p);
    // cadastrar em Ajustes
    await irPara(p, 'ajustes', 'cartoes');
    assert.ok((await p.$eval('#h-cartoes-credito', (e) => e.closest('section').textContent)).includes('Nenhum cartão cadastrado'), 'começa sem cartão');
    await p.$eval('[data-acao="cartao-novo"]', (e) => e.click()); await folhaAberta(p);
    assert.ok((await p.$eval('.folha.aberta', (e) => e.textContent)).includes('Compras feitas depois do fechamento entram na fatura seguinte.'), 'texto de ajuda dos dias');
    await salvarTopo(p);
    assert.ok((await p.$eval('#cc-erro', (e) => e.textContent)).includes('nome'), 'nome é obrigatório');
    await p.type('#cc-nome', 'Cartão Azul'); await p.type('#cc-fecha', '5'); await p.type('#cc-vence', '15');
    await digitarValor(p, '#cc-limite', '2000');
    await salvarTopo(p); await semFolha(p); await sincronizado(p);
    assert.equal(cartoesDe(a).length, 1, 'um cartão na planilha');
    const [id, nome, fecha, vence, limite, ativo] = cartoesDe(a)[0];
    assert.match(String(id), /^k[a-z0-9]{10}$/);
    assert.deepEqual([nome, Number(fecha), Number(vence), Number(limite), Number(ativo)], ['Cartão Azul', 5, 15, 2000, 1]);
    const lista = await p.$eval('#h-cartoes-credito', (e) => e.closest('section').textContent);
    assert.ok(lista.includes('Cartão Azul') && lista.includes('fecha dia 5') && lista.includes('vence dia 15'), lista);
    // no Mês de novembro: sem compras, vence dia 15 e limite inteiro
    await irPara(p, 'mes');
    const sem = await p.$eval('.faturas', (e) => e.textContent);
    assert.ok(sem.includes('Sem compras nesta fatura') && sem.includes('vence dia 15') && /Limite disponível R\$\s2\.000,00/.test(sem), sem);
    assert.ok(sem.includes('A fatura já está contada nos gastos do mês; este quadro só mostra quanto vence.'), 'texto fixo contra a dupla contagem');
    // editar o nome
    await abrirCartaoEmAjustes(p, id);
    await substituir(p, '#cc-nome', 'Cartão Verde');
    await salvarTopo(p); await semFolha(p); await sincronizado(p);
    assert.equal(cartoesDe(a)[0][1], 'Cartão Verde');
    assert.ok((await p.$eval('#h-cartoes-credito', (e) => e.closest('section').textContent)).includes('Cartão Verde'));
    // sem lançamentos: Apagar com confirmação e Desfazer
    await abrirCartaoEmAjustes(p, id);
    assert.equal(await p.$('.folha.aberta [data-f="arquivar"]'), null, 'sem lançamentos não oferece Arquivar');
    await p.$eval('.folha.aberta [data-f="apagar"]', (e) => e.click());
    await p.waitForSelector('#cc-escolha [data-f="apagar-sim"]');
    assert.equal(cartoesDe(a).length, 1, 'só pedir não apaga');
    await p.$eval('#cc-escolha [data-f="apagar-sim"]', (e) => e.click()); await semFolha(p); await sincronizado(p);
    assert.equal(cartoesDe(a).length, 0, 'apagado');
    await avisoDesfazer(p); await sincronizado(p);
    assert.equal(cartoesDe(a).length, 1, 'Desfazer regrava o cartão');
    assert.equal(cartoesDe(a)[0][1], 'Cartão Verde');
    // duas compras na fatura de novembro (ids com o prefixo do cartão)
    await p.evaluate((cid) => {
      registrar({ t: 'lanc', l: { id: cid + '_la1', ano: 2026, mes: 11, dia: 15, categoriaId: 'mercado', descricao: 'Compra A', valor: 150 } });
      registrar({ t: 'lanc', l: { id: cid + '_la2', ano: 2026, mes: 11, dia: 15, categoriaId: 'mercado', descricao: 'Compra B', valor: 250 } });
    }, id);
    await sincronizado(p);
    await irPara(p, 'mes');
    const com = await p.$eval('.faturas', (e) => e.textContent);
    assert.ok(/Fatura de novembro/.test(com) && /R\$\s400,00/.test(com) && com.includes('vence dia 15') && /Limite disponível R\$\s1\.600,00/.test(com), com);
    assert.equal(await p.$eval('.faturas button.linha-fatura', (e) => e.getAttribute('aria-label')), null, 'o nome acessível vem do texto visível (WCAG 2.5.3)');
    // R-010: o número principal é o mesmo com e sem o quadro, e abrir a fatura não muda nada
    const comBloco = await kpisDoMes(p);
    await p.evaluate(() => { window.__cartoes = S.dados.cartoes; S.dados.cartoes = []; render(); });
    assert.equal(await p.$('.faturas'), null, 'sem cartões não há quadro');
    assert.equal(await kpisDoMes(p), comBloco, 'o disponível não depende do quadro de faturas');
    await p.evaluate(() => { S.dados.cartoes = window.__cartoes; render(); });
    await p.$eval('.faturas button.linha-fatura', (e) => e.click()); await folhaAberta(p);
    const folha = await p.$eval('.folha.aberta', (e) => e.textContent);
    assert.ok(folha.includes('Fatura de novembro de 2026') && folha.includes('Compra A') && folha.includes('Compra B') && folha.includes('dia 15') && /Total da fatura\s*R\$\s400,00/.test(folha) && folha.includes('Lançar compra neste cartão'), folha);
    assert.equal(await p.$$eval('.folha.aberta .linha-lanc', (e) => e.length), 2);
    await p.$eval('.folha.aberta .linha-lanc', (e) => e.click());
    await p.waitForFunction(() => document.querySelectorAll('.folha').length === 2); await sleep(320);
    assert.equal(await p.$eval('.folha.aberta:last-of-type h2', (e) => e.textContent), 'Editar lançamento', 'a linha abre a edição');
    await p.evaluate(() => fecharFolha()); await sleep(320);
    await p.$eval('.folha.aberta [data-f="lancar"]', (e) => e.click());
    await p.waitForFunction(() => document.querySelectorAll('.folha').length === 2); await sleep(320);
    await p.evaluate(() => { fecharFolha(); fecharFolha(); }); await semFolha(p);
    assert.equal(await kpisDoMes(p), comBloco, 'abrir e fechar a fatura não muda o número principal');
    // extrato: o nome do cartão aparece na linha da compra, não na do salário
    await irPara(p, 'extrato');
    const linhas = await p.$$eval('#extrato-lista .linha-lanc', (els) => els.map((e) => e.textContent));
    assert.ok(linhas.some((t) => t.includes('Compra A') && t.includes('Cartão Verde')), 'compra de cartão mostra o cartão');
    assert.ok(!linhas.some((t) => t.includes('Salário') && t.includes('Cartão')), 'lançamento comum não mostra cartão');
    // com lançamentos: só Arquivar; some do seletor (ativo falso), a fatura continua no Mês; Reativar
    await abrirCartaoEmAjustes(p, id);
    assert.equal(await p.$('.folha.aberta [data-f="apagar"]'), null, 'com lançamentos não oferece Apagar');
    await p.$eval('.folha.aberta [data-f="arquivar"]', (e) => e.click()); await semFolha(p); await sincronizado(p);
    assert.equal(Number(cartoesDe(a)[0][5]), 0, 'arquivado');
    const arq = await p.$eval('#h-cartoes-credito', (e) => e.closest('section').textContent);
    assert.ok(arq.includes('Arquivados') && arq.includes('Reativar'), arq);
    await irPara(p, 'mes');
    assert.ok((await p.$eval('.faturas', (e) => e.textContent)).includes('Cartão Verde'), 'a fatura continua no Mês');
    await irPara(p, 'ajustes', 'cartoes');
    await p.$eval('[data-acao="cartao-reativar"]', (e) => e.click()); await sincronizado(p);
    assert.equal(Number(cartoesDe(a)[0][5]), 1, 'reativado');
    await avisoDesfazer(p); await sincronizado(p);
    assert.equal(Number(cartoesDe(a)[0][5]), 0, 'Desfazer do Reativar arquiva de novo');
    await p.close();
  });
}

await caso('3.2.0 cartão e fatura: o quadro não passa da borda em 320 px e o nome do cartão cabe na linha do extrato', async () => {
  const dados = { nome: 'Estreito', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'kabcdefghij_la1', mes: 11, dia: 15, categoriaId: 'mercado', descricao: 'Compra com um nome bem comprido para testar a linha', valor: 1234567.89 },
  ], orcamento: {} } } };
  const abas = abasDoBackup(dados);
  abas.cartoes = [['id', 'nome', 'fechamento', 'vencimento', 'limite', 'ativo'], ['kabcdefghij', 'Cartão com um nome muito comprido de teste', 5, 15, 1000, 1]];
  const a = criarAmbiente(abas);
  const p = await abrir(a, { ...CEL, width: 320, height: 720 }, montarPagina(a, 'cartao-320'));
  await pronto(p); await irPara(p, 'mes');
  const txt = await p.$eval('.faturas', (e) => e.textContent);
  assert.ok(/Acima do limite em R\$/.test(txt), 'estourou o limite: texto, não só cor ' + txt);
  const medidas = await p.evaluate(() => {
    const f = document.querySelector('.faturas'); const r = f.getBoundingClientRect();
    return { doc: document.documentElement.scrollWidth - window.innerWidth, fora: [...f.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > r.right + 1).length };
  });
  assert.ok(medidas.doc <= 1 && medidas.fora === 0, JSON.stringify(medidas));
  await irPara(p, 'extrato');
  const m2 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(m2 <= 1, 'extrato sem rolagem lateral: ' + m2);
  await p.close();
});

await caso('3.2.0 importar backup: a prévia conta os cartões e a substituição avisa que eles são trocados', async () => {
  const dados = { nome: 'Prévia', categorias: catsBase(), anos: { 2026: { lancamentos: [], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'cartao-importar'));
  await pronto(p);
  const arq = arquivoSintetico('backup-com-cartoes.json', JSON.stringify({
    versao: 3, app: 'bsdesenv-financas', nome: 'Com cartões', categorias: [{ id: 'ia', nome: 'Alfa', grupo: 'fixo', ordem: 1 }],
    anos: { 2026: { lancamentos: [], orcamento: {} } }, recorrencias: [],
    cartoes: [{ id: 'kabcdefghij', nome: 'Cartão Azul', fechamento: 5, vencimento: 15, limite: 2000, ativo: true }, { id: 'ruim', nome: 'Cartão Ruim', fechamento: 5, vencimento: 15, limite: null, ativo: true }],
  }));
  await p.evaluate(() => abrirImportar()); await folhaAberta(p);
  await (await p.$('#im-arquivo')).uploadFile(arq);
  await p.waitForFunction(() => document.querySelector('#im-aceitos')?.textContent.includes('Vão entrar'));
  let txt = await p.$eval('#im-aceitos', (e) => e.textContent);
  assert.ok(txt.includes('1 cartão') && txt.includes('1 item fica de fora') && txt.includes('Cartão Ruim'), txt);
  assert.ok(!txt.includes('Substituir:'), 'mesclar não avisa de troca');
  await p.click('input[name="im-modo"][value="substituir"]');
  await p.waitForFunction(() => document.querySelector('#im-aceitos').textContent.includes('Substituir:'));
  txt = await p.$eval('#im-aceitos', (e) => e.textContent);
  assert.ok(txt.includes('os cartões de crédito atuais são trocados'), txt);
  await p.close();
});

await caso('3.2.0 backup: o JSON leva os cartões e o exemplo começa sem cartões', async () => {
  const dados = { nome: 'Backup cartões', categorias: catsBase(), anos: { 2026: { lancamentos: [], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'cartao-backup'));
  await pronto(p);
  await p.evaluate(() => registrar({ t: 'cartao', c: { id: 'kabcdefghij', nome: 'Cartão Azul', fechamento: 5, vencimento: 15, limite: null, ativo: true } }));
  await sincronizado(p);
  await capturarDownloads(p);
  await irPara(p, 'ajustes', 'dados');
  await p.click('[data-acao="exportar-json"]');
  const json = JSON.parse((await p.evaluate(() => window.__baixados))[0].conteudo);
  assert.equal(json.cartoes.length, 1, 'os cartões vão no backup');
  assert.equal(json.cartoes[0].nome, 'Cartão Azul');
  const ex = await p.evaluate(() => gerarDadosExemplo(hoje()));
  assert.deepEqual(ex.cartoes, []);
  await p.close();
});

/* ---------- 3.2.0: D (compra no cartão, parcelas, duplicar) ---------- */
const CARTAO_AZUL = ['kabcdefghij', 'Cartão Azul', 5, 15, 2000, 1];
const abasComCartao = (nome) => {
  const dados = { nome, categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'd1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: { salario: { 11: 5000 } } } } };
  const abas = abasDoBackup(dados);
  abas.cartoes = [['id', 'nome', 'fechamento', 'vencimento', 'limite', 'ativo'], CARTAO_AZUL];
  return abas;
};
const noCartao = (a) => a.linhas().filter((l) => String(l[0]).startsWith('kabcdefghij_'));

for (const [rotuloVp, vp] of [['celular', CEL], ['PC', PC]]) {
  await caso(`3.2.0 compra no cartão (${rotuloVp}): Pago com, fatura de dezembro, parcelas em três faturas, Desfazer, limite e Duplicar`, async () => {
    const toque = vp === CEL;
    const dados0 = { nome: 'Sem cartão', categorias: catsBase(), anos: { 2026: { lancamentos: [
      { id: 'd0', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
    ], orcamento: {} } } };
    const sem = criarAmbiente(abasDoBackup(dados0));
    const ps = await abrir(sem, vp, montarPagina(sem, 'cartao-sem-' + rotuloVp));
    await pronto(ps);
    // regressão: sem cartão o Novo não mostra o campo
    if (toque) await ps.tap('.inf-mais'); else await ps.click('[data-foco="novo-topo"]');
    await folhaAberta(ps);
    assert.equal(await ps.$('#nv-cartao'), null, 'sem cartão não aparece “Pago com”');
    await ps.close();

    const a = criarAmbiente(abasComCartao('Compra no cartão'));
    const p = await abrir(a, vp, montarPagina(a, 'cartao-compra-' + rotuloVp));
    await pronto(p);
    const abrirNovoLancamento = async () => {
      if (toque) await p.tap('.inf-mais'); else await p.click('[data-foco="novo-topo"]');
      await folhaAberta(p);
    };
    const digitar = async (digitos, desc) => {
      if (toque) { await digitarTeclado(p, digitos.split('')); await p.tap('[data-f="cat"][data-v="mercado"]'); }
      else { await p.type('#nv-texto', digitos.replace(/(\d{2})$/, ',$1')); await p.click('[data-f="cat"][data-v="mercado"]'); }
      await p.$eval('#nv-desc', (e) => { e.value = ''; });
      await p.type('#nv-desc', desc);
    };
    const dica = () => p.$eval('#nv-fatura', (e) => e.textContent);
    // 100 mercado no cartão em 18/11: fecha dia 5, entra na fatura de dezembro, dia 15
    await abrirNovoLancamento();
    assert.equal(await p.$$eval('#nv-cartao option', (o) => o.length), 2, 'Dinheiro, Pix ou débito e o Cartão Azul');
    assert.equal(await p.$eval('#nv-cartao', (e) => e.value), '', 'o padrão é o comportamento de sempre');
    assert.equal(await dica(), '', 'sem cartão não há dica');
    await digitar('10000', 'mercado');
    await p.select('#nv-cartao', 'kabcdefghij');
    assert.equal(await dica(), 'Entra na fatura de dezembro (vence dia 15).');
    await p.click('#nv-salvar'); await semFolha(p); await sincronizado(p);
    const compras = noCartao(a);
    assert.equal(compras.length, 1, 'um lançamento com o prefixo do cartão');
    assert.deepEqual([compras[0][1], compras[0][2], compras[0][3], compras[0][4], compras[0][6]], [2026, 12, 15, 'mercado', 100]);
    const txt = await textoAviso(p);
    assert.ok(txt.includes('1 lançamento no cartão Cartão Azul') && txt.includes('fatura de dezembro'), txt);
    // a escolha fica na sessão: o Novo seguinte já vem com o cartão
    await abrirNovoLancamento();
    assert.equal(await p.$eval('#nv-cartao', (e) => e.value), 'kabcdefghij', 'lembra o cartão na sessão');
    // parcelar 100,00 em 3 vezes no cartão: dezembro, janeiro e fevereiro, sem escolher a primeira parcela
    await digitar('10000', 'notebook');
    if (toque) await p.tap('[data-f="parcelar"]'); else await p.click('[data-f="parcelar"]');
    await p.waitForSelector('#nv-parc:not([hidden])');
    await p.type('#nv-n', '3');
    assert.equal(await p.$eval('#nv-p1', (e) => e.closest('label').hidden), true, 'com cartão a primeira parcela é a da fatura');
    assert.equal(await dica(), 'A primeira parcela entra na fatura de dezembro (vence dia 15).');
    const previa = await p.$eval('#nv-previa', (e) => e.textContent);
    assert.ok(previa.includes('3×') && previa.includes('33,33') && previa.includes('33,34'), previa);
    await p.click('#nv-salvar'); await semFolha(p); await sincronizado(p);
    const reParc = /^kabcdefghij_p[a-z0-9]{10}-\d{2}$/;
    const parcelas = () => noCartao(a).filter((l) => reParc.test(l[0])).sort((x, y) => (x[0] < y[0] ? -1 : 1));
    assert.deepEqual(parcelas().map((l) => [l[1], l[2], l[3], l[6]]), [[2026, 12, 15, 33.34], [2027, 1, 15, 33.33], [2027, 2, 15, 33.33]]);
    assert.ok(parcelas()[0][5].includes('notebook (1/3)'), 'descrição de parcela');
    assert.equal(await textoAviso(p), 'Compra parcelada em 3 vezes no cartão Cartão Azul.');
    // Desfazer remove as três
    await avisoDesfazer(p); await sincronizado(p);
    assert.equal(parcelas().length, 0, 'Desfazer apaga as três parcelas');
    assert.equal(noCartao(a).length, 1, 'a compra à vista continua');
    // parcelar de novo para conferir a fatura e o limite
    await abrirNovoLancamento();
    await digitar('10000', 'notebook');
    if (toque) await p.tap('[data-f="parcelar"]'); else await p.click('[data-f="parcelar"]');
    await p.waitForSelector('#nv-parc:not([hidden])');
    await p.type('#nv-n', '3');
    await p.click('#nv-salvar'); await semFolha(p); await sincronizado(p);
    assert.equal(parcelas().length, 3);
    await p.evaluate(() => { S.ano = 2026; S.mes = 12; });
    await irPara(p, 'mes');
    const fat = await p.$eval('.faturas', (e) => e.textContent.replace(/\s/g, ' '));
    assert.ok(/Fatura de dezembro/.test(fat) && /R\$ 133,34/.test(fat) && /Limite disponível R\$ 1\.800,00/.test(fat), fat);
    // extrato de dezembro: o mercado aparece com o nome do cartão; em novembro não aparece
    await irPara(p, 'extrato');
    const dez = await p.$$eval('#extrato-lista .linha-lanc', (els) => els.map((e) => e.textContent));
    assert.ok(dez.some((t) => t.includes('mercado') && t.includes('Cartão Azul')), 'dezembro mostra a compra com o cartão: ' + dez.join(' | '));
    await p.evaluate(() => { S.mes = 11; });
    await irPara(p, 'mes'); await irPara(p, 'extrato');
    const nov = await p.$$eval('#extrato-lista .linha-lanc', (els) => els.map((e) => e.textContent));
    assert.ok(!nov.some((t) => t.includes('Cartão Azul')), 'novembro não tem a compra do cartão');
    // editar: linha fixa com o cartão, sem “Repetir todo mês”; Duplicar mantém o cartão
    const idCompra = compras[0][0];
    await p.evaluate((id) => abrirEditar(id), idCompra); await folhaAberta(p);
    const ed = await p.$eval('.folha.aberta', (e) => e.textContent);
    assert.ok(ed.includes('No cartão Cartão Azul') && !ed.includes('Repetir todo mês'), ed);
    await p.$eval('.folha.aberta [data-f="duplicar"]', (e) => e.click()); await semFolha(p); await sincronizado(p);
    const aposDup = noCartao(a).filter((l) => !reParc.test(l[0]));
    assert.equal(aposDup.length, 2, 'a cópia continua no cartão');
    const copia = aposDup.find((l) => l[0] !== idCompra);
    assert.deepEqual([copia[1], copia[2], copia[3]], [2026, 12, 15], 'a cópia fica na mesma fatura, sem recalcular');
    await p.close();
  });
}

await caso('3.2.0 compra no cartão: mês fechado pede o segundo toque pelo mês da fatura, não pelo da data', async () => {
  const a = criarAmbiente(abasComCartao('Cartão fechado'));
  const p = await abrir(a, PC, montarPagina(a, 'cartao-fechado'));
  await pronto(p);
  await p.evaluate(() => registrar({ t: 'cfg', k: 'fechado:' + chaveFechado(2026, 12), v: '0' }));
  await sincronizado(p);
  await p.click('[data-foco="novo-topo"]'); await folhaAberta(p);
  await p.type('#nv-texto', '50 mercado');
  await p.select('#nv-cartao', 'kabcdefghij');
  await p.click('#nv-salvar');
  assert.equal(noCartao(a).length, 0, 'o primeiro toque não grava');
  assert.equal(await p.$eval('#nv-salvar', (e) => e.textContent), 'Confirmar em mês fechado', 'o botão pede a confirmação do mês da fatura');
  await p.click('#nv-salvar'); await semFolha(p); await sincronizado(p);
  assert.equal(noCartao(a).length, 1, 'o segundo toque grava');
  await p.close();
});

await caso('3.2.0 cartão: Desfazer de “Cartão criado” com compras já lançadas arquiva em vez de pedir ao servidor para apagar', async () => {
  const dados = { nome: 'Desfazer cartão', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'dc1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'cartao-desfazer'));
  await pronto(p);
  await irPara(p, 'ajustes', 'cartoes');
  await p.$eval('[data-acao="cartao-novo"]', (e) => e.click()); await folhaAberta(p);
  await p.type('#cc-nome', 'Cartão Roxo'); await p.type('#cc-fecha', '10'); await p.type('#cc-vence', '20');
  await salvarTopo(p); await semFolha(p); await sincronizado(p);
  const id = cartoesDe(a)[0][0];
  await p.evaluate((cid) => registrar({ t: 'lanc', l: { id: cid + '_lx1', ano: 2026, mes: 12, dia: 20, categoriaId: 'mercado', descricao: 'Compra X', valor: 80 } }), id);
  await sincronizado(p);
  await p.waitForSelector('.aviso .aviso-acao');
  await avisoDesfazer(p); await sincronizado(p);
  assert.equal(cartoesDe(a).length, 1, 'o cartão não foi apagado');
  assert.equal(Number(cartoesDe(a)[0][5]), 0, 'ficou arquivado');
  assert.ok(a.linhas().some((l) => l[0] === id + '_lx1'), 'a compra continua');
  assert.ok((await textoAviso(p)).includes('já tem compras'), await textoAviso(p));
  // sem compras, o Desfazer continua apagando
  await p.$eval('[data-acao="cartao-novo"]', (e) => e.click()); await folhaAberta(p);
  await p.type('#cc-nome', 'Cartão Verde'); await p.type('#cc-fecha', '10'); await p.type('#cc-vence', '20');
  await salvarTopo(p); await semFolha(p); await sincronizado(p);
  assert.equal(cartoesDe(a).length, 2);
  await avisoDesfazer(p); await sincronizado(p);
  assert.equal(cartoesDe(a).length, 1, 'sem compras o Desfazer apaga');
  await p.close();
});

await caso('3.2.0 recorrência: mover “A partir de” para depois do “Até” mantém o fim, avisa e impede salvar', async () => {
  const dados = { nome: 'Recorrência fim', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'rf1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'recorrencia-inicio-depois-do-fim'));
  await pronto(p);
  await p.evaluate(() => abrirRecorrencia({ cid: 'aluguel', ano: 2026, mes: 11, aoSalvar: () => {} }));
  await p.waitForSelector('#rc-valor');
  await p.type('#rc-valor', '800');
  await p.select('#rc-fim', '202612');
  await p.select('#rc-ini', '202701');
  assert.equal(await p.$eval('#rc-fim', (e) => e.value), '202612', 'o fim escolhido não vira “sem fim”');
  const msg = await p.$eval('#rc-erro', (e) => e.textContent);
  assert.ok(msg.includes('ficou antes do começo'), msg);
  await salvarTopo(p); await sleep(200);
  assert.equal(recsDe(a).length, 0, 'não grava com o fim antes do começo');
  assert.ok(await p.$('#rc-valor'), 'a folha continua aberta');
  await p.select('#rc-ini', '202611');
  assert.equal(await p.$eval('#rc-erro', (e) => e.textContent), '', 'voltando o começo, o aviso some');
  assert.equal(await p.$eval('#rc-fim', (e) => e.value), '202612', 'o fim continua escolhido');
  await salvarTopo(p); await p.waitForSelector('#rc-valor', { hidden: true }); await sincronizado(p);
  assert.equal(recsDe(a).length, 1);
  assert.equal(Number(recsDe(a)[0][6]), 202612, 'o fim gravado é o escolhido');
  await p.close();
});

await caso('3.2.0 Diagnósticos: versão, fila e recusa na folha; “Copiar diagnóstico” não leva nomes, valores nem R$', async () => {
  const a = criarAmbiente(abasDoBackup(exemplo));
  const p = await abrir(a, PC, montarPagina(a, 'diagnosticos'));
  await pronto(p);
  const lerDiag = (rot) => p.evaluate((r) => {
    const l = [...document.querySelectorAll('.folha.aberta .diag-linha')].find((x) => x.querySelector('dt').textContent === r);
    return l ? { texto: l.querySelector('dd').textContent, itens: [...l.querySelectorAll('li')].map((x) => x.textContent) } : null;
  }, rot);
  await irPara(p, 'ajustes', 'diagnosticos');
  await p.$eval('[data-acao="diagnosticos"]', (e) => e.click()); await folhaAberta(p);
  assert.equal((await lerDiag('Versão do app')).texto, await p.evaluate(() => S.dados.versaoApp));
  assert.equal((await lerDiag('Fila de envio')).texto, 'Vazia');
  assert.equal((await lerDiag('Operações recusadas')).texto, 'Nenhuma nesta sessão');
  await p.keyboard.press('Escape'); await semFolha(p);
  await p.evaluate(() => registrar({ t: 'cartao', c: { id: 'x' } })); await sincronizado(p);
  await p.$eval('[data-acao="diagnosticos"]', (e) => e.click()); await folhaAberta(p);
  const recusa = await lerDiag('Operações recusadas');
  assert.equal(recusa.itens.length, 1, 'uma recusa na lista');
  assert.ok(recusa.itens[0].includes('id de cartão inválido'), recusa.itens[0]);
  await p.evaluate(() => { window.__copiado = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copiado.push(t); } } }); });
  await p.click('[data-f="copiar"]');
  await p.waitForFunction(() => window.__copiado.length === 1);
  const texto = await p.evaluate(() => window.__copiado[0]);
  assert.ok(texto.includes('Operações recusadas: 1'), texto);
  assert.ok(texto.includes('Fila de envio: Vazia'), texto);
  for (const proibido of ['Mercado', 'Salário', 'R$', 'id de cartão']) assert.ok(!texto.includes(proibido), 'o texto copiado leva ' + proibido);
  await p.close();
});

await caso('3.2.0 Novo lançamento no celular cabe inteiro na tela (sem rolagem da página nem da folha), com e sem cartão, de 412×780 a 320×568', async () => {
  const rotuloCaptura = process.env.NV_CAPTURA || '';
  for (const [width, height] of [[412, 780], [390, 700], [360, 640], [320, 568]]) {
    for (const estado of ['sem cartão', 'com cartão', 'com cartão escolhido']) {
      const a = criarAmbiente(estado === 'sem cartão' ? abasDoBackup({ nome: 'Cabe sem cartão', categorias: catsBase(), anos: { 2026: { lancamentos: [{ id: 'd1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 5000 }], orcamento: { salario: { 11: 5000 } } } } }) : abasComCartao('Cabe com cartão'));
      const p = await abrir(a, { ...CEL, width, height }, montarPagina(a, `cabe-${width}x${height}-${estado.replace(/\s/g, '')}`));
      await pronto(p);
      const paginaAntes = await p.evaluate(() => document.scrollingElement.scrollHeight);
      await p.tap('.inf-mais'); await folhaAberta(p);
      const onde = `${width}×${height}, ${estado}`;
      if (estado === 'sem cartão') assert.equal(await p.$('#nv-cartao'), null, `${onde}: sem cartão não há “Pago com”`);
      else {
        assert.ok(await p.$eval('label[for="nv-cartao"]', (e) => e.textContent === 'Pago com'), `${onde}: rótulo ligado ao campo`);
        { const hh = await p.$eval('#nv-cartao', (e) => e.getBoundingClientRect().height); assert.ok(hh >= 44, `${onde}: o alvo do cartão tem ${hh} px`); }
        if (estado === 'com cartão escolhido') { await p.select('#nv-cartao', 'kabcdefghij'); await sleep(120); assert.match(await p.$eval('#nv-fatura', (e) => e.textContent), /fatura de/, `${onde}: a dica da fatura aparece`); }
      }
      await sleep(150);
      const r = await p.evaluate(() => {
        const f = document.querySelector('.folha');
        const rect = (s) => document.querySelector(s).getBoundingClientRect();
        const salvar = rect('#nv-salvar');
        return {
          pagina: document.scrollingElement.scrollHeight, travado: getComputedStyle(document.scrollingElement).overflowY === 'hidden', folhaTopo: f.getBoundingClientRect().top, folha: f.scrollHeight - f.clientHeight, salvarDentro: salvar.top >= 0 && salvar.bottom <= innerHeight + 0.5 && salvar.left >= 0 && salvar.right <= innerWidth + 0.5,
          tecla: Math.min(...[...document.querySelectorAll('.teclado button')].map((b) => b.getBoundingClientRect().height)),
          chips: [...document.querySelectorAll('#nv-datas .chip')].map((c) => c.getBoundingClientRect().height),
          largura: document.scrollingElement.scrollWidth - innerWidth, linhas: new Set([...document.querySelectorAll('#nv-datas .chip, #nv-cartao-chip')].map((c) => Math.round(c.getBoundingClientRect().top))).size,
        };
      });
      if (rotuloCaptura && ((width === 412 && height === 780) || (width === 360 && height === 640)) && estado !== 'com cartão escolhido') {
        fs.mkdirSync(path.join(SAIDA, 'capturas'), { recursive: true });
        await p.screenshot({ path: path.join(SAIDA, 'capturas', `novo-${rotuloCaptura}-${width}x${height}-${estado.replace(/\s/g, '-')}.png`) });
      }
      /* O fundo (a tela de baixo) tem a altura dela e fica travado; a folha não aumenta a página e cabe inteira na janela. */
      assert.ok(r.travado, `${onde}: o fundo rola por baixo da folha`);
      assert.ok(r.pagina <= paginaAntes, `${onde}: a folha aumentou a página de ${paginaAntes} para ${r.pagina}px`);
      assert.ok(r.folhaTopo >= 0, `${onde}: o topo da folha passa da janela (${r.folhaTopo}px)`);
      assert.ok(r.folha <= 1, `${onde}: a folha rola ${r.folha}px`);
      assert.ok(r.salvarDentro, `${onde}: o Salvar não está inteiro na tela`);
      assert.ok(r.tecla >= (height === 568 ? 36 : 40), `${onde}: tecla de ${r.tecla}px`);
      assert.ok(r.largura <= 0, `${onde}: rolagem lateral de ${r.largura}px`);
      assert.ok(r.chips.every((c) => c >= 38), `${onde}: chips baixos ${r.chips}`);
      if (estado !== 'com cartão escolhido') {
        let alcancou = false;
        for (let i = 0; i < 60 && !alcancou && estado !== 'sem cartão'; i++) { await p.keyboard.press('Tab'); alcancou = await p.evaluate(() => document.activeElement && document.activeElement.id === 'nv-cartao'); }
        if (estado !== 'sem cartão') assert.ok(alcancou, `${onde}: Tab não chega ao “Pago com”`);
      }
      await p.close();
    }
  }
});

await caso('3.2.0 Impressão: Mês impresso sem menus nem botões, em branco, sem rolagem lateral em A4; o botão só existe no Acompanhar', async () => {
  const a = criarAmbiente(abasDoBackup(exemplo));
  const A4 = { width: 794, height: 1123, deviceScaleFactor: 1 };
  const p = await abrir(a, A4, montarPagina(a, 'impressao'));
  await pronto(p);
  await irPara(p, 'mes'); await sleep(120);
  const visivel = (sel) => p.$eval(sel, (e) => getComputedStyle(e).display !== 'none');
  assert.equal((await p.$$('[data-acao="imprimir"]')).length, 1, 'o botão Imprimir este mês existe na tela Mês');
  assert.ok((await p.$eval('[data-acao="imprimir"]', (e) => e.getAttribute('aria-label'))).startsWith('Imprimir este mês'), 'o botão tem aria-label');
  assert.equal(await visivel('.so-impressao'), false, 'o cabeçalho de impressão não aparece na tela');
  assert.equal(await visivel('#inferior'), true, 'na tela, a barra inferior aparece');
  await p.emulateMediaType('print');
  for (const sel of ['#lateral', '#inferior', '#topo', '.inf-mais', '#avisos', '#camada']) assert.equal(await visivel(sel), false, sel + ' some na impressão');
  assert.equal(await visivel('.so-impressao'), true, 'o cabeçalho de impressão aparece');
  assert.equal(await p.$eval('[data-acao="imprimir"]', (e) => getComputedStyle(e).display), 'none', 'o botão Imprimir some na impressão');
  assert.equal(await p.$eval('.mes-cab .segmentado', (e) => getComputedStyle(e).display), 'none', 'o seletor de modo some na impressão');
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)', 'fundo branco');
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).color), 'rgb(0, 0, 0)', 'texto preto');
  const cab = await p.$eval('.so-impressao', (e) => e.textContent);
  assert.ok(cab.includes('novembro de 2026') && cab.includes('Impresso em 18/11/2026'), cab);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'sem rolagem horizontal em 794 px');
  await p.emulateMediaType('screen');
  assert.equal(await visivel('#inferior'), true, 'a barra inferior volta na tela');
  assert.equal(await visivel('.so-impressao'), false, 'o cabeçalho de impressão volta a esconder');
  await p.click('[data-acao="modo-mes"][data-modo="planejar"]'); await sleep(120);
  assert.equal((await p.$$('[data-acao="imprimir"]')).length, 0, 'o botão não existe no Planejar');
  await p.close();
});

/* ---------- 3.2.0 parte E: axe, 200% de zoom, só teclado e capturas ---------- */
const EXIGE_AXE = process.env.E2E_EXIGE_AXE === '1';
const MODO_CAPTURAS = process.argv.includes('--capturas');
const CAPTURAS = path.join(SAIDA, 'capturas');
const TAGS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const GRAVES_AXE = ['critical', 'serious'];
/** Código do axe-core: AXE_PATH (arquivo axe.min.js, relativo à pasta atual ou à raiz) ou import('axe-core'). Sem nenhum dos dois, vale null. */
async function carregarAxe() {
  try {
    if (process.env.AXE_PATH) {
      const arq = [path.resolve(process.env.AXE_PATH), path.resolve(RAIZ, process.env.AXE_PATH)].find((c) => fs.existsSync(c));
      return arq ? fs.readFileSync(arq, 'utf8') : null;
    }
    const m = await import('axe-core');
    return (m.default || m).source || null;
  } catch { return null; }
}
const axeFonte = await carregarAxe();

/** Exemplo fictício mais um Cartão Azul com uma compra em novembro (a fatura do Mês e a folha da fatura passam a existir). */
function abasComFatura() {
  const d = JSON.parse(JSON.stringify(exemplo));
  d.anos['2026'].lancamentos.push({ id: 'kabcdefghij_ax1', mes: 11, dia: 15, categoriaId: 'mercado', descricao: 'Compra de exemplo', valor: 120 });
  const abas = abasDoBackup(d);
  abas.cartoes = [['id', 'nome', 'fechamento', 'vencimento', 'limite', 'ativo'], CARTAO_AZUL];
  return abas;
}
/** Leva a página a uma "tela" do teste: inicio, mes (Acompanhar), planejar, planilha, extrato ou ajustes. */
async function irParaTela(p, tela) {
  const [nome, secao] = tela.split(':');
  const modo = nome === 'planejar' ? 'planejar' : 'acompanhar';
  const real = nome === 'planejar' ? 'mes' : nome;
  if (real === 'ajustes' && secao) await irPara(p, real, secao);
  else if (await p.evaluate(() => S.tela) !== real) await irPara(p, real);
  if (real === 'mes' && await p.evaluate(() => S.modoMes) !== modo) { await p.evaluate((m) => { S.modoMes = m; render(); }, modo); await sleep(150); }
  await sleep(150);
}
const abrirNovoPorToque = async (p) => { await p.$eval('[data-acao="novo"]:not([hidden])', (e) => e.click()).catch(async () => { await p.evaluate(() => abrirNovo()); }); await folhaAberta(p); };
/** Abre a folha da fatura (Mês, Acompanhar). */
async function abrirFaturaNaTela(p) { await irParaTela(p, 'mes'); await p.$eval('.faturas button.linha-fatura', (e) => e.click()); await folhaAberta(p); }
async function abrirDiagnosticosNaTela(p) { await irParaTela(p, 'ajustes:diagnosticos'); await p.$eval('[data-acao="diagnosticos"]', (e) => e.click()); await folhaAberta(p); }

/** Roda o axe na página e devolve as violações com no máximo 3 seletores cada. */
async function rodarAxe(p) {
  if (!(await p.evaluate(() => typeof axe !== 'undefined'))) await p.evaluate(axeFonte);
  return p.evaluate(async (tags) => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return r.violations.map((v) => ({ id: v.id, impacto: v.impact, ajuda: v.help, alvos: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  }, TAGS_AXE);
}
const textoViolacao = (onde, v) => `${onde}: ${v.id} (${v.impacto}) ${v.ajuda} [${v.alvos.join(' | ')}]`;

for (const [rotuloVp, vp] of [['celular 390', CEL], ['PC 1440', PC]]) {
  for (const tema of ['light', 'dark']) {
    await caso(`3.2.0 axe (${rotuloVp}, ${tema === 'dark' ? 'escuro' : 'claro'}): nenhuma violação crítica ou séria nas telas e folhas`, async () => {
      if (!axeFonte) {
        if (EXIGE_AXE) throw new Error('axe-core ausente e E2E_EXIGE_AXE=1: instale o axe-core ou aponte AXE_PATH');
        console.log('  axe-core ausente: casos de axe pulados');
        return;
      }
      const a = criarAmbiente(abasComFatura());
      const p = await abrir(a, vp, montarPagina(a, `axe-${rotuloVp.replace(' ', '-')}-${tema}`), { tema });
      await pronto(p); await fontes(p);
      const graves = []; const avisos = [];
      const conferir = async (onde) => {
        for (const v of await rodarAxe(p)) (GRAVES_AXE.includes(v.impacto) ? graves : avisos).push(textoViolacao(onde, v));
      };
      for (const tela of ['inicio', 'mes', 'planejar', 'planilha', 'extrato', 'ajustes', 'ajustes:categorias', 'ajustes:cartoes', 'ajustes:dados', 'ajustes:atualizacoes']) {
        await irParaTela(p, tela); await conferir(tela);
      }
      await abrirNovoPorToque(p); await conferir('folha Novo lançamento'); await fecharFolhas(p);
      await abrirFaturaNaTela(p); await conferir('folha da fatura'); await fecharFolhas(p);
      await abrirDiagnosticosNaTela(p); await conferir('folha Diagnósticos'); await fecharFolhas(p);
      for (const m of new Set(avisos)) console.log('  aviso axe (moderada/leve): ' + m);
      await p.close();
      assert.deepEqual(graves, [], graves.join(' || '));
    });
  }
}

/** Mede, na página, o que o reflow exige: sem rolagem lateral, nada além da borda, nenhum texto cortado sem reticências. */
const medirReflow = (p, raizSeletor) => p.evaluate((raizSel) => {
  const larg = window.innerWidth;
  const raiz = document.querySelector(raizSel);
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '');
  const passam = []; const cortados = [];
  const dentroDeRolagem = (e) => {
    for (let a = e.parentElement; a && a !== raiz.parentElement; a = a.parentElement) {
      const o = getComputedStyle(a).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden') return true;
    }
    return false;
  };
  for (const e of raiz.querySelectorAll('*')) {
    const b = e.getBoundingClientRect();
    // Só para leitor de tela (.sr, 1 px) e campos de formulário (rolam o próprio conteúdo) não entram na medição.
    if (b.width <= 1 || b.height <= 1) continue;
    const cs = getComputedStyle(e);
    if (cs.position === 'fixed') continue;
    if (b.right > larg + 1 && !dentroDeRolagem(e)) passam.push(desc(e));
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && e.scrollWidth > e.clientWidth + 1 && cs.textOverflow !== 'ellipsis') cortados.push(desc(e));
  }
  return { rolaLado: document.documentElement.scrollWidth > larg, passam: [...new Set(passam)].slice(0, 3), cortados: [...new Set(cortados)].slice(0, 3) };
}, raizSeletor);

for (const [rotulo, vp] of [['200% de zoom (640 px)', { width: 640, height: 900, deviceScaleFactor: 2 }], ['reflow do WCAG (320 px)', { width: 320, height: 640, deviceScaleFactor: 2 }]]) {
  await caso(`3.2.0 ${rotulo}: sem rolagem lateral, nada além da borda, texto sem corte e Salvar alcançável`, async () => {
    const a = criarAmbiente(abasComFatura());
    const p = await abrir(a, vp, montarPagina(a, `zoom-${vp.width}`));
    await pronto(p); await fontes(p);
    const erros = [];
    for (const tela of ['inicio', 'mes', 'planejar', 'ajustes', 'ajustes:categorias', 'ajustes:cartoes', 'ajustes:dados', 'ajustes:atualizacoes']) {
      await irParaTela(p, tela);
      const r = await medirReflow(p, '#tela');
      if (r.rolaLado) erros.push(`${tela}: rolagem lateral`);
      if (r.passam.length) erros.push(`${tela}: passa da borda [${r.passam.join(' | ')}]`);
      if (r.cortados.length) erros.push(`${tela}: texto cortado [${r.cortados.join(' | ')}]`);
    }
    await abrirNovoPorToque(p);
    const f = await medirReflow(p, '.folha.aberta');
    if (f.rolaLado) erros.push('folha Novo lançamento: rolagem lateral');
    if (f.passam.length) erros.push(`folha Novo lançamento: passa da borda [${f.passam.join(' | ')}]`);
    if (f.cortados.length) erros.push(`folha Novo lançamento: texto cortado [${f.cortados.join(' | ')}]`);
    const salvar = await p.evaluate(() => {
      const b = document.querySelector('#nv-salvar');
      b.scrollIntoView({ block: 'nearest' });
      const r = b.getBoundingClientRect();
      const topo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { dentro: r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, clicavel: !!topo && (topo === b || b.contains(topo)) };
    });
    if (!salvar.dentro || !salvar.clicavel) erros.push('folha Novo lançamento: Salvar fora da área visível ou coberto ' + JSON.stringify(salvar));
    await p.close();
    assert.deepEqual(erros, [], erros.join(' || '));
  });
}

/** Informações do elemento focado: descrição curta e se o foco é visível (contorno ou sombra). */
const focoAtual = (p) => p.evaluate(() => {
  const e = document.activeElement;
  if (!e || e === document.body) return { corpo: true };
  const cs = getComputedStyle(e);
  const desc = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.getAttribute('data-acao') ? '[' + e.getAttribute('data-acao') + ']' : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '');
  const contorno = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  const sombra = !!cs.boxShadow && cs.boxShadow !== 'none';
  // Campo sem borda dentro de uma caixa (lançamento rápido): o anel é desenhado na caixa, por :has(:focus-visible).
  const pai = e.parentElement && getComputedStyle(e.parentElement);
  const contornoPai = !!pai && pai.outlineStyle !== 'none' && parseFloat(pai.outlineWidth) > 0;
  return { desc, visivel: contorno || sombra || contornoPai, naFolha: !!e.closest('.folha'), id: e.id, foco: e.getAttribute('data-foco') };
});

for (const [rotuloVp, vp] of [['celular', CEL], ['PC', PC]]) {
  await caso(`3.2.0 só teclado (${rotuloVp}): skip link, foco visível em cada parada e nenhum tabindex positivo`, async () => {
    const a = criarAmbiente(abasComFatura());
    const p = await abrir(a, vp, montarPagina(a, 'teclado-' + rotuloVp));
    await pronto(p);
    await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement.matches('a.pular')), true, 'o primeiro Tab não foca o skip link');
    assert.equal((await focoAtual(p)).visivel, true, 'o skip link não mostra o foco');
    await p.keyboard.press('Enter'); await sleep(150);
    assert.equal(await p.evaluate(() => document.activeElement.id), 'tela', 'Enter no skip link não leva o foco ao conteúdo');
    const erros = [];
    for (const tela of ['inicio', 'mes', 'planejar', 'planilha', 'extrato', 'ajustes', 'ajustes:categorias', 'ajustes:dados', 'ajustes:atualizacoes']) {
      await irParaTela(p, tela);
      await p.evaluate(() => document.querySelector('#tela').focus());
      const positivos = await p.$$eval('[tabindex]', (els) => els.filter((e) => Number(e.getAttribute('tabindex')) > 0).length);
      if (positivos) erros.push(`${tela}: ${positivos} elemento(s) com tabindex positivo`);
      for (let i = 0; i < 40; i++) {
        await p.keyboard.press('Tab');
        const f = await focoAtual(p);
        if (f.corpo) break;
        if (!f.visivel) erros.push(`${tela}: sem foco visível em ${f.desc}`);
      }
    }
    await p.close();
    assert.deepEqual([...new Set(erros)], [], [...new Set(erros)].slice(0, 6).join(' || '));
  });
}

await caso('3.2.0 só teclado (PC): a folha Novo lançamento abre por Enter, prende o foco, Esc devolve o foco e Salvar grava', async () => {
  const a = criarAmbiente(abasDoBackup(exemplo));
  const p = await abrir(a, PC, montarPagina(a, 'teclado-folha'));
  await pronto(p);
  await irParaTela(p, 'inicio');
  await p.$eval('[data-foco="novo-topo"]', (e) => e.focus());
  await p.keyboard.press('Enter'); await folhaAberta(p);
  assert.equal((await focoAtual(p)).naFolha, true, 'o foco não vai para dentro da folha');
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press('Tab');
    const f = await focoAtual(p);
    assert.ok(!f.corpo && f.naFolha, `o Tab saiu da folha na parada ${i + 1}`);
    assert.ok(f.visivel, `sem foco visível na folha em ${f.desc}`);
  }
  await p.keyboard.press('Escape'); await semFolha(p);
  assert.equal((await focoAtual(p)).foco, 'novo-topo', 'Esc não devolveu o foco ao botão que abriu a folha');
  await p.keyboard.press('Enter'); await folhaAberta(p);
  await p.type('#nv-texto', '45 mercado teclado puro');
  let salvar = false;
  for (let i = 0; i < 40 && !salvar; i++) { await p.keyboard.press('Tab'); salvar = (await focoAtual(p)).id === 'nv-salvar'; }
  assert.ok(salvar, 'o Tab não chega ao Salvar');
  await p.keyboard.press('Enter'); await semFolha(p); await sincronizado(p);
  const linha = a.linhas().find((l) => l[6] === 45 && String(l[5]).includes('teclado puro'));
  assert.ok(linha, 'o lançamento feito só pelo teclado não foi gravado');
  await irParaTela(p, 'extrato');
  assert.ok((await p.$eval('#tela', (e) => e.innerText)).includes('teclado puro'), 'o lançamento não aparece no extrato');
  await p.close();
});

/** Modo --capturas: PNG de cada tela em testes/saida/capturas/<tela>-<largura>-<tema>.png (320, 390 e 1440 px, claro e escuro), com dados de exemplo. */
if (MODO_CAPTURAS) {
  await caso('3.2.0 capturas: grava as telas e folhas em testes/saida/capturas', async () => {
    fs.mkdirSync(CAPTURAS, { recursive: true });
    for (const [largura, vp] of [[320, { ...CEL, width: 320, height: 640 }], [390, CEL], [1440, PC]]) {
      for (const tema of ['light', 'dark']) {
        const a = criarAmbiente(abasComFatura());
        const p = await abrir(a, vp, montarPagina(a, `capturas-${largura}-${tema}`), { tema });
        await pronto(p); await fontes(p);
        const nome = (tela) => path.join(CAPTURAS, `${tela}-${largura}-${tema === 'dark' ? 'escuro' : 'claro'}.png`);
        for (const tela of ['inicio', 'mes', 'planejar', 'ajustes']) { await irParaTela(p, tela); await p.screenshot({ path: nome(tela) }); }
        await abrirNovoPorToque(p); await p.screenshot({ path: nome('novo-lancamento') }); await fecharFolhas(p);
        await abrirFaturaNaTela(p); await p.screenshot({ path: nome('fatura') }); await fecharFolhas(p);
        await p.close();
      }
    }
  });
}

/* ---------- 3.3.0: Ajustes em índice e categorias em lista de leitura ---------- */
const abasAjustes = () => abasDoBackup({ nome: 'Casa', categorias: [
  { id: 'aluguel', nome: 'Aluguel', grupo: 'fixo', ordem: 1 }, { id: 'guardar', nome: 'Guardar', grupo: 'fixo', ordem: 2 }, { id: 'internet', nome: 'Internet', grupo: 'fixo', ordem: 3 },
  { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 4 }, { id: 'lazer', nome: 'Lazer', grupo: 'variavel', ordem: 5 }, { id: 'transporte', nome: 'Transporte', grupo: 'variavel', ordem: 6 },
  { id: 'salario', nome: 'Salário', grupo: 'renda', ordem: 7 }, { id: 'extra', nome: 'Renda extra', grupo: 'renda', ordem: 8 },
], anos: { 2026: { lancamentos: [
  { id: 'aj1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 3000 },
  { id: 'aj2', mes: 11, dia: 2, categoriaId: 'aluguel', descricao: '', valor: 900 },
  { id: 'aj3', mes: 10, dia: 2, categoriaId: 'aluguel', descricao: '', valor: 900 },
  { id: 'aj4', mes: 11, dia: 3, categoriaId: 'mercado', descricao: '', valor: 80 },
], orcamento: {} } } });
const idsDoGrupo = (p, g) => p.evaluate((x) => catsDoGrupo(x).map((c) => c.id), g);
const idsNaTela = (p, g) => p.$$eval(`.cat-lista[data-grupo="${g}"] > li`, (l) => l.map((e) => e.dataset.cat));
const ordensNaPlanilha = (a) => Object.fromEntries(a.servidor.planilha.ler('categorias').map((l) => [l[0], Number(l[3])]));
/** Arrasta com o mouse: desce/sobe a alça de `id` até o centro da linha `alvo` (mais `extra` px). */
async function arrastar(p, id, alvo, extra = 0, soltar = true) {
  const o = await p.$eval(`.alca[data-alca="${id}"]`, (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const d = await p.$eval(`.cat-lista li[data-cat="${alvo}"]`, (e) => { const r = e.getBoundingClientRect(); return r.y + r.height / 2; });
  await p.mouse.move(o.x, o.y); await p.mouse.down();
  await p.mouse.move(o.x, o.y + (d + extra - o.y) / 2, { steps: 4 });
  await p.mouse.move(o.x, d + extra, { steps: 4 });
  if (soltar) { await p.mouse.up(); await sleep(150); }
  return o;
}

for (const [rotuloVp, vp] of [['celular', CEL], ['PC', PC]]) {
  await caso(`3.3.0 categorias em lista (${rotuloVp}): uma linha por categoria, selos Economia e Sobra, grupos com contagem, sem campo, seletor nem lixeira (AC-001, AC-002, AC-003)`, async () => {
    const a = criarAmbiente(abasAjustes());
    const p = await abrir(a, vp, montarPagina(a, 'aj-lista-' + rotuloVp));
    await pronto(p); await sincronizado(p); await sleep(300); await sincronizado(p);
    await p.evaluate(() => { S.dados.categoriaSobra = 'extra'; });
    await irPara(p, 'ajustes', 'categorias');
    assert.equal((await p.$$('.linha-cat-aj')).length, 8);
    assert.deepEqual(await p.$$eval('.cat-grupo .grupo-titulo', (l) => l.map((e) => e.textContent.replace(/\s+/g, ' ').trim())), ['Fixos · 3', 'Variáveis · 3', 'Rendas · 2']);
    const linha = await p.$eval('li[data-cat="aluguel"] .linha-cat-aj', (e) => ({
      ponto: Boolean(e.querySelector('.ponto')), nome: e.querySelector('.nome').textContent, qtd: e.querySelector('.qtd').textContent, seta: Boolean(e.querySelector('svg.ic')), alto: e.getBoundingClientRect().height, corPonto: getComputedStyle(e.querySelector('.ponto')).backgroundColor,
    }));
    assert.deepEqual([linha.ponto, linha.nome, linha.qtd, linha.seta], [true, 'Aluguel', '2 lanç.', true]);
    assert.notEqual(linha.corPonto, 'rgba(0, 0, 0, 0)', 'a bolinha tem a cor da categoria');
    assert.ok(linha.alto < 60, 'uma linha só: ' + linha.alto);
    const alturas = await p.$$eval('.linha-cat-aj', (l) => l.map((e) => Math.round(e.getBoundingClientRect().height)));
    assert.ok(Math.max(...alturas) < 60, 'nenhuma linha quebra em duas: ' + alturas);
    assert.equal(await p.$eval('li[data-cat="guardar"] .selo', (e) => e.textContent), 'Economia');
    assert.equal(await p.$eval('li[data-cat="extra"] .selo', (e) => e.textContent), 'Sobra');
    assert.equal((await p.$$('.cat-lista .selo')).length, 2, 'só as duas categorias especiais têm selo');
    assert.equal((await p.$$('#h-cats-aj ~ * input, #h-cats-aj ~ * select, #h-cats-aj ~ * [data-acao="cat-apagar"]')).length, 0, 'sem campo, seletor nem lixeira na lista');
    await p.close();
  });
}

await caso('3.3.0 folha da categoria no celular: painel com nome, grupo em botões, Apagar e o motivo em texto; renomear; apagar com Desfazer (AC-004, AC-005)', async () => {
  const a = criarAmbiente(abasAjustes());
  const p = await abrir(a, CEL, montarPagina(a, 'aj-folha'));
  await pronto(p); await sincronizado(p); await sleep(300); await sincronizado(p);
  await p.evaluate(() => { S.dados.categoriaSobra = 'extra'; });
  await abrirCatNaFolha(p, 'mercado');
  assert.equal(await p.$eval('#fc-nome', (e) => e.value), 'Mercado');
  assert.deepEqual(await p.$$eval('.folha [data-f="grupo"]', (l) => l.map((e) => [e.textContent, e.getAttribute('aria-pressed')])), [['Fixos', 'false'], ['Variáveis', 'true'], ['Rendas', 'false']]);
  assert.equal(await p.$eval('#fc-resumo', (e) => e.textContent), 'Variáveis · 1 lançamento');
  assert.equal((await p.$eval('#fc-apagar', (e) => e.textContent)).trim(), 'Apagar categoria');
  // com lançamentos: desativado e o motivo à vista
  assert.equal(await p.$eval('#fc-apagar', (e) => e.disabled), true);
  assert.equal(await p.$eval('#fc-motivo', (e) => e.textContent), 'Tem 1 lançamento: mova-o para outra categoria antes de apagar.');
  assert.ok(await p.$eval('#fc-motivo', (e) => e.getBoundingClientRect().height > 0), 'o motivo aparece na tela');
  assert.equal(await p.$eval('#fc-apagar', (e) => e.getAttribute('aria-describedby')), 'fc-motivo');
  // renomear: Enter grava e a folha acompanha
  await substituir(p, '#fc-nome', 'Mercado e feira'); await p.keyboard.press('Enter'); await sleep(250); await sincronizado(p);
  assert.ok(a.servidor.planilha.ler('categorias').some((l) => l[0] === 'mercado' && l[1] === 'Mercado e feira'), 'nome gravado');
  assert.equal(await p.$eval('.folha h2', (e) => e.textContent), 'Mercado e feira');
  await fecharFolhas(p);
  assert.equal(await p.$eval('li[data-cat="mercado"] .nome', (e) => e.textContent), 'Mercado e feira');
  const focoAtual = await p.evaluate(() => document.activeElement.dataset.foco || document.activeElement.tagName + '#' + document.activeElement.id);
  assert.equal(focoAtual, 'cat-mercado', 'o foco volta à linha que abriu a folha: ' + focoAtual);
  // motivos das categorias especiais
  await p.$eval('[data-acao="cat-editar"][data-cat="guardar"]', (e) => e.click()); await folhaAberta(p);
  assert.match(await p.$eval('#fc-motivo', (e) => e.textContent), /categoria de economia/);
  assert.equal(await p.$eval('#fc-apagar', (e) => e.disabled), true);
  await fecharFolhas(p);
  await p.$eval('[data-acao="cat-editar"][data-cat="extra"]', (e) => e.click()); await folhaAberta(p);
  assert.match(await p.$eval('#fc-motivo', (e) => e.textContent), /sobra de um mês para o outro/);
  assert.equal(await p.$eval('#fc-apagar', (e) => e.disabled), true);
  await fecharFolhas(p);
  // sem lançamentos e sem papel especial: apaga, a folha fecha e o aviso desfaz
  await p.$eval('[data-acao="cat-editar"][data-cat="lazer"]', (e) => e.click()); await folhaAberta(p);
  assert.equal(await p.$eval('#fc-apagar', (e) => e.disabled), false);
  assert.equal(await p.$eval('#fc-motivo', (e) => e.textContent), '');
  await p.$eval('#fc-apagar', (e) => e.click()); await semFolha(p); await sleep(250); await sincronizado(p);
  assert.ok(!a.servidor.planilha.ler('categorias').some((l) => l[0] === 'lazer'), 'apagada na planilha');
  assert.equal((await p.$$('li[data-cat="lazer"]')).length, 0);
  await avisoDesfazer(p); await sleep(250); await sincronizado(p);
  assert.ok(a.servidor.planilha.ler('categorias').some((l) => l[0] === 'lazer'), 'Desfazer devolve');
  await p.close();
});

await caso('3.3.0 nova categoria no grupo certo: “+ Nova em Variáveis” abre a folha com Variáveis escolhido e a nova vai para o fim do grupo (AC-007)', async () => {
  const a = criarAmbiente(abasAjustes());
  const p = await abrir(a, CEL, montarPagina(a, 'aj-nova'));
  await pronto(p); await sincronizado(p);
  await irPara(p, 'ajustes', 'categorias');
  assert.deepEqual(await p.$$eval('.cat-mais', (l) => l.map((e) => e.textContent.trim())), ['Nova em Fixos', 'Nova em Variáveis', 'Nova em Rendas']);
  await p.$eval('[data-acao="cat-nova"][data-grupo="variavel"]', (e) => e.click()); await folhaAberta(p);
  assert.equal(await p.$eval('.folha h2', (e) => e.textContent), 'Nova categoria');
  assert.equal(await grupoNaFolha(p), 'variavel');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'fc-nome', 'o campo de nome já vem focado');
  // vazio não cria
  await p.$eval('[data-f="criar"]', (e) => e.click()); await sleep(200);
  assert.equal((await p.$$('.folha')).length, 1, 'sem nome a folha continua aberta');
  await p.type('#fc-nome', 'Academia'); await p.keyboard.press('Enter'); await semFolha(p); await sleep(250); await sincronizado(p);
  const linha = a.servidor.planilha.ler('categorias').find((l) => l[1] === 'Academia');
  assert.ok(linha && linha[2] === 'variavel', JSON.stringify(linha));
  assert.deepEqual((await idsNaTela(p, 'variavel')).slice(-1), [linha[0]], 'aparece no fim de Variáveis');
  assert.equal(Number(linha[3]), 9, 'a ordem vem depois de todas');
  // a mesma folha deixa trocar o grupo antes de criar
  await p.$eval('[data-acao="cat-nova"][data-grupo="renda"]', (e) => e.click()); await folhaAberta(p);
  assert.equal(await grupoNaFolha(p), 'renda');
  await p.$eval('.folha [data-f="grupo"][data-v="fixo"]', (e) => e.click());
  await p.type('#fc-nome', 'Seguro'); await p.$eval('[data-f="criar"]', (e) => e.click()); await semFolha(p); await sleep(250); await sincronizado(p);
  assert.ok(a.servidor.planilha.ler('categorias').some((l) => l[1] === 'Seguro' && l[2] === 'fixo'), 'grupo escolhido na folha');
  await p.close();
});

await caso('3.3.0 modo Ordenar: subir, descer e alça aparecem, o botão vira Concluir, os extremos ficam ocultos e subir/descer grava (AC-008)', async () => {
  const a = criarAmbiente(abasAjustes());
  const p = await abrir(a, CEL, montarPagina(a, 'aj-ordenar'));
  await pronto(p); await sincronizado(p);
  await irPara(p, 'ajustes', 'categorias');
  assert.equal((await p.$$('.alca, [data-acao="cat-mover"]')).length, 0, 'na leitura não há setas nem alça');
  assert.equal((await p.$eval('[data-acao="cat-ordenar"]', (e) => e.textContent)).trim(), 'Ordenar');
  await p.$eval('[data-acao="cat-ordenar"]', (e) => e.click()); await sleep(100);
  assert.equal((await p.$eval('[data-acao="cat-ordenar"]', (e) => e.textContent)).trim(), 'Concluir');
  assert.equal((await p.$$('.alca')).length, 8);
  assert.equal((await p.$$('[data-acao="cat-mover"]')).length, 16);
  assert.equal(await p.$eval('[data-foco="sobe-aluguel"]', (e) => e.classList.contains('oculto') && e.disabled), true, 'o primeiro não sobe: fica oculto');
  assert.equal(await p.$eval('[data-foco="desce-internet"]', (e) => e.classList.contains('oculto') && e.disabled), true, 'o último não desce: fica oculto');
  assert.equal(await p.$eval('[data-foco="sobe-guardar"]', (e) => e.classList.contains('oculto')), false);
  assert.equal(await p.$eval('[data-foco="sobe-guardar"]', (e) => e.getAttribute('aria-label')), 'Subir Guardar');
  await p.$eval('[data-foco="desce-mercado"]', (e) => e.click()); await sleep(250); await sincronizado(p);
  assert.deepEqual(await idsNaTela(p, 'variavel'), ['lazer', 'mercado', 'transporte']);
  assert.deepEqual(await idsDoGrupo(p, 'variavel'), ['lazer', 'mercado', 'transporte']);
  assert.equal(await p.evaluate(() => document.activeElement.dataset.foco), 'desce-mercado', 'o foco acompanha o botão');
  // chega ao fim: o botão que sumiu passa o foco ao outro
  await p.$eval('[data-foco="desce-mercado"]', (e) => e.click()); await sleep(250); await sincronizado(p);
  assert.deepEqual(await idsNaTela(p, 'variavel'), ['lazer', 'transporte', 'mercado']);
  assert.equal(await p.evaluate(() => document.activeElement.dataset.foco), 'sobe-mercado', 'foco no botão que continua visível');
  const o = ordensNaPlanilha(a);
  assert.ok(o.lazer < o.transporte && o.transporte < o.mercado, JSON.stringify(o));
  // Concluir volta à leitura e a ordem vale nas outras telas
  await p.$eval('[data-acao="cat-ordenar"]', (e) => e.click()); await sleep(100);
  assert.equal((await p.$$('.alca')).length, 0);
  assert.deepEqual(await idsNaTela(p, 'variavel'), ['lazer', 'transporte', 'mercado']);
  await p.close();
});

await caso('3.3.0 arrastar pela alça (PC): reordena dentro do grupo, grava só o que mudou e vale nas outras telas; Esc devolve a posição (AC-009, AC-010)', async () => {
  const a = criarAmbiente(abasAjustes());
  const p = await abrir(a, PC, montarPagina(a, 'aj-arrastar'));
  await pronto(p); await sincronizado(p);
  await irPara(p, 'ajustes', 'categorias');
  await p.$eval('[data-acao="cat-ordenar"]', (e) => e.click()); await sleep(100);
  await p.evaluate(() => { window.__ops = []; const orig = registrar; registrar = (op) => { window.__ops.push(op); return orig(op); }; });
  const antes = ordensNaPlanilha(a);
  assert.equal(await p.$eval('.alca', (e) => getComputedStyle(e).touchAction), 'none', 'touch-action: none na alça');
  assert.equal(await p.$eval('.linha-cat-aj', (e) => getComputedStyle(e).touchAction), 'auto', 'e só nela');
  // Esc no meio do arraste: nada muda
  await arrastar(p, 'aluguel', 'internet', 4, false);
  const meio = await p.$$eval('.cat-lista[data-grupo="fixo"] > li', (l) => l.map((e) => e.style.transform));
  assert.ok(meio[0].startsWith('translateY(') && meio[1].startsWith('translateY(') && meio[2].startsWith('translateY('), 'as linhas acompanham o arraste: ' + meio);
  await p.keyboard.press('Escape'); await sleep(100);
  assert.deepEqual(await p.$$eval('.cat-lista[data-grupo="fixo"] > li', (l) => l.map((e) => e.style.transform)), ['', '', ''], 'Esc devolve as linhas');
  await p.mouse.move(100, 100); await p.mouse.up(); await sleep(200); await sincronizado(p);
  assert.deepEqual(await p.evaluate(() => window.__ops.length), 0, 'Esc não grava nada');
  assert.deepEqual(await idsNaTela(p, 'fixo'), ['aluguel', 'guardar', 'internet']);
  assert.deepEqual(ordensNaPlanilha(a), antes);
  // arrastar Guardar para depois de Internet: Aluguel não muda, só dois são gravados
  await arrastar(p, 'guardar', 'internet', 8);
  await sleep(250); await sincronizado(p);
  assert.deepEqual(await idsNaTela(p, 'fixo'), ['aluguel', 'internet', 'guardar']);
  assert.deepEqual(await idsDoGrupo(p, 'fixo'), ['aluguel', 'internet', 'guardar']);
  assert.deepEqual(await p.evaluate(() => window.__ops.map((o) => o.c.id).sort()), ['guardar', 'internet'], 'grava só as categorias cuja ordem mudou');
  const depois = ordensNaPlanilha(a);
  assert.equal(depois.aluguel, antes.aluguel);
  assert.deepEqual([depois.guardar, depois.internet], [antes.internet, antes.guardar], 'permuta os valores de ordem do grupo');
  assert.deepEqual(await p.$$eval('.cat-lista li', (l) => l.map((e) => e.style.transform).filter(Boolean)), [], 'sem resto de transform');
  // arrastar para cima, dentro de Variáveis, e soltar fora do grupo não troca de grupo
  await arrastar(p, 'transporte', 'mercado', -10);
  await sleep(250); await sincronizado(p);
  assert.deepEqual(await idsDoGrupo(p, 'variavel'), ['transporte', 'mercado', 'lazer']);
  await arrastar(p, 'transporte', 'salario', 40);
  await sleep(250); await sincronizado(p);
  assert.deepEqual(await idsDoGrupo(p, 'variavel'), ['mercado', 'lazer', 'transporte'], 'solto abaixo do grupo: vai para o fim dele');
  assert.equal(await p.evaluate(() => catPorId('transporte').grupo), 'variavel');
  // a ordem vale nas outras telas
  await irPara(p, 'mes'); await sleep(200);
  await p.evaluate(() => { S.modoMes = 'planejar'; render(); }); await sleep(150);
  const ordemMes = await p.$$eval('[data-cat]', (l) => [...new Set(l.map((e) => e.dataset.cat))]);
  const pos = (id) => ordemMes.indexOf(id);
  assert.ok(pos('aluguel') < pos('internet') && pos('internet') < pos('guardar'), 'Fixos na nova ordem no Mês: ' + ordemMes);
  assert.ok(pos('mercado') < pos('lazer') && pos('lazer') < pos('transporte'), 'Variáveis na nova ordem no Mês: ' + ordemMes);
  await p.close();
});

await caso('3.3.0 arrastar pela alça no celular: o toque na alça arrasta sem rolar a página (AC-009)', async () => {
  const a = criarAmbiente(abasAjustes());
  const p = await abrir(a, CEL, montarPagina(a, 'aj-arrastar-toque'));
  await pronto(p); await sincronizado(p);
  await irPara(p, 'ajustes', 'categorias');
  await p.$eval('[data-acao="cat-ordenar"]', (e) => e.click()); await sleep(100);
  const o = await p.$eval('.alca[data-alca="mercado"]', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const d = await p.$eval('li[data-cat="transporte"]', (e) => { const r = e.getBoundingClientRect(); return r.y + r.height / 2 + 10; });
  const rolou = await p.evaluate(() => window.scrollY);
  const toque = await p.touchscreen.touchStart(o.x, o.y);
  for (let i = 1; i <= 8; i++) await toque.move(o.x, o.y + ((d - o.y) * i) / 8);
  await toque.end(); await sleep(250); await sincronizado(p);
  assert.equal(await p.evaluate(() => window.scrollY), rolou, 'a página não rolou');
  assert.deepEqual(await idsDoGrupo(p, 'variavel'), ['lazer', 'transporte', 'mercado']);
  await p.close();
});

await caso('3.3.0 Ajustes no celular: índice com seis itens, cada um abre a sua seção com botão de voltar; sair e voltar zera para o índice (AC-011)', async () => {
  const a = criarAmbiente(abasAjustes());
  const p = await abrir(a, CEL, montarPagina(a, 'aj-indice-cel'), { tema: 'dark' });
  await pronto(p); await sincronizado(p);
  await p.tap('.inf-item[data-tela="ajustes"]'); await sleep(250);
  assert.deepEqual(await p.$$eval('.aj-indice .aj-rot', (l) => l.map((e) => e.textContent)), ['Geral', 'Categorias', 'Cartões', 'Seus dados', 'Atualizações', 'Diagnósticos']);
  assert.equal((await p.$$('.aj-secao')).length, 0, 'no celular só o índice, sem seção');
  assert.equal((await p.$$('.aj-volta')).length, 0);
  const resumos = await p.$$eval('.aj-item', (l) => l.map((e) => e.querySelector('.aj-resumo').textContent));
  assert.deepEqual([resumos[0], resumos[1], resumos[2], resumos[4]], ['Casa · Automático', '8', '0', 'v' + (await p.evaluate(() => S.dados.versaoApp))]);
  await p.screenshot({ path: path.join(SAIDA, 'aj-indice-cel.png') });
  const secoes = { geral: 'Geral', categorias: 'Categorias', cartoes: 'Cartões de crédito', dados: 'Seus dados', atualizacoes: 'Atualizações', diagnosticos: 'Diagnósticos' };
  for (const [id, titulo] of Object.entries(secoes)) {
    await p.tap(`.aj-item[data-secao="${id}"]`); await sleep(200);
    assert.equal(await p.$eval('.aj-secao h2', (e) => e.textContent), titulo, id);
    assert.equal((await p.$$('.aj-indice')).length, 0, id + ': o índice some enquanto a seção está aberta');
    assert.equal(await p.evaluate(() => document.activeElement.dataset.foco), 'aj-volta', 'o foco vai ao botão de voltar');
    assert.ok(await p.$eval('.aj-volta', (e) => e.getBoundingClientRect().height >= 43.5), 'alvo de 44 px');
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, id + ': sem rolagem lateral');
    await p.tap('.aj-volta'); await sleep(200);
    assert.equal((await p.$$('.aj-indice')).length, 1, id + ': voltar mostra o índice');
    assert.equal(await p.evaluate(() => document.activeElement.dataset.foco), 'aj-' + id, 'o foco volta ao item de onde saiu');
  }
  // sair de Ajustes e voltar começa pelo índice; tocar em Ajustes de novo, dentro de uma seção, também
  await p.tap('.aj-item[data-secao="categorias"]'); await sleep(200);
  await p.tap('[data-acao="cat-ordenar"]'); await sleep(100);
  await p.tap('.inf-item[data-tela="inicio"]'); await sleep(250);
  await p.tap('.inf-item[data-tela="ajustes"]'); await sleep(250);
  assert.equal((await p.$$('.aj-secao')).length, 0, 'voltou ao índice');
  assert.equal(await p.evaluate(() => S.ordenando), false, 'o modo Ordenar não sobrevive à saída');
  await p.tap('.aj-item[data-secao="dados"]'); await sleep(200);
  await p.tap('.inf-item[data-tela="ajustes"]'); await sleep(250);
  assert.equal((await p.$$('.aj-indice')).length, 1, 'tocar em Ajustes dentro de uma seção volta ao índice');
  await p.close();
});

await caso('3.3.0 Voltar do navegador no celular: da seção de Ajustes volta ao índice e depois à tela anterior; no PC trocar de seção não empilha histórico (AC-011, AC-012)', async () => {
  const a = criarAmbiente(abasAjustes());
  const p = await abrir(a, CEL, montarPagina(a, 'aj-voltar-cel'));
  await pronto(p); await sincronizado(p);
  const tela = () => p.evaluate(() => [S.tela, S.ajSecao]);
  await p.tap('.inf-item[data-tela="ajustes"]'); await sleep(250);
  await p.tap('.aj-item[data-secao="categorias"]'); await sleep(250);
  assert.deepEqual(await tela(), ['ajustes', 'categorias']);
  // folha aberta dentro da seção: o primeiro Voltar fecha só a folha
  await p.tap('[data-acao="cat-editar"][data-cat="mercado"]'); await folhaAberta(p);
  await p.goBack(); await semFolha(p); await sleep(150);
  assert.deepEqual(await tela(), ['ajustes', 'categorias'], 'Voltar fecha a folha e fica na seção');
  await p.goBack(); await sleep(250);
  assert.deepEqual(await tela(), ['ajustes', null], 'Voltar da seção leva ao índice');
  assert.equal((await p.$$('.aj-indice')).length, 1);
  await p.goBack(); await sleep(250);
  assert.equal(await p.evaluate(() => S.tela), 'inicio', 'novo Voltar sai de Ajustes');
  await p.goForward(); await sleep(250);
  assert.deepEqual(await tela(), ['ajustes', null]);
  // o botão de voltar da tela também desempilha: um Voltar depois vai ao Início
  await p.tap('.aj-item[data-secao="dados"]'); await sleep(250);
  await p.tap('.aj-volta'); await sleep(300);
  assert.deepEqual(await tela(), ['ajustes', null]);
  await p.goBack(); await sleep(250);
  assert.equal(await p.evaluate(() => S.tela), 'inicio', 'o botão de voltar da tela não deixou entrada sobrando');
  await p.close();
  const b = criarAmbiente(abasAjustes());
  const q = await abrir(b, PC, montarPagina(b, 'aj-voltar-pc'));
  await pronto(q); await sincronizado(q);
  await q.$eval('.lat-item[data-tela="ajustes"]', (e) => e.click()); await sleep(250);
  const antes = await q.evaluate(() => history.length);
  for (const sec of ['categorias', 'cartoes', 'dados']) { await q.$eval(`.aj-item[data-secao="${sec}"]`, (e) => e.click()); await sleep(150); }
  assert.equal(await q.evaluate(() => history.length), antes, 'no PC trocar de seção não empilha');
  await q.goBack(); await sleep(250);
  assert.equal(await q.evaluate(() => S.tela), 'inicio');
  await q.close();
});

for (const largura of [360, 412]) {
  await caso(`3.3.0 Extrato a ${largura} px: chips e seletor de categoria numa linha só, importar como ícone ao lado da busca`, async () => {
    const a = criarAmbiente(abasAjustes());
    const p = await abrir(a, { ...CEL, width: largura, height: 800 }, montarPagina(a, 'extrato-linha-' + largura), { tema: 'dark' });
    await pronto(p); await sincronizado(p);
    await irPara(p, 'extrato'); await sleep(250);
    const m = await p.evaluate(() => {
      const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: b.left, right: b.right, h: Math.round(b.height) }; };
      const sel = document.querySelector('.chip-select select');
      return { tudo: r('[data-filtro="tudo"]'), rendas: r('[data-filtro="rendas"]'), sel: r('.chip-select'), busca: r('#busca'), imp: r('.ie-abrir'), larg: innerWidth, rolagem: document.documentElement.scrollWidth, textoVazio: sel.options[0].textContent, corte: sel.scrollWidth <= sel.clientWidth + 1 };
    });
    assert.equal(m.tudo.top, m.sel.top, 'chip e seletor na mesma linha: ' + JSON.stringify(m));
    assert.equal(m.rendas.top, m.sel.top);
    assert.ok(m.sel.right <= m.larg, 'o seletor cabe na tela');
    assert.ok(m.rolagem <= m.larg, 'sem rolagem lateral');
    assert.equal(m.textoVazio, 'Categoria');
    assert.equal(m.imp.top, m.busca.top, 'importar na altura da busca');
    assert.equal(m.imp.h, m.busca.h);
    assert.ok(m.imp.left >= m.busca.right, 'importar à direita da busca');
    assert.equal(await p.$eval('.ie-abrir', (e) => [e.getAttribute('aria-label'), e.title, e.dataset.acao, e.dataset.foco].join('|')), 'Importar extrato|Importar extrato|importar-extrato|importar-extrato');
    // categoria de nome longo: o seletor continua na linha e dentro da tela
    await p.evaluate(() => { const c = S.dados.categorias[0]; c.nome = 'Categoria com um nome bem comprido para testar o corte'; render(); });
    await p.select('[data-foco="filtro-cat"]', await p.$eval('[data-foco="filtro-cat"] option:nth-child(2)', (e) => e.value)); await sleep(250);
    const n = await p.evaluate(() => { const b = document.querySelector('.chip-select').getBoundingClientRect(); return { top: Math.round(b.top), right: b.right, larg: innerWidth, tudo: Math.round(document.querySelector('[data-filtro="tudo"]').getBoundingClientRect().top) }; });
    assert.equal(n.top, n.tudo, 'nome longo não quebra a linha');
    assert.ok(n.right <= n.larg, 'nome longo não passa da tela');
    await p.close();
  });
}

await caso('3.3.0 Ajustes no PC: índice à esquerda, seção à direita, começando em Geral (AC-012)', async () => {
  const a = criarAmbiente(abasAjustes());
  const p = await abrir(a, PC, montarPagina(a, 'aj-indice-pc'), { tema: 'dark' });
  await pronto(p); await sincronizado(p); await fontes(p);
  await p.$eval('.lat-item[data-tela="ajustes"]', (e) => e.click()); await sleep(250);
  assert.equal(await p.$eval('.aj-secao h2', (e) => e.textContent), 'Geral', 'começa em Geral');
  assert.equal(await p.$eval('.aj-item[aria-current="page"] .aj-rot', (e) => e.textContent), 'Geral');
  assert.equal((await p.$$('.aj-volta')).length, 0, 'sem botão de voltar no PC');
  const caixas = await p.evaluate(() => { const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, r: b.right, y: b.y }; }; return { indice: r('.aj-indice'), secao: r('.aj-secao') }; });
  assert.ok(caixas.indice.r <= caixas.secao.x, 'índice à esquerda da seção: ' + JSON.stringify(caixas));
  assert.ok(Math.abs(caixas.indice.y - caixas.secao.y) < 4, 'lado a lado, começando na mesma altura');
  await p.screenshot({ path: path.join(SAIDA, 'aj-geral-pc.png') });
  await p.$eval('.aj-item[data-secao="categorias"]', (e) => e.click()); await sleep(200);
  assert.equal(await p.$eval('.aj-secao h2', (e) => e.textContent), 'Categorias');
  assert.equal(await p.$eval('.aj-item[aria-current="page"] .aj-rot', (e) => e.textContent), 'Categorias');
  assert.equal((await p.$$('.aj-indice')).length, 1, 'o índice continua à vista');
  // trocar de aba no menu lateral e voltar recomeça em Geral
  await p.$eval('.lat-item[data-tela="inicio"]', (e) => e.click()); await sleep(200);
  await p.$eval('.lat-item[data-tela="ajustes"]', (e) => e.click()); await sleep(250);
  assert.equal(await p.$eval('.aj-secao h2', (e) => e.textContent), 'Geral');
  await p.close();
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
