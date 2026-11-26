// Capturas para o vídeo 00 (instalação): a página "Antes de começar", as telas do instalador em cada passo,
// o progresso e o sucesso com QR code, e o primeiro acesso do app. Fora do fluxo do cenario.sh.
// Uso, de docs/video-tutorial: node instalacao/capturar-instalador.mjs
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const AQUI = import.meta.dirname
const RAIZ = resolve(AQUI, '..', '..', '..')
const SAIDA = join(AQUI, '..', 'video', '00-instalacao', 'capturas')
mkdirSync(SAIDA, { recursive: true })
// A base vazia do primeiro acesso: o servidor de vídeo a lê pelo cabeçalho X-Video-Base. Não é versionada.
const VAZIA = join(AQUI, '..', 'base', 'vazio.json')
if (!existsSync(VAZIA)) {
  mkdirSync(join(AQUI, '..', 'base'), { recursive: true })
  writeFileSync(VAZIA, JSON.stringify({
    lancamentos: [['id', 'ano', 'mes', 'dia', 'categoriaId', 'descricao', 'valor']],
    categorias: [['id', 'nome', 'grupo', 'ordem']],
    orcamento: [['ano', 'categoriaId', 'mes', 'valor']],
    config: [['chave', 'valor'], ['nome', '']],
    recorrencias: [['id', 'categoriaId', 'descricao', 'valor', 'dia', 'inicio', 'fim', 'ativa', 'automatico']],
    cartoes: [['id', 'nome', 'fechamento', 'vencimento', 'limite', 'ativo']],
  }))
}
copyFileSync(join(RAIZ, 'docs', 'img', 'celular-inicio.png'), join(SAIDA, 'celular-inicio.png'))

const html = readFileSync(join(RAIZ, 'instalador', 'Index.html'), 'utf8')
  .replace('<?= script ?>', '')
  .replace('<?= implantacao ?>', '')
  .replace("<?!= incluir_('Qr') ?>", readFileSync(join(RAIZ, 'instalador', 'Qr.html'), 'utf8'))

function paginaInstalador(estado) {
  const mock = `<script>
      (function () {
        var ESTADO = ${JSON.stringify(estado)};
        window.__captura = { estado: ESTADO };
        function resposta(fn) {
          if (fn === 'estado') return ESTADO;
          if (fn === 'prepararInstalacao') return { arquivos: 5, versao: '3.6.0' };
          if (fn === 'criarPlanilha') return { planilhaId: 'planilha-de-video', nome: 'Finanças da casa' };
          if (fn === 'criarProjeto') return { scriptId: 'projeto-de-video' };
          if (fn === 'publicarApp') return { versao: '3.6.0', planilhaUrl: 'https://docs.google.com/spreadsheets/d/planilha-de-video/edit', appUrl: 'https://script.google.com/macros/s/ID_DO_APP_DE_VIDEO/exec' };
          return {};
        }
        window.google = { script: { run: (function montar(ok, err) {
          return new Proxy({}, { get: function (_, fn) {
            if (fn === 'withSuccessHandler') return function (h) { return montar(h, err) };
            if (fn === 'withFailureHandler') return function (h) { return montar(ok, h) };
            return function () {
              var r = resposta(String(fn));
              var espera = fn === 'prepararInstalacao' ? 450 : fn === 'criarPlanilha' ? 900 : fn === 'criarProjeto' ? 900 : fn === 'publicarApp' ? 900 : 60;
              setTimeout(function () { ok && ok(r) }, espera);
            };
          } });
        })() } };
      })();
    </script>`
  return html
    .replace('</head>', `<style>.girando{animation:none!important;background:var(--acento)}</style>${mock}</head>`)
    .replace('<body', `<body data-captura="1"`)
}

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

async function capturar(nome, url, preparar) {
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(700)
  if (preparar) await preparar()
  await page.waitForTimeout(250)
  await page.screenshot({ path: join(SAIDA, nome + '.png'), fullPage: false })
  console.log(nome)
}

// Página "Antes de começar" (docs/index.html)
const antes = 'file://' + join(RAIZ, 'docs', 'index.html')
await capturar('antes-topo', antes)
await capturar('antes-passos', antes, async () => { await page.locator('#passos').scrollIntoViewIfNeeded(); await page.waitForTimeout(500) })
await capturar('antes-aviso', antes, async () => { await page.locator('#t-porque').scrollIntoViewIfNeeded(); await page.waitForTimeout(500) })

// Instalador: cada passo, num arquivo local com google.script.run imitado.
const baseArquivo = join(SAIDA, 'instalador.html')
const base = 'file://' + baseArquivo
async function instalador(estado, acoes) {
  writeFileSync(baseArquivo, paginaInstalador(estado))
  await page.goto(base, { waitUntil: 'load' })
  await page.waitForTimeout(700)
  if (acoes) await acoes()
}

await instalador({ autorizar: 'https://accounts.google.com/o/oauth2/auth' })
await page.screenshot({ path: join(SAIDA, 'instalador-autorizar.png') })
console.log('instalador-autorizar')

await instalador({ autorizar: null, apiLigada: false })
await page.screenshot({ path: join(SAIDA, 'instalador-api.png') })
console.log('instalador-api')

await instalador({ autorizar: null, apiLigada: true, versao: { versao: '3.6.0', data: '2026-11-26', novidades: [] } })
await page.locator('#nome').fill('Finanças da casa')
await page.waitForTimeout(200)
await page.screenshot({ path: join(SAIDA, 'instalador-nome.png') })
console.log('instalador-nome')

await page.locator('#continuar').click()
await page.waitForTimeout(400)
await page.screenshot({ path: join(SAIDA, 'instalador-instalar.png') })
console.log('instalador-instalar')

await page.locator('#instalar').click()
await page.waitForTimeout(1400)
await page.screenshot({ path: join(SAIDA, 'instalador-progresso.png') })
console.log('instalador-progresso')
await page.waitForTimeout(4200)
await page.screenshot({ path: join(SAIDA, 'instalador-sucesso.png') })
console.log('instalador-sucesso')

// Primeiro acesso do app, numa base vazia (o servidor de vídeo precisa estar no ar).
const vazio = 'http://localhost:8787/'
const ctxApp = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, extraHTTPHeaders: { 'X-Video-Base': 'vazio' } })
const app = await ctxApp.newPage()
await app.goto(vazio, { waitUntil: 'domcontentloaded' })
await app.waitForSelector('#boasvindas:not([hidden])', { timeout: 15000 })
await app.waitForTimeout(600)
await app.screenshot({ path: join(SAIDA, 'app-boasvindas.png') })
await app.locator('input:not([type=radio])').first().fill('Finanças da casa')
await app.getByRole('button', { name: 'Continuar' }).click()
await app.waitForTimeout(500)
await app.screenshot({ path: join(SAIDA, 'app-modelos.png') })
await app.getByRole('button', { name: 'Continuar' }).click()
await app.waitForTimeout(600)
await app.screenshot({ path: join(SAIDA, 'app-seu-mes.png') })
await app.getByRole('button', { name: 'Pular' }).click()
await app.waitForSelector('#app:not([hidden])', { timeout: 15000 })
await app.waitForTimeout(900)
await app.screenshot({ path: join(SAIDA, 'app-inicio.png') })
console.log('app: boas-vindas, modelos, seu mês, início')

await browser.close()
