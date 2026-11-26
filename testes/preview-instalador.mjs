/**
 * Prévia local do instalador, sem publicar no Apps Script.
 *
 *   node testes/preview-instalador.mjs                 sobe em http://localhost:4174/?cenario=sem-api
 *   node testes/preview-instalador.mjs --prova         roda a prova com puppeteer e grava prints em testes/saida/preview-instalador/
 *   node testes/preview-instalador.mjs --prova --saida=/caminho   grava os prints em outra pasta
 *
 * Serve instalador/Index.html com os `<?= ... ?>` e o incluir_('Qr') resolvidos e um google.script.run falso,
 * escolhido por ?cenario=:
 *   autorizar            o Google ainda não foi autorizado (passo 1)
 *   sem-api              API desligada (passo 2); window.__ligarApi() faz o próximo estado() devolver a API ligada
 *   pronto-para-instalar API ligada, versão publicada (passo 3, depois 4); instalar() dá certo
 *   instalar-erro        como o anterior, mas instalar() falha (bloco de erro)
 *   erro-estado          estado() falha (bloco de erro)
 *   atualizar            instalação existente (?script= vem fixo) com versão nova publicada
 * Nada sai da máquina e nada é enviado para o Google.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORT) || 4174;
const PROVA = process.argv.includes('--prova');
const argSaida = process.argv.find((a) => a.startsWith('--saida='));
const SAIDA = argSaida ? path.resolve(argSaida.slice('--saida='.length)) : path.join(RAIZ, 'testes', 'saida', 'preview-instalador');
const ID_SCRIPT = 'AKfycbxFAKEscriptFAKEscriptFAKE0001';
const ID_IMPL = 'AKfycbxFAKEimplantacaoFAKE0000002';
const CENARIOS = ['autorizar', 'sem-api', 'pronto-para-instalar', 'instalar-erro', 'erro-estado', 'atualizar'];

const modelo = fs.readFileSync(path.join(RAIZ, 'instalador', 'Index.html'), 'utf8');
const qr = fs.readFileSync(path.join(RAIZ, 'instalador', 'Qr.html'), 'utf8');

/* Resolve o que o HtmlService resolveria no servidor. */
function pagina(cenario) {
  const atualizar = cenario === 'atualizar';
  return modelo
    .replace('<?= script ?>', atualizar ? ID_SCRIPT : '')
    .replace('<?= implantacao ?>', atualizar ? ID_IMPL : '')
    .replace("<?!= incluir_('Qr') ?>", () => qr)
    .replace('<head>', () => `<head><script>${ponte(cenario)}</script>`);
}

/* google.script.run falso no navegador: cada cenário diz o que estado() e instalar() devolvem. */
function ponte(cenario) {
  return `
(function () {
  var cenario = ${JSON.stringify(cenario)};
  var apiLigada = cenario !== 'sem-api';
  var versao = { versao: '3.5.0', ref: 'v3.5.0', data: '2026-11-26', novidades: ['Instalador em passos', 'Cópia de segurança antes de atualizar'] };
  window.__chamadas = { estado: 0 };
  window.__ligarApi = function () { apiLigada = true; };
  var rotas = {
    estado: function () {
      window.__chamadas.estado++;
      if (cenario === 'erro-estado') throw new Error('Error: Falha ao consultar o GitHub (HTTP 503) em raw.githubusercontent.com');
      if (cenario === 'autorizar') return { autorizar: 'https:\\/\\/script.google.com/macros/auth?fake=1', apiLigada: true, versao: null, alvo: null };
      var e = { autorizar: null, apiLigada: apiLigada, versao: versao, alvo: null };
      if (cenario === 'atualizar') {
        e.alvo = { titulo: 'Finanças', versaoAtual: '3.4.0', ehFinancas: true, copia: null,
          implantacoes: [{ id: ${JSON.stringify(ID_IMPL)}, url: 'https:\\/\\/script.google.com/macros/s/FAKE/exec', versaoNumero: 7 }] };
      }
      return e;
    },
    instalar: function (o) {
      if (cenario === 'instalar-erro') throw new Error('Error: A instalação não terminou: o Google recusou o envio do código (HTTP 403). Nada ficou no seu Drive.');
      return { versao: versao.versao, appUrl: 'https:\\/\\/script.google.com/macros/s/FAKE/exec', planilhaUrl: 'https:\\/\\/docs.google.com/spreadsheets/d/FAKE/edit' };
    },
    atualizar: function () {
      return { jaAtual: false, versaoNova: versao.versao, extrasMantidos: [], implantacoes: ['https:\\/\\/script.google.com/macros/s/FAKE/exec'], copiaSeguranca: 8 };
    },
  };
  function fazer(ok, erro) {
    return new Proxy({}, { get: function (_, fn) {
      if (fn === 'withSuccessHandler') return function (h) { return fazer(h, erro); };
      if (fn === 'withFailureHandler') return function (h) { return fazer(ok, h); };
      return function () {
        var args = Array.prototype.slice.call(arguments);
        setTimeout(function () {
          var r;
          try {
            if (!rotas[fn]) throw new Error('Error: função não simulada: ' + String(fn));
            r = rotas[fn].apply(null, args);
          } catch (e) { if (erro) erro({ message: e.message }); return; }
          if (ok) ok(r);
        }, 250);
      };
    } });
  }
  window.google = { script: { run: fazer(null, null) } };
})();`;
}

