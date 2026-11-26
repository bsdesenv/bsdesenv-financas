/**
 * E2E do instalador (T-018): instalar com progresso real, falha numa etapa, sucesso com QR no PC e sem QR
 * no celular, atualizar com progresso e voltar atrás com confirmação.
 *
 *   CHROME_PATH=/usr/bin/google-chrome node testes/e2e-instalador.mjs
 *   PRINTS=/caminho node testes/e2e-instalador.mjs     também grava t018-*.png nessa pasta
 *
 * Sobe testes/preview-instalador.mjs (o google.script.run falso) como processo filho, numa porta própria.
 * Sai com 1 se qualquer caso falhar.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.E2E_PORTA) || 4181;
const PRINTS = process.env.PRINTS ? path.resolve(process.env.PRINTS) : null;
const BASE = `http://127.0.0.1:${PORTA}/`;
const PC = { width: 1440, height: 900 };
const CEL = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const URL_APP = 'https://script.google.com/macros/s/FAKE/exec';

let falhas = 0;
async function caso(nome, fn) {
  try { await fn(); console.log('ok   ' + nome); } catch (e) { falhas++; console.log('FALHA ' + nome + '\n     ' + String(e && e.message).split('\n')[0]); }
}
function exige(cond, texto) { if (!cond) throw new Error(texto); }

function subirPreview() {
  return new Promise((ok, falha) => {
    const filho = spawn(process.execPath, [path.join(RAIZ, 'testes', 'preview-instalador.mjs')], { env: { ...process.env, PORT: String(PORTA) }, stdio: ['ignore', 'pipe', 'pipe'] });
    const t = setTimeout(() => falha(new Error('a prévia não subiu em 10 s')), 10000);
    filho.stdout.on('data', (d) => { if (String(d).includes('Prévia')) { clearTimeout(t); ok(filho); } });
    filho.stderr.on('data', (d) => { clearTimeout(t); falha(new Error(String(d))); });
    filho.on('exit', (c) => { clearTimeout(t); if (c) falha(new Error('a prévia saiu com ' + c)); });
  });
}

const { default: puppeteer } = await import('puppeteer');
const executavel = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((f) => fs.existsSync(f));
const preview = await subirPreview();
const browser = await puppeteer.launch({ headless: true, executablePath: executavel || undefined, args: ['--no-sandbox'] });
const contexto = await browser.createBrowserContext();

/* opcoes: { movel, movimento: 'reduce' | 'no-preference' }. Falha se a página abrir um diálogo nativo. */
async function abrir(cenario, opcoes = {}) {
  const p = await contexto.newPage();
  p.on('pageerror', (e) => { throw e; });
  p.on('dialog', async (d) => { await d.dismiss(); throw new Error('diálogo nativo aberto: ' + d.message()); });
  await p.setViewport(opcoes.movel ? CEL : PC);
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: opcoes.movimento || 'no-preference' }]);
  await p.evaluateOnNewDocument(() => {
    window.__copiado = null;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } }, configurable: true });
  });
  if (opcoes.movel) {
    /* garante pointer: coarse mesmo se esta versão do Chrome não o derivar do toque emulado */
    await p.goto(BASE + '?cenario=autorizar', { waitUntil: 'domcontentloaded' });
    const coarse = await p.evaluate(() => matchMedia('(pointer: coarse)').matches);
    if (!coarse) {
      await p.evaluateOnNewDocument(() => {
        const original = window.matchMedia.bind(window);
        window.matchMedia = (q) => (/pointer:\s*(coarse|fine)/.test(q) ? Object.assign(original('all'), { matches: /coarse/.test(q), media: q }) : original(q));
      });
    }
  }
  await p.goto(`${BASE}?cenario=${cenario}`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#conteudo h2', { timeout: 10000 });
  return p;
}
const texto = (p) => p.evaluate(() => document.body.innerText);
const esperarTexto = (p, re, ms = 8000) => p.waitForFunction((s, f) => new RegExp(s, f).test(document.getElementById('conteudo').innerText), { timeout: ms }, re.source, re.flags);
const foto = async (p, nome) => { if (PRINTS) { fs.mkdirSync(PRINTS, { recursive: true }); await p.screenshot({ path: path.join(PRINTS, nome) }); } };
const log = (p) => p.evaluate(() => window.__log.slice());
const lista = (p) => p.$$eval('.etapas li', (lis) => lis.map((li) => ({ cls: li.className, txt: li.innerText.replace(/\s+/g, ' ').trim() })));
async function ateInstalar(cenario, opcoes) {
  const p = await abrir(cenario, opcoes);
  await p.click('#continuar');
  await p.waitForSelector('#instalar');
  return p;
}

