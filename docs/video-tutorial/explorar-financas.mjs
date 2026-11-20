// Exploração das telas do bsdesenv-financas para escrever os roteiros. Não é da receita: é uma ferramenta do projeto.
// Usa a base ligada no cenário (base/atual) pelo cabeçalho X-Video-Base e grava prints em explorar/.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import CONFIG from './config.mjs'

const VIDEO_BASE = process.env.VIDEO_BASE || (() => { try { return execFileSync('sh', ['-c', 'cat base/atual']).toString().trim() } catch { return '' } })()
if (!VIDEO_BASE) { console.error('sem base ligada: rode sh cenario.sh ligar <id>'); process.exit(1) }
const SAIDA = join(process.cwd(), 'explorar')
mkdirSync(SAIDA, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, baseURL: CONFIG.BASE_URL,
  extraHTTPHeaders: { 'X-Video-Base': VIDEO_BASE },
})
const page = await context.newPage()
page.setDefaultTimeout(20000)
page.on('pageerror', (e) => console.error('ERRO NA PÁGINA:', e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) console.error('CONSOLE:', m.text()) })

await page.goto(CONFIG.BASE_URL + '/', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#app:not([hidden])', { timeout: 20000 })
await page.waitForTimeout(1200)

async function rotulos() {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
    const out = []
    for (const el of document.querySelectorAll('[data-acao], button, h1, h2, h3, .rotulo, .kpi-valor, .numero-heroi, .ll-valor, .fc-total, .entrada, input, select, .chip, .inf-item, .lat-item'))
      if (vis(el)) {
        const txt = (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 90)
        if (txt) out.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}${el.dataset && el.dataset.acao ? ` [acao=${el.dataset.acao}]` : ''}${el.dataset && el.dataset.tela ? ` [tela=${el.dataset.tela}]` : ''} :: ${txt}`)
      }
    return [...new Set(out)]
  })
}
async function foto(nome) {
  await page.screenshot({ path: join(SAIDA, nome + '.png'), fullPage: true })
  writeFileSync(join(SAIDA, nome + '.txt'), (await rotulos()).join('\n'))
  console.log(`--- ${nome}`)
  console.log((await rotulos()).join('\n'))
}
async function tela(nome, rotulo) {
  await page.locator('.lat-item').filter({ hasText: rotulo }).first().click()
  await page.waitForTimeout(900)
  await foto(nome)
}
async function abrirNovo() {
  await page.locator('[data-acao="novo"]').filter({ visible: true }).first().click()
  await page.waitForTimeout(700)
}
async function fechar() {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
}

await foto('01-inicio')
await page.locator('[data-acao="detalhe-reserva"]').first().click()
await page.waitForTimeout(700)
await foto('02-composicao')
await fechar()
await abrirNovo()
await foto('03-novo-lancamento')
await fechar()
await tela('04-extrato', 'Extrato')
await tela('05-mes', 'Planejar mês')
await page.locator('[data-acao="modo-mes"][data-modo="planejar"]').first().click()
await page.waitForTimeout(700)
await foto('06-planejar')
const linha = page.locator('.linha-cat').filter({ visible: true }).first()
if (await linha.count()) {
  await linha.click()
  await page.waitForTimeout(800)
  await foto('07-categoria')
  await fechar()
}
await tela('08-planilha', 'Planilha')
const celula = page.locator('.planilha td.cel').filter({ visible: true }).nth(10)
if (await celula.count()) {
  await celula.click()
  await page.waitForTimeout(800)
  await foto('09-celula')
  await fechar()
}
await tela('10-ajustes', 'Ajustes')

await browser.close()
console.log('prints em', SAIDA)
