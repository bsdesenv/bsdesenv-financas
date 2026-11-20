import { chromium } from 'playwright'
import { join } from 'node:path'

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('docs.google.com/spreadsheets/d/12dxwb24'))
if (!page) { console.error('planilha não encontrada no navegador'); process.exit(1) }
await page.bringToFront()
await page.evaluate(() => {
  document.getElementById('mask-conta-video')?.remove()
  const conta = document.querySelector('[aria-label^="Conta do Google"]')
  const d = document.createElement('div')
  d.id = 'mask-conta-video'
  let css = 'position:fixed;top:0;right:0;width:300px;height:54px;background:#0E1525;z-index:2147483647;border-bottom-left-radius:12px;'
  if (conta) { const r = conta.getBoundingClientRect(); css = `position:fixed;left:${r.left - 10}px;top:${r.top - 4}px;width:${r.width + 20}px;height:${r.height + 8}px;background:#0E1525;z-index:2147483647;border-radius:12px;` }
  d.style.cssText = css
  document.documentElement.appendChild(d)
})
await page.getByRole('menuitem', { name: 'Extensões', exact: true }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: join(process.cwd(), 'video/00-instalacao/capturas/planilha-extensoes.jpeg'), type: 'jpeg', quality: 85 })
console.log('menu capturado')
process.exit(0)