await caso('instalar: quatro etapas, uma por vez, e as quatro com ✓ antes do sucesso', async () => {
  const p = await ateInstalar('pronto-para-instalar');
  await p.evaluate(() => { window.__pausar = 'criarProjeto'; });
  await p.click('#instalar');
  await p.waitForSelector('.etapas li.atual');
  await p.waitForFunction(() => window.__log.includes('criarProjeto'));
  const meio = await lista(p);
  exige(/Conferir o código/.test(meio[0].txt) && /Criar a planilha/.test(meio[1].txt), 'etapas: ' + JSON.stringify(meio));
  exige(meio.map((l) => l.cls).join() === 'feito,feito,atual,futuro', 'estados: ' + meio.map((l) => l.cls));
  exige(/em andamento/.test(meio[2].txt), 'a etapa atual diz "em andamento"');
  exige(/Enviar o código/.test(meio[2].txt) && /Publicar/.test(meio[3].txt), 'nomes das etapas');
  const barra = await p.$eval('#etapas-barra', (b) => ({ now: b.getAttribute('aria-valuenow'), w: document.getElementById('etapas-preenchido').style.width }));
  exige(barra.now === '2' && barra.w === '50%', 'barra com duas etapas: ' + JSON.stringify(barra));
  await p.evaluate(() => window.__liberar());
  await p.waitForFunction(() => document.querySelectorAll('.etapas li.feito').length === 4, { timeout: 5000 });
  exige(await p.$eval('#etapas-barra', (b) => b.getAttribute('aria-valuenow')) === '4', 'barra cheia com as quatro etapas');
  await esperarTexto(p, /Pronto!/);
  exige((await log(p)).filter((f) => f !== 'estado').join() === 'prepararInstalacao,criarPlanilha,criarProjeto,publicarApp', 'ordem das chamadas: ' + (await log(p)));
  await p.close();
});

await caso('falha em criarProjeto: etapa, planilha na lixeira, tentar de novo, à mão e detalhe', async () => {
  const p = await ateInstalar('instalar-erro');
  await p.click('#instalar');
  await p.waitForSelector('.erro-bloco', { timeout: 8000 });
  const t = await texto(p);
  exige(/Parou em: Enviar o código/.test(t), 'mostra a etapa');
  exige(/planilha criada foi para a lixeira/.test(t), 'diz que a planilha foi para a lixeira');
  exige(/Tentar de novo/.test(t) && /Instalar à mão/.test(t) && /Detalhe técnico/.test(t), 'botões e detalhe técnico');
  exige(/Etapa: Enviar o código/.test(await p.$eval('#erro-detalhe', (e) => e.textContent)), 'detalhe traz a etapa');
  await p.click('#erro-repetir');
  await p.waitForFunction(() => window.__log.filter((f) => f === 'criarProjeto').length === 2 && document.querySelector('.erro-bloco'), { timeout: 8000 });
  const l = await log(p);
  exige(l.filter((f) => f === 'prepararInstalacao').length === 1 && l.filter((f) => f === 'criarPlanilha').length === 2, 'nova tentativa cria outra planilha sem reconferir: ' + l);
  await p.close();
});

await caso('falha em criarPlanilha: nada a desfazer', async () => {
  const p = await ateInstalar('instalar-erro-planilha');
  await p.click('#instalar');
  await p.waitForSelector('.erro-bloco', { timeout: 8000 });
  const t = await texto(p);
  exige(/Parou em: Criar a planilha/.test(t) && /Não havia nada criado/.test(t), 'etapa e nada a desfazer');
  exige(!/lixeira/.test(t), 'não fala de lixeira');
  await p.close();
});

