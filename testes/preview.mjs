/**
 * Prévia local do app, sem publicar no Apps Script.
 *
 *   npm run preview              sobe o app com a planilha fictícia em http://localhost:4173
 *   npm run preview -- --data=backup.json   usa um backup JSON (Ajustes › Baixar backup)
 *   npm run preview:prints       gera prints em testes/saida/preview/ (PC e celular)
 *
 * O servidor usa o mesmo src/Codigo.gs e a mesma planilha falsa dos testes.
 * Nada sai da máquina e nada é enviado para o Google.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { criarServidor, abasDoBackup } from './gas-mock.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'testes', 'saida', 'preview');
const PRINTS = process.argv.includes('--prints');
const PORTA = Number(process.env.PORT) || 4173;
const argData = process.argv.find((a) => a.startsWith('--data='));
const arquivoDados = argData ? path.resolve(argData.slice('--data='.length)) : path.join(RAIZ, 'exemplos', 'dados-exemplo.json');
const dados = JSON.parse(fs.readFileSync(arquivoDados, 'utf8'));

let servidor = criarServidor(abasDoBackup(dados));
const html = servidor.ctx.doGet().getContent().replace('<head>', `<head>${ponte()}`);

function ponte() {
  return `<script>
(function () {
  function fazer(ok, erro) {
    return new Proxy({}, { get: function (_, fn) {
      if (fn === 'withSuccessHandler') return function (h) { return fazer(h, erro); };
      if (fn === 'withFailureHandler') return function (h) { return fazer(ok, h); };
      return function () {
        var args = Array.prototype.slice.call(arguments);
        fetch('/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: String(fn), args: args }) })
          .then(function (r) { return r.json(); })
          .then(function (r) { if (r.ok) { if (ok) ok(r.result); } else if (erro) erro({ message: r.error }); })
          .catch(function (e) { if (erro) erro({ message: String(e) }); });
      };
    } });
  }
  window.google = { script: { run: fazer(null, null) } };
})();
</script>`;
}

const servidorHttp = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
    return;
  }
  if (req.method === 'POST' && req.url === '/rpc') {
    let corpo = '';
    req.on('data', (c) => { corpo += c; if (corpo.length > 2e6) req.destroy(); });
    req.on('end', () => {
      let resposta;
      try {
        const { fn, args } = JSON.parse(corpo || '{}');
        if (typeof fn !== 'string' || typeof servidor.ctx[fn] !== 'function') throw new Error('função inexistente: ' + fn);
        resposta = { ok: true, result: servidor.ctx[fn](...(Array.isArray(args) ? args : [])) };
      } catch (e) {
        resposta = { ok: false, error: String((e && e.message) || e) };
      }
      res.writeHead(resposta.ok ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(resposta));
    });
    return;
  }
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (req.url === '/reset' && req.method === 'POST') {
    servidor = criarServidor(abasDoBackup(dados));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Não encontrado');
});

function abrirServidor() {
  return new Promise((ok, falha) => {
    servidorHttp.once('error', falha);
    servidorHttp.listen(PORTA, '127.0.0.1', () => ok());
  });
}

async function prints() {
  const { default: puppeteer } = await import('puppeteer');
  const executavel = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((f) => fs.existsSync(f));
  const browser = await puppeteer.launch({ headless: true, executablePath: executavel || undefined, args: ['--no-sandbox'] });
  const browserContext = await browser.createBrowserContext();
  fs.mkdirSync(SAIDA, { recursive: true });
  const alvos = [
    { nome: 'pc-1728-claro', vp: { width: 1728, height: 1200 }, tema: 'light', full: true },
    { nome: 'pc-1728-escuro', vp: { width: 1728, height: 1200 }, tema: 'dark', full: true },
    { nome: 'pc-1440-claro', vp: { width: 1440, height: 900 }, tema: 'light', full: true },
    { nome: 'pc-1280-claro', vp: { width: 1280, height: 900 }, tema: 'light', full: true },
    { nome: 'pc-1024-claro', vp: { width: 1024, height: 900 }, tema: 'light', full: true },
    { nome: 'celular-390-claro', vp: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, tema: 'light', full: false },
    { nome: 'celular-390-escuro', vp: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, tema: 'dark', full: false },
  ];
  try {
    for (const alvo of alvos) {
      const p = await browserContext.newPage();
      await p.setViewport(alvo.vp);
      await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: alvo.tema }]);
      await p.goto(`http://127.0.0.1:${PORTA}/`, { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => typeof S !== 'undefined' && S.montado && !S.atualizando && !S.fila.length && !S.enviando, { timeout: 20000 });
      await p.evaluate(() => document.fonts.ready).catch(() => {});
      await new Promise((r) => setTimeout(r, 250));
      const caminho = path.join(SAIDA, alvo.nome + '.png');
      await p.screenshot({ path: caminho, fullPage: alvo.full });
      console.log('  ' + path.relative(RAIZ, caminho));
      if (!alvo.full) {
        await p.addStyleTag({ content: '@media (max-width: 639.98px) { .inferior { display: none !important; } }' });
        const completo = path.join(SAIDA, alvo.nome + '-completo.png');
        await p.screenshot({ path: completo, fullPage: true });
        console.log('  ' + path.relative(RAIZ, completo));
      }
      await p.close();
    }
    const abrirExtra = async (vp, tema) => {
      const p = await browserContext.newPage();
      await p.setViewport(vp);
      await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: tema }]);
      await p.goto(`http://127.0.0.1:${PORTA}/`, { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => typeof S !== 'undefined' && S.montado && !S.atualizando && !S.fila.length && !S.enviando, { timeout: 20000 });
      await p.evaluate(() => document.fonts.ready).catch(() => {});
      await new Promise((r) => setTimeout(r, 250));
      return p;
    };
    const planejar = await abrirExtra({ width: 1728, height: 1200 }, 'light');
    await planejar.click('[data-tela="mes"]'); await new Promise((r) => setTimeout(r, 150));
    await planejar.click('[data-modo="planejar"]'); await new Promise((r) => setTimeout(r, 200));
    await planejar.screenshot({ path: path.join(SAIDA, 'pc-1728-planejar.png'), fullPage: true });
    console.log('  ' + path.relative(RAIZ, path.join(SAIDA, 'pc-1728-planejar.png')));
    await planejar.close();

    const avisoPc = await abrirExtra({ width: 1728, height: 1200 }, 'light');
    await avisoPc.click('.cats-avisos .aviso-detalhe summary');
    const cardPc = await avisoPc.$('.g-cats');
    await cardPc.screenshot({ path: path.join(SAIDA, 'pc-1728-avisos.png') });
    console.log('  ' + path.relative(RAIZ, path.join(SAIDA, 'pc-1728-avisos.png')));
    await avisoPc.close();

    const avisoCel = await abrirExtra({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'light');
    await avisoCel.click('.cats-avisos .aviso-detalhe summary');
    const cardCel = await avisoCel.$('.g-cats');
    await cardCel.screenshot({ path: path.join(SAIDA, 'celular-390-avisos.png') });
    console.log('  ' + path.relative(RAIZ, path.join(SAIDA, 'celular-390-avisos.png')));
    await avisoCel.close();
  } finally {
    await browser.close();
  }
}

try {
  await abrirServidor();
  if (PRINTS) {
    console.log('Gerando prints em ' + path.relative(RAIZ, SAIDA) + '/ …');
    await prints();
    console.log('Pronto.');
    process.exit(0);
  }
  console.log('Prévia local: http://localhost:' + PORTA);
  console.log('Dados: ' + path.relative(RAIZ, arquivoDados));
  console.log('Para gerar os prints: npm run preview:prints');
  console.log('Ctrl+C para parar.');
} catch (e) {
  if (e && e.code === 'EADDRINUSE') console.error('A porta ' + PORTA + ' já está em uso. Use PORT=4174 npm run preview.');
  else console.error(e);
  process.exit(1);
}
