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
 *   E2E_SO="3.1.0" node testes/e2e.mjs   roda só os cenários com esse texto no nome
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
async function abrir(amb, vp, url, { tema, contexto, antes } = {}) {
  const ctx = contexto || (await browser.createBrowserContext());
  const p = await ctx.newPage();
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
  }, AGORA);
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
async function semFolha(p) { await p.waitForFunction(() => !document.querySelector('.folha')); }
async function irPara(p, tela) { await p.evaluate((t) => irPara(t), tela); await sleep(120); }
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
  try { await fn(); resultados.push(['✔', nome, Date.now() - t0]); }
  catch (e) { resultados.push(['✖', nome, Date.now() - t0, (process.env.E2E_VERBOSE ? e.message : e.message.split('\n')[0])]); }
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
  assert.ok(!texto.includes('Acima do plano') && !texto.includes('Encerradas no mês'), 'sem blocos vazios');
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
  await irPara(p, 'ajustes'); await estadoAtu(p, 'erro');
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
  await irPara(p, 'ajustes'); await estadoAtu(p, 'atual');
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
  await irPara(p, 'ajustes'); await p.click('[data-acao="atualizar"]'); await folhaAberta(p);
  await p.waitForSelector('.atu-arq'); await p.click('[data-f="copiar"][data-i="0"]');
  await p.waitForFunction(() => window.__copiado.length === 1);
  assert.equal(await p.evaluate(() => window.__copiado[0]), ARQ_FALSOS[0].conteudo);
  assert.equal(await p.$eval('[data-f="copiar"][data-i="0"]', (e) => e.textContent), 'Copiado ✓');
  const q = await abrir(amb, PC, url, { antes: ambiente(false) });
  await pronto(q); await verificarJa(q); await estadoAtu(q, 'nova');
  await irPara(q, 'ajustes'); await q.click('[data-acao="atualizar"]'); await folhaAberta(q);
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
  await irPara(p, 'ajustes'); await p.click('[data-acao="atualizar"]'); await folhaAberta(p);
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
  await irPara(p, 'ajustes'); await p.click('[data-acao="atualizar"]'); await folhaAberta(p);
  await p.waitForSelector('.atu-erro');
  assert.equal(await p.$eval('.atu-erro', (e) => e.textContent), `A versão ${VERSAO_NOVA} ainda está sendo publicada. Tente de novo em alguns minutos.`);
});