const servidorHttp = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') {
    const c = url.searchParams.get('cenario') || 'sem-api';
    if (!CENARIOS.includes(c)) { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Cenário inválido. Use: ' + CENARIOS.join(', ')); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(pagina(c));
    return;
  }
  res.writeHead(url.pathname === '/favicon.ico' ? 204 : 404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end();
});

function abrirServidor() {
  return new Promise((ok, falha) => {
    servidorHttp.once('error', falha);
    servidorHttp.listen(PORTA, '127.0.0.1', () => ok());
  });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
function confirmar(condicao, texto) {
  if (!condicao) throw new Error('FALHOU: ' + texto);
  console.log('  ok  ' + texto);
}

async function prova() {
  const { default: puppeteer } = await import('puppeteer');
  const executavel = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((f) => fs.existsSync(f));
  const browser = await puppeteer.launch({ headless: true, executablePath: executavel || undefined, args: ['--no-sandbox'] });
  const contexto = await browser.createBrowserContext();
  fs.mkdirSync(SAIDA, { recursive: true });
  const celular = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const pc = { width: 1440, height: 900 };
  const abrir = async (cenario, vp, tema = 'light') => {
    const p = await contexto.newPage();
    p.on('pageerror', (e) => { throw e; });
    await p.setViewport(vp);
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: tema }]);
    await p.goto(`http://127.0.0.1:${PORTA}/?cenario=${cenario}`, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#conteudo h2', { timeout: 10000 });
    return p;
  };
  const texto = (p) => p.evaluate(() => document.body.innerText);
  const foto = async (p, nome) => { const f = path.join(SAIDA, nome); await p.screenshot({ path: f }); console.log('  ' + f); };
  try {
    for (const [rotulo, vp] of [['cel', celular], ['pc', pc]]) {
      console.log(rotulo + ' ' + vp.width + 'px: sem-api, volta à aba com a API ligada');
      const p = await abrir('sem-api', vp);
      confirmar(/Passo 2 de 4/.test(await texto(p)), 'mostra "Passo 2 de 4" no passo da API');
      confirmar(/Ligue a API/.test(await texto(p)), 'passo da API aberto');
      await foto(p, 't016-' + rotulo + '-api.png');
      if (rotulo === 'cel') {
        const barra = await p.$eval('#acao', (el) => { const r = el.getBoundingClientRect(); return { fixo: getComputedStyle(el).position, baixo: Math.round(window.innerHeight - r.bottom), alto: Math.round(r.height) }; });
        confirmar(barra.fixo === 'fixed' && barra.baixo === 0, 'celular: ação principal fixa embaixo (' + JSON.stringify(barra) + ')');
      } else {
        const col = await p.$eval('#trilha-pc', (el) => { const r = el.getBoundingClientRect(); return { esq: Math.round(r.left), larg: Math.round(r.width) }; });
        const cont = await p.$eval('#conteudo', (el) => Math.round(el.getBoundingClientRect().left));
        confirmar(col.larg > 0 && col.esq < cont, 'PC: trilha numa coluna à esquerda do conteúdo (' + JSON.stringify(col) + ', conteúdo em x=' + cont + ')');
      }
      const antes = await p.evaluate(() => window.__chamadas.estado);
      await p.evaluate(() => { window.__ligarApi(); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); });
      await p.waitForFunction(() => /Escolha o nome/.test(document.getElementById('conteudo').innerText), { timeout: 5000 });
      const depois = await p.evaluate(() => window.__chamadas.estado);
      confirmar(/Passo 3 de 4/.test(await texto(p)), 'voltou à aba: avançou sozinho para "Passo 3 de 4" (Escolher o nome)');
      confirmar(depois - antes === 1, 'três eventos seguidos viraram uma só chamada a estado() (trava): ' + (depois - antes));
      await p.focus('#nome');
      await p.keyboard.down('Control'); await p.keyboard.press('KeyA'); await p.keyboard.up('Control');
      await p.type('#nome', 'Finanças da casa');
      confirmar(/Finanças da casa/.test(await p.$eval('#criar-nome', (el) => el.textContent)), 'painel "O que será criado" acompanha o nome digitado');
      await foto(p, 't016-' + rotulo + '.png');
      await p.close();
    }
    console.log('pronto-para-instalar: nome, instalar, sucesso');
    let p = await abrir('pronto-para-instalar', pc);
    confirmar(/Passo 3 de 4/.test(await texto(p)) && /Uma planilha no seu Drive/.test(await texto(p)), 'passo 3 mostra "O que será criado"');
    await p.click('#continuar');
    confirmar(/Passo 4 de 4/.test(await texto(p)) && /Instalar o Finanças 3\.5\.0/.test(await texto(p)), 'passo 4 de 4 com o botão Instalar');
    await p.click('#instalar');
    await p.waitForFunction(() => /Pronto!/.test(document.getElementById('conteudo').innerText), { timeout: 5000 });
    confirmar(true, 'instalar() atual continua funcionando (Pronto!)');
    await p.close();

    console.log('instalar-erro: bloco de erro da instalação');
    p = await abrir('instalar-erro', pc);
    await p.click('#continuar'); await p.click('#instalar');
    await p.waitForSelector('.erro-bloco', { timeout: 5000 });
    let t = await texto(p);
    confirmar(/Parou em: Instalar o Finanças/.test(t) && /O que foi desfeito/.test(t) && /Tentar de novo/.test(t) && /Instalar à mão/.test(t) && /Detalhe técnico/.test(t), 'erro mostra etapa, o que foi desfeito, os dois botões e o detalhe técnico');
    await p.close();

    console.log('erro-estado: bloco de erro do estado()');
    p = await abrir('erro-estado', celular);
    await p.waitForSelector('.erro-bloco', { timeout: 5000 });
    t = await texto(p);
    confirmar(/Parou em: Conferir o instalador/.test(t) && /Nada foi criado/.test(t) && /Instalar à mão/.test(t), 'erro do estado(): etapa, desfeito e "Instalar à mão"');
    const href = await p.$eval('#erro-mao', (a) => a.href);
    confirmar(/^https:\/\/github\.com\/bsdesenv\/bsdesenv-financas\/blob\/main\/docs\/INSTALAR\.md/.test(href), '"Instalar à mão" leva ao guia manual');
    await p.click('.erro-bloco summary');
    await foto(p, 't016-cel-erro.png');
    await p.click('#erro-repetir');
    await p.waitForSelector('.erro-bloco', { timeout: 5000 });
    confirmar(true, '"Tentar de novo" consulta de novo');
    await p.close();

    console.log('autorizar: passo 1');
    p = await abrir('autorizar', celular);
    confirmar(/Passo 1 de 4/.test(await texto(p)), 'sem autorização mostra "Passo 1 de 4"');
    await p.close();

    console.log('atualizar: sem trilha');
    p = await abrir('atualizar', pc, 'dark');
    confirmar(/Nova versão disponível/.test(await texto(p)) && !/Passo \d de 4/.test(await texto(p)), 'atualização mostra a nova versão, sem a trilha');
    await foto(p, 't016-pc-atualizar-escuro.png');
    await p.close();
  } finally {
    await browser.close();
  }
}

try {
  await abrirServidor();
  if (PROVA) {
    console.log('Prova do instalador (prints em ' + path.relative(RAIZ, SAIDA) + '/)');
    await prova();
    console.log('Prova ok.');
    process.exit(0);
  }
  console.log('Prévia do instalador: http://localhost:' + PORTA + '/?cenario=sem-api');
  console.log('Cenários: ' + CENARIOS.join(', '));
  console.log('Ctrl+C para parar.');
} catch (e) {
  if (e && e.code === 'EADDRINUSE') console.error('A porta ' + PORTA + ' já está em uso. Use PORT=4175.');
  else console.error(e);
  process.exit(1);
}