await caso('sucesso no PC: QR no canvas com borda de 4 módulos, Copiar endereço, aviso do Google', async () => {
  const p = await ateInstalar('pronto-para-instalar');
  await p.click('#instalar');
  await esperarTexto(p, /Pronto!/);
  const qr = await p.$eval('#qr', (c) => {
    const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data;
    let min = c.width, max = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4] < 128) { min = Math.min(min, x); max = Math.max(max, x); }
    return { lado: c.width, min, max };
  });
  exige(qr.lado > 100 && qr.min > 0 && qr.min % 4 === 0 && qr.lado - 1 - qr.max === qr.min, 'borda de 4 módulos (' + JSON.stringify(qr) + ')');
  const t = await texto(p);
  exige(/Copiar endereço/.test(t) && !/iPhone/.test(t), 'tem Copiar endereço e não tem instrução de celular');
  exige(/não verificou este app/.test(t) && /desenvolvedor é você/.test(t), 'aviso do Google');
  await p.click('#copiar-endereco');
  await p.waitForFunction(() => document.getElementById('copiar-endereco').textContent === 'Copiado');
  exige(await p.evaluate(() => window.__copiado) === URL_APP, 'copiou o endereço do app');
  exige(await p.$eval('#abrir-app', (a) => a.href) === URL_APP && /docs\.google\.com/.test(await p.$eval('#abrir-planilha', (a) => a.href)), 'links do app e da planilha');
  await foto(p, 't018-sucesso-pc.png');
  await p.close();
});

await caso('sucesso no celular: sem QR, instruções de iPhone e Android, aviso do Google', async () => {
  const p = await ateInstalar('pronto-para-instalar', { movel: true });
  exige(await p.evaluate(() => matchMedia('(pointer: coarse)').matches), 'o celular emulado é pointer: coarse');
  await p.click('#instalar');
  await esperarTexto(p, /Pronto!/);
  const t = await texto(p);
  exige(!(await p.$('#qr')) && !(await p.$('canvas')), 'sem QR');
  exige(/iPhone: Safari › Compartilhar › Adicionar à Tela de Início/.test(t) && /Android: Chrome › ⋮ › Adicionar à tela inicial/.test(t), 'instruções dos dois aparelhos');
  exige(/não verificou este app/.test(t) && /desenvolvedor é você/.test(t), 'aviso do Google');
  exige(await p.$('#abrir-app') && await p.$('#abrir-planilha'), 'links do app e da planilha');
  await p.close();
});

await caso('progresso no celular em andamento (print)', async () => {
  const p = await ateInstalar('pronto-para-instalar', { movel: true });
  await p.evaluate(() => { window.__pausar = 'criarProjeto'; });
  await p.click('#instalar');
  await p.waitForFunction(() => window.__log.includes('criarProjeto'));
  exige(/Passo 4 de 4/.test(await texto(p)), 'a trilha continua no passo 4');
  await foto(p, 't018-progresso-cel.png');
  await p.evaluate(() => window.__liberar());
  await p.close();
});

await caso('prefers-reduced-motion: barra sem animação e nada girando; sem a preferência, anima', async () => {
  for (const [movimento, girando, transicao] of [['reduce', 'none', '0s'], ['no-preference', 'girar', '0.3s']]) {
    const p = await ateInstalar('pronto-para-instalar', { movimento });
    await p.evaluate(() => { window.__pausar = 'criarProjeto'; });
    await p.click('#instalar');
    await p.waitForFunction(() => window.__log.includes('criarProjeto'));
    const e = await p.evaluate(() => ({
      anim: getComputedStyle(document.querySelector('.etapas .girando')).animationName,
      trans: getComputedStyle(document.getElementById('etapas-preenchido')).transitionDuration,
      txt: document.querySelector('.etapas li.atual').innerText,
    }));
    exige(e.anim === girando && e.trans === transicao, movimento + ': ' + JSON.stringify(e));
    exige(/em andamento/.test(e.txt), movimento + ': o texto "em andamento" aparece nos dois casos');
    await p.evaluate(() => window.__liberar());
    await p.close();
  }
});