await caso('atualização: com o interruptor desligado não faz nenhuma requisição ao GitHub', async () => {
  const chave = `bf:arquivo:${new URL(url).pathname}:atualizacao-auto`;
  const p = await abrir(amb, PC, url, { antes: async (pg) => {
    pg.github.resposta = githubFalso({ versao: VERSAO_NOVA });
    await pg.evaluateOnNewDocument((k) => localStorage.setItem(k, 'false'), chave);
  } });
  await pronto(p); await irPara(p, 'ajustes');
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
  assert.ok(cartao.includes('Aluguel') && cartao.includes('Quitar'), 'a conta aparece com Quitar');
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
  assert.equal(await p.$eval('.folha [data-f="encerrar"]', (e) => e.textContent.trim()), `Encerrar no mês (libera ${moeda(200)})`);
  await p.click('.folha [data-f="encerrar"]');
  await p.waitForSelector('.folha [data-f="reabrir"]'); await sincronizado(p);
  assert.equal(await p.$eval('.folha [data-f="reabrir"]', (e) => e.textContent.trim()), 'Reabrir no mês');
  assert.equal(String(configDe(a, 'encerrada:2026-11:mercado')[1]), '1', 'marca gravada');
  await esperarHeroi(p, moeda(900));
  await p.click('.folha [data-f="reabrir"]');
  await p.waitForSelector('.folha [data-f="encerrar"]'); await sincronizado(p);
  assert.equal(configDe(a, 'encerrada:2026-11:mercado'), undefined, 'a marca saiu da planilha');
  await esperarHeroi(p, moeda(700));
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

await caso('2.8.0 lançamento rápido: “1200x10” não vira dez lançamentos e o aviso ensina o *', async () => {
  const dados = { nome: 'Vezes', categorias: catsBase(), anos: { 2026: { lancamentos: [
    { id: 'v1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'rapido-vezes'));
  await pronto(p);
  const antes = a.linhas().length;
  await p.click('#quick');
  await p.type('#quick', '1200x10 compras geladeira');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.aviso .aviso-txt'); await sleep(300); await sincronizado(p);
  assert.ok((await textoAviso(p)).includes('use *'), await textoAviso(p));
  assert.equal(a.linhas().length, antes, 'nada gravado');
  assert.equal(await p.evaluate(() => S.fila.length), 0);
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

await caso('2.8.1 grupo protegido: com lançamentos não vira renda; Fixos↔Variáveis tem Desfazer; sem lançamentos pode virar renda', async () => {
  const dados = { nome: 'Grupo', categorias: [...catsBase(), { id: 'lazer', nome: 'Lazer', grupo: 'variavel', ordem: 4 }], anos: { 2026: { lancamentos: [
    { id: 'gp1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
    { id: 'gp2', mes: 11, dia: 2, categoriaId: 'mercado', descricao: '', valor: 50 },
    { id: 'gp3', mes: 11, dia: 3, categoriaId: 'aluguel', descricao: '', valor: 300 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'grupo-protegido'));
  await pronto(p);
  await irPara(p, 'ajustes'); await p.waitForSelector('#cg-mercado');
  const cats = () => JSON.stringify(a.servidor.planilha.ler('categorias'));
  const antes = cats();
  await p.select('#cg-mercado', 'renda'); await sleep(250); await sincronizado(p);
  assert.equal(await p.$eval('#cg-mercado', (e) => e.value), 'variavel', 'o select volta');
  assert.ok(await p.$('.aviso.erro'), 'aviso de erro');
  assert.equal(cats(), antes, 'categorias não mudou');
  // Fixos -> Variáveis
  await p.select('#cg-aluguel', 'variavel'); await sleep(250); await sincronizado(p);
  assert.notEqual(cats(), antes, 'a troca Fixos para Variáveis foi gravada');
  assert.equal(await p.evaluate(() => catPorId('aluguel').grupo), 'variavel');
  await p.waitForSelector('.aviso-acao'); await p.click('.aviso-acao'); await sleep(250); await sincronizado(p);
  assert.equal(await p.evaluate(() => catPorId('aluguel').grupo), 'fixo', 'Desfazer volta');
  assert.equal(cats(), antes);
  // sem lançamentos -> renda
  await p.select('#cg-lazer', 'renda'); await sleep(250); await sincronizado(p);
  assert.equal(await p.evaluate(() => catPorId('lazer').grupo), 'renda', 'sem lançamentos pode virar renda');
  assert.ok(a.servidor.planilha.ler('categorias').some((l) => l[0] === 'lazer' && l.includes('renda')), 'gravado na planilha');
  await p.close();
});

await caso('2.8.1 categoria de economia: o id vai para a config e o botão de apagar fica desabilitado', async () => {
  const dados = { nome: 'Economia', categorias: [...catsBase(), { id: 'guardar', nome: 'Guardar', grupo: 'variavel', ordem: 4 }], anos: { 2026: { lancamentos: [
    { id: 'ec1', mes: 11, dia: 1, categoriaId: 'salario', descricao: '', valor: 1000 },
  ], orcamento: {} } } };
  const a = criarAmbiente(abasDoBackup(dados));
  const p = await abrir(a, PC, montarPagina(a, 'categoria-economia'));
  await pronto(p); await sincronizado(p); await sleep(300); await sincronizado(p);
  const cfg = configDe(a, 'categoriaGuardar');
  assert.ok(cfg && cfg[1] === 'guardar', 'config gravada: ' + JSON.stringify(a.servidor.planilha.ler('config')));
  await irPara(p, 'ajustes'); await p.waitForSelector('[data-acao="cat-apagar"][data-cat="guardar"]');
  assert.equal(await p.$eval('[data-acao="cat-apagar"][data-cat="guardar"]', (e) => e.disabled), true, 'apagar desabilitado');
  assert.equal(await p.$eval('[data-acao="cat-apagar"][data-cat="mercado"]', (e) => e.disabled), false, 'outra categoria sem lançamentos continua apagável');
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

await caso('nenhum erro de JavaScript em nenhuma página', async () => {
  const erros = paginas.flatMap((p) => p.erros);
  assert.deepEqual(erros, []);
});

await browser.close();
for (const [s, n, ms, msg] of resultados) console.log(`${s} ${n} (${ms} ms)${msg ? '\n    → ' + msg : ''}`);
const falhas = resultados.filter((r) => r[0] === '✖').length;
console.log(`\n${resultados.length - falhas}/${resultados.length} cenários passaram`);
process.exit(falhas ? 1 : 0);
