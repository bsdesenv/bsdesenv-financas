// Explora telas antes de escrever o roteiro: entra como uma pessoa, visita rotas, fotografa e lista os rótulos visíveis
// (campos, botões, rádios, abas, títulos). Também registra as chamadas à API com erro. No tamanho do perfil, sem moldura.
//
// Uso: SENHA=<senha> node explorar.mjs <email> <rota1,rota2,...>
//   ex.: SENHA=... node explorar.mjs pessoa.exemplo@example.com inicio,pessoas
// A exploração clica e pode gravar: roda numa base própria, nunca na do dev. Sem VIDEO_BASE no ambiente, este arquivo se
// reexecuta pelo explorar.sh, que reserva a vaga, prepara a base, liga o cenário e o desliga ao fim.
// Saída: explorar/<rota>.png (página inteira) + rótulos no terminal + explorar/erros-api.jsonl (pasta ignorada pelo git)
//
// Para etapas que exigem cliques (abrir folha, avançar formulário), copie este arquivo e acrescente as ações passo a
// passo, fotografando e listando os rótulos depois de cada uma (exploração incremental).
import { chromium } from 'playwright'
import { execFileSync } from 'child_process'
import { appendFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import CONFIG from './config.mjs'
import { geometria } from './comum.mjs'

const [email, rotas = ''] = process.argv.slice(2)
const senha = process.env.SENHA
if (!email || !senha) { console.error('uso: SENHA=<senha> node explorar.mjs <email> <rotas>'); process.exit(1) }
const VIDEO_BASE = process.env.VIDEO_BASE || ''
if (!/^[a-z0-9-]{1,80}$/.test(VIDEO_BASE)) {
  try {
    execFileSync('sh', [join(dirname(fileURLToPath(import.meta.url)), 'explorar.sh'), email, rotas], { stdio: 'inherit' })
  } catch (e) { process.exit(e.status || 1) }
  process.exit(0)
}
mkdirSync('explorar', { recursive: true })

export async function rotulos(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
    const out = []
    for (const el of document.querySelectorAll('.q-field__label, .q-btn .block, .q-radio__label, .q-checkbox__label, .q-toggle__label, .q-tab__label, .q-stepper__title, .q-item__label, h1, h2, h3, .text-h6'))
      if (vis(el) && el.textContent.trim()) out.push(`[${el.className.split(' ')[0].replace('q-', '') || el.tagName.toLowerCase()}] ${el.textContent.trim().slice(0, 70)}`)
    return [...new Set(out)]
  })
}

const browser = await chromium.launch({ channel: 'chrome' })
const { EXPLORAR } = geometria()
const context = await browser.newContext({
  viewport: EXPLORAR, deviceScaleFactor: 2, baseURL: CONFIG.BASE_URL,
  extraHTTPHeaders: { 'X-Video-Base': VIDEO_BASE }, // o mesmo cabeçalho da gravação: o cenário escolhe a base por ele
})
// o mesmo contorno da gravação (só PWA): sem ele o app manda o navegador para a tela Instalar
if (CONFIG.INSTALADO) await context.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'standalone', { configurable: true, get: () => true }) })
const page = await context.newPage()
page.setDefaultTimeout(20_000)
page.on('response', async (r) => {
  if (r.url().includes('/api/') && r.status() >= 400)
    appendFileSync('explorar/erros-api.jsonl', JSON.stringify({ status: r.status(), url: r.url(), resp: (await r.text().catch(() => '')).slice(0, 500) }) + '\n')
})
await page.goto(CONFIG.ROTA_LOGIN || '/#/login')
await page.getByLabel(CONFIG.LOGIN.email).fill(email)
await page.getByLabel(CONFIG.LOGIN.senha).fill(senha)
await page.getByRole('button', { name: CONFIG.LOGIN.entrar, exact: true }).click()
await page.waitForURL((u) => !u.href.includes('/login'), { timeout: 30_000 })
await page.waitForTimeout(2500)
for (const r of rotas.split(',').filter(Boolean)) {
  await page.goto(`${CONFIG.PREFIXO_ROTA || '/#/'}${r}`)
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(2000)
  const nome = r.replace(/[^\w-]+/g, '_')
  await page.screenshot({ path: `explorar/${nome}.png`, fullPage: true })
  console.log(`--- ${r}\n` + (await rotulos(page)).join('\n'))
}
await browser.close()