await caso('atualizar: confirma o alvo e mostra progresso real das quatro etapas', async () => {
  const p = await abrir('atualizar', { movel: true });
  const t = await texto(p);
  exige(/Atualizar Finanças Casa/.test(t) && /3\.4\.0 → 3\.5\.0/.test(t), 'nome do projeto e versão atual → nova');
  exige(/Instalador em passos/.test(t), 'novidades');
  exige(/O que fica como está/.test(t) && /Seus dados na planilha/.test(t) && /endereço do app/.test(t) && /arquivos que você criou/.test(t), 'lista do que fica');
  exige(!/Voltar para a versão anterior/.test(t), 'sem cópia, não oferece voltar');
  await foto(p, 't018-atualizar-cel.png');
  await p.evaluate(() => { window.__pausar = 'trocarCodigo'; });
  await p.click('#atualizar');
  await p.waitForFunction(() => window.__log.includes('trocarCodigo'));
  const meio = await lista(p);
  exige(meio.map((l) => l.cls).join() === 'feito,feito,atual,futuro', 'estados: ' + meio.map((l) => l.cls));
  exige(/Conferir o código/.test(meio[0].txt) && /Guardar a cópia/.test(meio[1].txt) && /Trocar o código/.test(meio[2].txt) && /Publicar/.test(meio[3].txt), 'nomes das etapas');
  exige(/Cópia guardada/.test(meio[1].txt), 'nota da etapa feita');
  await p.evaluate(() => window.__liberar());
  await esperarTexto(p, /Atualizado para 3\.5\.0!/);
  exige((await log(p)).filter((f) => f !== 'estado').join() === 'prepararAtualizacao,guardarCopia,trocarCodigo,publicarAtualizacao', 'ordem das chamadas: ' + (await log(p)));
  exige(/Voltar para a versão anterior/.test(await texto(p)), 'depois de atualizar, oferece voltar');
  await p.close();
});

await caso('voltar atrás: confirmação no cartão (cancelar e confirmar) e "Atualizar de novo"', async () => {
  const p = await abrir('atualizar');
  await p.click('#atualizar');
  await esperarTexto(p, /Atualizado para 3\.5\.0!/);
  await p.click('#voltar-abrir');
  await p.waitForSelector('#voltar-sim');
  exige(/Voltar mesmo\?/.test(await texto(p)) && /endereço do app continuam iguais/.test(await texto(p)), 'texto do que acontece');
  exige(!(await log(p)).includes('voltarVersao'), 'nada foi chamado antes de confirmar');
  await p.click('#voltar-nao');
  exige(!!(await p.$('#voltar-abrir')) && !(await p.$('#voltar-sim')), 'cancelar volta ao botão');
  await p.click('#voltar-abrir');
  await p.click('#voltar-sim');
  await esperarTexto(p, /Voltou para a versão 3\.4\.0/);
  exige(await p.evaluate(() => window.__args.voltarVersao[2]) === 8, 'voltou para a cópia 8');
  await p.click('#atualizar-de-novo');
  await esperarTexto(p, /Atualizar Finanças Casa/);
  exige(/Atualizar para 3\.5\.0/.test(await texto(p)) && /3\.4\.0 → 3\.5\.0/.test(await texto(p)), 'oferece atualizar de novo');
  await p.close();
});

await caso('instalador aberto num projeto que já tem cópia: oferece voltar', async () => {
  const p = await abrir('atualizar-copia');
  const t = await texto(p);
  exige(/Voltar para a versão anterior/.test(t) && /Cópia antes de atualizar para 3\.5\.0/.test(t), 'cartão da cópia');
  await p.click('#voltar-abrir');
  await p.click('#voltar-sim');
  await esperarTexto(p, /Voltou para a versão 3\.4\.0/);
  await p.close();
});

await browser.close();
preview.kill();
console.log(falhas ? `\n${falhas} caso(s) falharam` : '\nTodos os casos passaram');
process.exit(falhas ? 1 : 0);
