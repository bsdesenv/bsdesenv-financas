// Grava a tela do app seguindo o roteiro, no ritmo das falas (duracoes.json), no formato do PERFIL do config.mjs
// (celular: 1080 × 1920 com faixa de legenda; web: 1920 × 1080 com a legenda sobreposta).
// Layout: uma página-moldura do tamanho do vídeo com o app num iframe ampliado (geometria() de comum.mjs) e a legenda numa
// faixa abaixo dele ou sobreposta ao seu pé. Capas, legenda e PDFs ficam na moldura; cursor e anel de clique, dentro do app.
// Toda requisição leva o cabeçalho X-Video-Base com o id da corrida (VIDEO_BASE, posto pelo ensaiar.sh ou pelo produzir.sh):
// é por ele que o cenário escolhe a base de dados. Sem ele a gravação escreveria na base do dev, então o script recusa.
// Saída: video/<nome>/tela.webm + linha-do-tempo.json + layout.json. No fim lista silêncios > 2,5 s.
// Cada corrida guarda as fotos e os erro-<id>.jpg em video/<nome>/fotos/<AAAAMMDD-HHMMSS>/ e imprime a linha
// `pasta da corrida: <caminho>`; a ação que falha sai como `! <id>: <mensagem> → <caminho do erro-<id>.jpg>`.
//
//   ROTEIRO=roteiros/01-x.mjs node gravar.mjs                 gravação de verdade
//   SECO=1 FOTOS=1 ROTEIRO=... node gravar.mjs                ensaio rápido sem vídeo (falas de 1,5 s) + foto ao fim de cada fala
//   RITMO=1 ROTEIRO=... node gravar.mjs                       ensaio no ritmo real das falas, sem vídeo
//   SO_CAPAS=1 ROTEIRO=... node gravar.mjs                    só desenha as capas e salva capa-*.png
//
// REGRA: nenhuma chamada síncrona (execFileSync/execSync) dentro das ações — congela o Node e o gravador perde quadros.
import './ferramentas.mjs' // antes do playwright: aponta o ffmpeg de gravação
import { chromium } from 'playwright'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import { join, resolve } from 'path'
import CONFIG from './config.mjs'
import { pastas } from './pastas.mjs'
import { loginSenha, geometria } from './comum.mjs'

const run = promisify(execFile)
const P = pastas()
const { ROTEIRO, PARTES, VIDEO_INFO } = await import(P.url)
const VIDEO_BASE = process.env.VIDEO_BASE || ''
if (!process.env.SO_CAPAS && !/^[a-z0-9-]{1,80}$/.test(VIDEO_BASE)) {
  console.error('VIDEO_BASE ausente ou fora de ^[a-z0-9-]{1,80}$: rode pelo ensaiar.sh ou pelo produzir.sh, que reservam a vaga e preparam a base.')
  process.exit(2)
}
const SECO = !!process.env.SECO
const ENSAIO = SECO || !!process.env.RITMO
const DURACOES = SECO || process.env.SO_CAPAS ? {} : JSON.parse(readFileSync(join(P.falas, 'duracoes.json'), 'utf-8'))
const PAUSA = 0.3 // respiro entre falas (o mesmo RESPIRO do montar.mjs)

// Geometria em px de SAÍDA: o app ocupa o alto (W × APP_H); a legenda é a faixa que vem abaixo dele (celular) ou uma caixa
// sobreposta ao seu pé (web), de legendaH de altura a partir de legendaY.
const G = geometria()
const { ESC, W, H, APP_H, legendaY, legendaH } = G
const GRAVADO = join(P.video, 'gravando')
mkdirSync(GRAVADO, { recursive: true })

// Pasta da corrida (T5): fotos e erro-<id>.jpg de uma corrida não se misturam com os de outra, que continuam no disco (nada se
// apaga). Quem investiga um "!" lê só a pasta impressa aqui, nunca um erro de roteiro antigo. SO_CAPAS não tira fotos de falas.
const dois = (n) => String(n).padStart(2, '0')
const CARIMBO = (() => {
  const d = new Date()
  return `${d.getFullYear()}${dois(d.getMonth() + 1)}${dois(d.getDate())}-${dois(d.getHours())}${dois(d.getMinutes())}${dois(d.getSeconds())}`
})()
const PASTA_CORRIDA = resolve(P.video, 'fotos', CARIMBO)
if (!process.env.SO_CAPAS) {
  mkdirSync(PASTA_CORRIDA, { recursive: true })
  console.log(`pasta da corrida: ${PASTA_CORRIDA}`)
}

// Navegação fixa no pé do app (T9): a legenda do perfil web é uma caixa sobreposta ao pé do app e cobriria o menu. Os seletores
// de FIXOS_NO_PE sobem acima dela, e o pé da página ganha folga para o último item poder rolar até acima do menu. No celular a
// legenda fica fora do app (FOLGA = 0) e não há o que subir. LIMITE_Y é a linha da legenda em px de CSS do app (o iframe está
// ampliado ESC vezes e encostado em 0,0), e é por ela que o h.mover confere o alvo.
const FIXOS = CONFIG.FIXOS_NO_PE ?? []
const LIMITE_Y = legendaY / ESC
const FOLGA = G.SOBREPOSTA ? Math.max(0, Math.ceil(G.ALTURA - LIMITE_Y)) : 0 // sem legenda sobreposta não há o que subir, nem com arredondamento

// ── visual ────────────────────────────────────────────────────────────────────────────────────────────────────────
const FAMILIA = CONFIG.FONTE || 'Roboto'
const FONTE = `${FAMILIA},'Segoe UI',Arial,sans-serif`
// Paleta neutra; o projeto troca as cores em COR no config.mjs (destaque, escuro, realce e faixa são as que dão a cara).
const COR = { fundo: '#ffffff', destaque: '#1565c0', escuro: '#0d2f5c', realce: '#f2cf1e', texto: '#202124', suave: '#5f6368',
  apagado: '#aeb3b8', chip: '#f1f3f5', borda: '#e1e4e8', faixa: '#14202e', ...CONFIG.COR }

// DENTRO do app (iframe, em px de CSS do celular; a ampliação de ESCALA vezes vem do iframe): cursor e anel de clique.
const ESTILO_APP = `
  #gv-cursor{position:fixed;left:0;top:0;width:20px;height:20px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px)}
  .gv-anel{position:fixed;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;border:2px solid #ff7043;z-index:2147483646;pointer-events:none;animation:gvAnel .55s ease-out forwards}
  @keyframes gvAnel{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
  ${FIXOS.length && FOLGA ? `${FIXOS.join(',')}{transform:translateY(-${FOLGA}px) !important}body{padding-bottom:${FOLGA}px !important}` : ''}`

// NA MOLDURA (px de saída, 1080 × 1920)
const ESTILO_MOLDURA = `
  html,body{margin:0;padding:0;width:${W}px;height:${H}px;overflow:hidden;background:${COR.fundo};font-family:${FONTE}}
  #gv-app{position:absolute;left:0;top:0;width:${G.LARGURA}px;height:${G.ALTURA}px;border:0;background:#fff;transform:scale(${ESC});transform-origin:0 0}
  #gv-faixa{position:absolute;z-index:6;pointer-events:none;left:0;top:${legendaY}px;width:${W}px;height:${legendaH}px;box-sizing:border-box;background:${COR.faixa};border-top:8px solid ${COR.destaque};
    display:flex;align-items:center;justify-content:center;padding:0 56px}
  #gv-legenda{width:100%;text-align:center;color:#fff;font:500 ${G.FONTE_LEGENDA}px/1.3 ${FONTE};opacity:0}
  #gv-legenda::after{content:attr(data-t)}
  #gv-legenda::before{content:attr(data-cap);display:block;margin-bottom:10px;font:700 28px ${FONTE};letter-spacing:4px;text-transform:uppercase;color:${COR.realce}}
  #gv-legenda[data-cap=""]::before{display:none}
  #gv-pdf{position:absolute;left:48px;top:48px;width:${W - 96}px;height:${APP_H - 96}px;z-index:5;background:#525659;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden;display:flex;align-items:center;justify-content:center}
  #gv-capa{position:absolute;inset:0;z-index:10;pointer-events:none;opacity:0;transition:opacity .8s ease;background:${COR.fundo};color:${COR.texto};
    display:flex;flex-direction:column;justify-content:center;padding:0 96px 0 130px;box-sizing:border-box}
  #gv-capa.on{opacity:1}
  #gv-capa .barra{position:absolute;left:0;top:0;bottom:0;width:18px;background:${COR.destaque}}
  #gv-capa .kicker{font:700 34px ${FONTE};letter-spacing:6px;text-transform:uppercase;color:${COR.destaque}}
  #gv-capa h1{margin:28px 0 24px;font:700 108px/1.05 ${FONTE};letter-spacing:-1px}
  #gv-capa h2{margin:14px 0 54px;font:700 92px/1.05 ${FONTE}}
  #gv-capa p.sub{margin:0;font:400 46px/1.4 ${FONTE};color:${COR.suave};max-width:830px}
  #gv-capa .entra{opacity:0;transform:translateY(28px);animation:gvEntra .55s ease forwards}
  @keyframes gvEntra{to{opacity:1;transform:none}}
  #gv-capa .logo{width:470px;height:470px;margin-top:110px}
  #gv-capa .filete{width:180px;height:14px;border-radius:7px;background:${COR.realce};margin-top:60px}
  #gv-capa .cards{display:flex;flex-direction:column;gap:22px;width:100%}
  #gv-capa .card{background:#fff;border-radius:26px;padding:26px 36px 28px;box-shadow:0 8px 30px rgba(36,24,22,.09);border:2px solid ${COR.borda};border-top:10px solid ${COR.destaque}}
  #gv-capa .card .num{font:700 28px ${FONTE};letter-spacing:4px;color:${COR.destaque}}
  #gv-capa .card .tit{margin:6px 0 8px;font:700 54px/1.1 ${FONTE}}
  #gv-capa .card .tops{font:400 32px/1.35 ${FONTE};color:${COR.suave}}
  #gv-capa .grande{font:700 330px/1 ${FONTE};color:${COR.destaque};letter-spacing:-10px;margin-bottom:10px}
  #gv-capa .chips{display:flex;flex-wrap:wrap;gap:16px;margin-top:44px}
  #gv-capa .chips span{padding:14px 28px;border-radius:999px;background:${COR.chip};color:${COR.escuro};font:600 36px ${FONTE}}
  #gv-capa .lado{margin-top:80px;border-top:3px solid ${COR.borda};padding-top:34px}
  #gv-capa .lado div{padding:12px 0;font:500 40px ${FONTE};color:${COR.apagado}}
  #gv-capa .lado div b{display:inline-block;width:84px;color:inherit}
  #gv-capa .lado div.atual{color:${COR.texto};font-weight:700}
  #gv-capa .lado div.atual b{color:${COR.destaque}}`

// Perfil web: a legenda é uma caixa sobreposta ao pé do app, que só existe enquanto há texto, e as capas ganham a
// composição de paisagem. Ainda não foi provado num projeto web: o primeiro que pedir vídeo ajusta aqui.
const ESTILO_SOBREPOSTA = `
  #gv-faixa{opacity:0}
  #gv-faixa.on{opacity:1}
  #gv-capa{padding:0 160px 0 190px}
  #gv-capa h1{font-size:96px;margin:20px 0 16px}
  #gv-capa h2{font-size:80px;margin:8px 0 34px}
  #gv-capa p.sub{font-size:40px;max-width:1300px}
  #gv-capa .logo{width:240px;height:240px;margin-top:40px}
  #gv-capa .cards{flex-direction:row;gap:28px}
  #gv-capa .card{flex:1 1 0;min-width:0;padding:22px 26px 24px}
  #gv-capa .card .num{white-space:nowrap}
  #gv-capa .card .tit{font-size:40px}
  #gv-capa .card .tops{font-size:28px}
  #gv-capa .grande{font-size:200px;margin-bottom:0}
  #gv-capa .chips{margin-top:28px}
  #gv-capa .lado{margin-top:34px;padding-top:18px;display:flex;gap:40px;flex-wrap:wrap}
  #gv-capa .lado div{font-size:30px;padding:4px 0}`

// injetado em toda página e frame: dentro do app, cursor + anel no clique; em todos, o contorno da guarda de instalação.
// Na moldura (window.top === window) não desenha cursor: o mouse passa direto para o iframe.
const NO_APP = ({ estilo }) => {
  // O app manda o navegador sem PWA instalado para a tela Instalar. `estaInstalado()` lê navigator.standalone: aqui ele
  // devolve true, salvo se a moldura disser `__gvInstalado === false` (h.instalado(false), para o vídeo da tela Instalar).
  try {
    Object.defineProperty(Navigator.prototype, 'standalone', { configurable: true, get: () => window.top.__gvInstalado !== false })
  } catch { /* ignora */ }
  if (window.top === window) return
  const instalar = () => {
    if (document.getElementById('gv-cursor')) return
    const css = document.createElement('style')
    css.textContent = estilo
    document.head.appendChild(css)
    const c = document.createElement('div')
    c.id = 'gv-cursor'
    c.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 2l7 19 2.6-8.1L21 10z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    c.style.left = `${innerWidth / 2}px`
    c.style.top = `${innerHeight / 2}px`
    document.body.appendChild(c)
    const mover = (e) => { c.style.left = `${e.clientX}px`; c.style.top = `${e.clientY}px` }
    addEventListener('mousemove', mover, true)
    addEventListener('dragover', mover, true)
    addEventListener('mousedown', (e) => {
      const a = document.createElement('div')
      a.className = 'gv-anel'
      a.style.left = `${e.clientX}px`
      a.style.top = `${e.clientY}px`
      document.body.appendChild(a)
      setTimeout(() => a.remove(), 600)
    }, true)
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', instalar)
  else instalar()
}

// ── conferência do alvo (T4) ──────────────────────────────────────────────────────────────────────────────────────────
// As duas funções rodam DENTRO do iframe do app (locator.evaluate), em px de CSS do app, sem a ampliação da moldura.
// `limY` é a linha onde começa a legenda (LIMITE_Y); abaixo dela, no perfil web, a caixa cobre o app.
// O que o ensaio não via: alvo cortado na borda, atrás do menu fixo do pé ou da legenda, o cursor chegando a um lugar onde
// o clique cairia noutro elemento. Confere o centro do alvo (ou, com `parcial`, o centro da parte visível dele).
const CONFERIR_NO_APP = (el, { limY, fixos, parcial }) => {
  const r = el.getBoundingClientRect()
  const lim = Math.min(limY, innerHeight)
  let x = r.left + r.width / 2
  let y = r.top + r.height / 2
  if (parcial) { // a parte do alvo dentro da área útil; vazia, cai no centro inteiro e reprova como qualquer alvo
    const l = Math.max(r.left, 0), t = Math.max(r.top, 0), rr = Math.min(r.right, innerWidth), b = Math.min(r.bottom, lim)
    if (rr > l && b > t) { x = (l + rr) / 2; y = (t + b) / 2 }
  }
  const nome = (n) => n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className.trim() ? `.${n.className.trim().split(/\s+/)[0]}` : '')
  const falha = (motivo) => ({ ok: false, motivo, x, y })
  // área zero em qualquer eixo (input nativo escondido do Quasar, display:none, display:contents): não há onde o cursor pousar
  if (!r.width || !r.height) return falha('sem área (aponte o elemento visível, não o escondido que o contém ou o substitui)')
  if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) return falha('fora da tela')
  if (y > lim) {
    let fixo = false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') { fixo = true; break }
    return falha(`abaixo da faixa da legenda${fixo ? ' (elemento fixo no pé: declare o seletor em FIXOS_NO_PE do config.mjs)' : ''}`)
  }
  const topo = document.elementFromPoint(x, y)
  if (!topo) return falha('fora da tela')
  if (topo === el || el.contains(topo)) return { ok: true, x, y }
  // os FIXOS_NO_PE sobem acima da legenda e continuam cobrindo o que está atrás: contam como cobertura, com o nome do seletor
  let coberto = topo
  for (const sel of fixos) { try { const f = topo.closest(sel); if (f) { coberto = f; break } } catch { /* seletor inválido: ignora */ } }
  return falha(`coberto por ${nome(coberto)}`)
}

// Leva o alvo ao meio da área útil rolando os ancestrais por scrollTop/scrollLeft, do mais próximo ao documento. Não usa
// scrollIntoView: o suave é cancelado por barra de rolagem sincronizada (num quadro kanban andou ~4 px), e o instantâneo não
// olha o eixo horizontal de um ancestral que não é a janela. `scrollTo({ behavior: 'instant' })` ignora o `scroll-behavior:
// smooth` do CSS, que também animaria a atribuição direta de scrollTop.
const CENTRALIZAR_NO_APP = (el, { limY }) => {
  const lim = Math.min(limY, innerHeight)
  const rolavel = (n) => /(auto|scroll|overlay)/.test(getComputedStyle(n).overflowY + getComputedStyle(n).overflowX) && (n.scrollHeight > n.clientHeight || n.scrollWidth > n.clientWidth)
  const ajustar = (cont, a) => {
    const r = el.getBoundingClientRect()
    cont.scrollTo({ left: cont.scrollLeft + r.left + r.width / 2 - (a.l + a.r) / 2, top: cont.scrollTop + r.top + r.height / 2 - (a.t + a.b) / 2, behavior: 'instant' })
  }
  for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    if (getComputedStyle(n).position === 'fixed') return // alvo em elemento fixo: rolar a página não o move
    if (n === el || !rolavel(n)) continue
    const c = n.getBoundingClientRect()
    ajustar(n, { l: Math.max(c.left, 0), r: Math.min(c.right, innerWidth), t: Math.max(c.top, 0), b: Math.min(c.bottom, lim) })
  }
  ajustar(document.scrollingElement, { l: 0, r: innerWidth, t: 0, b: lim })
}

const NPASSOS = ['', 'Um passo', 'Dois passos', 'Três passos', 'Quatro passos', 'Cinco passos', 'Seis passos', 'Sete passos', 'Oito passos']

function htmlAbertura() {
  return `<div class="barra"></div>
    <div class="kicker entra">${CONFIG.KICKER}</div><h1 class="entra" style="animation-delay:.1s">${VIDEO_INFO.titulo}</h1>
    <p class="sub entra" style="animation-delay:.2s">${VIDEO_INFO.subtitulo}</p>
    ${CONFIG.LOGO ? `<img class="logo entra" style="animation-delay:.35s" src="${CONFIG.LOGO}" alt="">` : ''}`
}
function htmlIndice() {
  const cards = PARTES.map((p, i) => `<div class="card entra" style="animation-delay:${0.25 + i * 0.3}s">
    <div class="num">PASSO ${dois(i + 1)}</div><div class="tit">${p.titulo}</div><div class="tops">${p.topicos.join(' · ')}</div></div>`).join('')
  return `<div class="barra"></div><div class="kicker entra">Neste vídeo</div>
    <h2 class="entra" style="animation-delay:.1s">${NPASSOS[PARTES.length]}</h2><div class="cards">${cards}</div>`
}
function htmlPasso(i) {
  const lado = PARTES.map((p, j) => `<div class="${j === i ? 'atual' : ''}"><b>${dois(j + 1)}</b>${p.titulo}</div>`).join('')
  return `<div class="barra"></div><div class="grande entra">${dois(i + 1)}</div>
    <div class="kicker entra" style="animation-delay:.1s">Passo ${i + 1} de ${PARTES.length}</div><h1 class="entra" style="animation-delay:.15s">${PARTES[i].titulo}</h1>
    <div class="chips entra" style="animation-delay:.25s">${PARTES[i].topicos.map((t) => `<span>${t}</span>`).join('')}</div>
    <div class="lado entra" style="animation-delay:.35s">${lado}</div>`
}
function htmlEncerramento() {
  return `<div class="barra"></div><div class="kicker entra">${CONFIG.KICKER}</div>
    <h1 class="entra" style="animation-delay:.1s">${VIDEO_INFO.titulo.replace(/<br>/g, ' ')}</h1>
    <p class="sub entra" style="animation-delay:.2s">${VIDEO_INFO.encerramento}</p><div class="filete entra" style="animation-delay:.3s"></div>`
}

const URL_MOLDURA = `${CONFIG.BASE_URL}/__gravacao__`
const moldura = (instalado, rotaInicial) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>gravação</title>
  <style id="gv-fontes"></style><style>${ESTILO_MOLDURA}${G.SOBREPOSTA ? ESTILO_SOBREPOSTA : ''}</style></head><body>
  <script>window.__gvInstalado = ${instalado}</script>
  <iframe id="gv-app" name="gv-app" src="${CONFIG.BASE_URL}${rotaInicial}"></iframe>
  <div id="gv-faixa"><div id="gv-legenda" data-t="" data-cap=""></div></div>
  <div id="gv-capa"></div></body></html>`

// Abre o Chrome do sistema (sem baixar navegador), a moldura e o app dentro dela. A moldura é servida pela própria origem do
// front (interceptada aqui, não chega ao servidor): iframe e moldura na mesma origem, para o localStorage do app valer.
async function abrir({ gravar }) {
  const browser = await chromium.launch({ channel: 'chrome' })
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    baseURL: CONFIG.BASE_URL,
    // o id da corrida em TODA requisição: é o cenário que, por ele, aponta o backend para a base desta gravação
    ...(VIDEO_BASE ? { extraHTTPHeaders: { 'X-Video-Base': VIDEO_BASE } } : {}),
    acceptDownloads: true,
    serviceWorkers: 'block', // o service worker do PWA atravessaria a interceptação da moldura e não ajuda na gravação
    ...(VIDEO_INFO.userAgent || CONFIG.USER_AGENT ? { userAgent: VIDEO_INFO.userAgent || CONFIG.USER_AGENT } : {}),
    ...(gravar ? { recordVideo: { dir: GRAVADO, size: { width: W, height: H } } } : {}),
  })
  await context.addInitScript(NO_APP, { estilo: ESTILO_APP })
  const instalado = VIDEO_INFO.instalado ?? CONFIG.INSTALADO
  const rota = VIDEO_INFO.login?.rota || CONFIG.ROTA_LOGIN || '/#/login'
  await context.route(URL_MOLDURA, (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: moldura(instalado, rota) }))
  const pagina = await context.newPage()
  pagina.setDefaultTimeout(15_000)
  await pagina.goto(URL_MOLDURA)
  const app = pagina.frame({ name: 'gv-app' })
  await app.waitForLoadState('load')
  await app.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  // A fonte do app é declarada no documento do iframe; a moldura, onde ficam as capas, não o enxerga: copia os @font-face.
  const faces = await app.evaluate((fam) => [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules] } catch { return [] } })
    .filter((r) => r.constructor.name === 'CSSFontFaceRule' && r.cssText.toLowerCase().includes(fam.toLowerCase())).map((r) => r.cssText), FAMILIA)
  await pagina.evaluate((css) => { document.getElementById('gv-fontes').textContent = css }, faces.join('\n'))
  await pagina.evaluate((fam) => Promise.all([400, 500, 700].map((p) => document.fonts.load(`${p} 20px "${fam}"`))), FAMILIA)
  return { browser, context, pagina, app }
}

async function main() {
  const { browser, context, pagina, app } = await abrir({ gravar: !ENSAIO })
  const t0 = Date.now()
  const agora = () => (Date.now() - t0) / 1000

  let pos = { x: W / 2, y: APP_H / 2 }
  let falaAtual = null // { id, t }: a fala em curso, para o h.ateOFimDaFala
  const conferir = (loc, parcial) => loc.evaluate(CONFERIR_NO_APP, { limY: LIMITE_Y, fixos: FIXOS, parcial })
  const esperar = (ms) => pagina.waitForTimeout(ms)
  const capa = (html) => pagina.evaluate(async (html) => {
    const el = document.getElementById('gv-capa')
    if (el.dataset.k === html && el.classList.contains('on')) return // já está na tela: não refaz a animação
    el.dataset.k = html
    el.innerHTML = html
    await document.fonts.ready
    requestAnimationFrame(() => el.classList.add('on'))
  }, html)
  const camada = (html) => pagina.evaluate((html) => {
    document.getElementById('gv-pdf')?.remove()
    const el = document.createElement('div'); el.id = 'gv-pdf'; el.innerHTML = html
    document.body.appendChild(el)
  }, html)
  const pdfEmCamada = async (buf) => {
    await pagina.evaluate((b64) => {
      document.getElementById('gv-pdf')?.remove()
      const bin = atob(b64); const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      const el = document.createElement('div'); el.id = 'gv-pdf'
      el.innerHTML = `<iframe src="${url}#toolbar=0&view=Fit" style="width:100%;height:100%;border:0"></iframe>`
      document.body.appendChild(el)
    }, buf.toString('base64'))
    await esperar(2500)
  }
  // com folha/diálogo aberto, procura só nele(s); sem nenhum, na página (a página atrás repete rótulos)
  const ESCOPO = (sel) => `.q-dialog ${sel}, body:not(:has(.q-dialog)) ${sel}`
  const INPUT = 'input:not([type=checkbox]):not([type=radio]), textarea'
  const PREFIXO = CONFIG.PREFIXO_ROTA || '/#/'

  // `h.page` é o FRAME do app (locator, evaluate, goto, waitForURL, waitForLoadState); o que é da janela inteira
  // (teclado, download, contexto, foto) está em `h.pagina`.
  const h = {
    page: app,
    pagina,
    esperar,
    // ── cursor e teclado (as coordenadas do mouse são as da moldura, já ampliadas)
    // Antes de mover, o alvo tem de estar à vista: centro na viewport do app, acima da faixa da legenda e sem nada por cima
    // (CONFERIR_NO_APP). Se não estiver, rola uma vez ao meio da área útil (CENTRALIZAR_NO_APP) e confere de novo; ainda
    // errado, lança Error com o motivo, que a ação deixa cair no catch e sai como "!" (o ensaio termina com 1).
    // `{ parcial: true }` libera o alvo grande de propósito (um quadro, uma lista): basta uma parte visível e sem cobertura.
    // Devolve o ponto conferido em px da moldura: o `clicar` com `parcial` clica nele, porque o centro do elemento inteiro
    // pode estar fora da parte visível. Antes de falhar, confere de novo depois de 350 ms: a entrada de q-dialog e q-menu anima ~300 ms.
    async mover(loc, { parcial = false } = {}) {
      await loc.scrollIntoViewIfNeeded()
      let c = await conferir(loc, parcial)
      if (!c.ok) {
        await loc.evaluate(CENTRALIZAR_NO_APP, { limY: LIMITE_Y })
        await esperar(200) // deixa a barra de rolagem sincronizada e o layout assentarem antes de medir de novo
        c = await conferir(loc, parcial)
      }
      if (!c.ok) {
        await esperar(350)
        c = await conferir(loc, parcial)
      }
      if (!c.ok) throw new Error(`h.mover: alvo ${c.motivo} [${String(loc).slice(0, 90)}]`)
      // o iframe está em 0,0 ampliado ESC vezes: o ponto conferido em px do app vira px da moldura
      const alvo = { x: c.x * ESC, y: c.y * ESC }
      const dist = Math.hypot(alvo.x - pos.x, alvo.y - pos.y) / ESC
      await pagina.mouse.move(alvo.x, alvo.y, { steps: Math.max(6, Math.min(26, Math.round(dist / 30))) })
      pos = alvo
      await esperar(150)
      return alvo
    },
    async clicar(loc, opcoes) {
      const alvo = await h.mover(loc, opcoes)
      if (opcoes?.parcial) await pagina.mouse.click(alvo.x, alvo.y) // o `loc.click()` iria ao centro do elemento inteiro
      else await loc.click()
      await esperar(300)
    },
    async digitar(loc, texto, opcoes) { await h.clicar(loc, opcoes); await loc.fill(''); await loc.pressSequentially(texto, { delay: 28 }); await esperar(200) },
    // Segura a ação até `margem` (90%) da voz da fala corrente: "abrir, mostrar, fechar" mantém o estado que a fala descreve
    // durante a voz, sem espera fixa calibrada na tentativa. Sem durações (SECO) volta na hora.
    async ateOFimDaFala(margem = 0.9) {
      const d = falaAtual && DURACOES[falaAtual.id]
      if (d === undefined || d === null || !falaAtual) return
      const falta = falaAtual.t + d * margem - agora()
      if (falta > 0) await esperar(falta * 1000)
    },
    async esc() { await pagina.keyboard.press('Escape'); await esperar(400) },
    async rolar(loc, bloco = 'center') { await loc.first().evaluate((el, b) => el.scrollIntoView({ behavior: 'smooth', block: b }), bloco); await esperar(700) },
    // ── localizadores (Quasar)
    campo: (rotulo) => app.locator(ESCOPO('.q-field:visible')).filter({ has: app.locator('.q-field__label', { hasText: rotulo }) }).first().locator(INPUT).first(),
    select: (rotulo) => app.locator(ESCOPO('.q-select')).filter({ visible: true }).filter({ has: app.locator('.q-field__label', { hasText: rotulo }) }).first(),
    // pelo texto do q-btn (o ícone "limpar" dos campos também é role=button com nome "Limpar")
    botao: (nome) => app.locator(ESCOPO('.q-btn')).filter({ visible: true }).filter({ has: app.locator('span.block').getByText(nome, { exact: true }) }).first(),
    iconeBtn: (icone, escopo = app) => escopo.locator('.q-btn, i.q-icon').filter({ visible: true }).filter({ has: app.locator('i.q-icon', { hasText: new RegExp(`^${icone}$`) }) }).first(),
    async radio(texto, escopo = app, opcoes) { await h.clicar(escopo.locator('.q-radio').filter({ visible: true }).filter({ has: app.locator('.q-radio__label', { hasText: new RegExp(`^\\s*${texto}\\s*$`) }) }).first(), opcoes) },
    async escolher(select, opcao, opcoes) {
      await h.clicar(select, opcoes)
      await esperar(250)
      const op = app.locator('.q-menu .q-item').filter({ hasText: opcao }).first()
      await op.waitFor({ state: 'visible', timeout: 15000 })
      await h.clicar(op, opcoes)
    },
    // ── navegação
    async ir(url) {
      await app.goto(`${CONFIG.BASE_URL}${url}`)
      await app.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
      await esperar(300)
    },
    async rota(r) { await h.ir(`${PREFIXO}${r}`); await esperar(600) },
    // a barra de destinos do app, pelo texto: SELETOR_ABA do config.mjs, além de `.q-tab` e `.q-footer .q-btn`
    async aba(texto) { await h.clicar(app.locator([CONFIG.SELETOR_ABA, '.q-tab', '.q-footer .q-btn'].filter(Boolean).join(', ')).filter({ visible: true }).filter({ hasText: texto }).first()); await app.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await esperar(900) },
    // o contorno da guarda de instalação: false mostra o comportamento real (o app manda para a tela Instalar)
    async instalado(ligado) { await pagina.evaluate((v) => { window.__gvInstalado = v }, ligado) },
    // sai e entra como outra pessoa pela tela de login — use ATRÁS de uma capa. Esvazia a sessão guardada no navegador
    // (localStorage/cookies, só do navegador da gravação) e recarrega, para o app esquecer quem estava dentro.
    async trocarUsuario(email, senha) {
      await app.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
      await context.clearCookies()
      // o `?troca=` força uma carga nova: entra antes do `#` (modo hash) ou ao fim da rota (modo history)
      const [caminho, hash] = (CONFIG.ROTA_LOGIN || '/#/login').split('#')
      await app.goto(`${CONFIG.BASE_URL}${caminho}${caminho.includes('?') ? '&' : '?'}troca=${Date.now()}${hash === undefined ? '' : `#${hash}`}`)
      await app.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
      await loginSenha(h, email, senha)
    },
    // ── PDFs
    async pdfBaixado(gatilho) { // botão que BAIXA um PDF: mostra o arquivo numa camada por cima do app
      const [dl] = await Promise.all([pagina.waitForEvent('download', { timeout: 60_000 }), gatilho()])
      await pdfEmCamada(readFileSync(await dl.path()))
    },
    async mostrarPdfArquivo(caminho) { await pdfEmCamada(readFileSync(caminho)) },
    // relatório que abre em JANELA NOVA: refaz a requisição, fecha a janela e mostra a 1ª página como imagem
    async relatorioPdf(gatilho, trechoUrl) {
      const resp = context.waitForEvent('response', { predicate: (r) => r.url().includes(trechoUrl), timeout: 60_000 })
      await gatilho()
      const r = await resp
      const buf = await (await context.request.fetch(r.request())).body()
      for (const p of context.pages()) if (p !== pagina) await p.close().catch(() => {})
      const tmp = join(P.video, 'relatorio.pdf'); writeFileSync(tmp, buf)
      await run('pdftoppm', ['-f', '1', '-l', '1', '-r', '150', '-png', '-singlefile', tmp, join(P.video, 'relatorio')])
      const src = 'data:image/png;base64,' + readFileSync(join(P.video, 'relatorio.png')).toString('base64')
      await camada(`<img src="${src}" style="max-width:100%;max-height:100%;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.4)">`)
      await esperar(1500)
    },
    async mostrarImagem(caminhoPng) { // ex.: recorte ampliado de um PDF (pdftoppm -x -y -W -H)
      const src = 'data:image/png;base64,' + readFileSync(caminhoPng).toString('base64')
      await camada(`<img src="${src}" style="max-width:96%;max-height:96%;background:#fff">`)
      await esperar(1500)
    },
    async fecharPdf() { await pagina.evaluate(() => document.getElementById('gv-pdf')?.remove()) },
    async fecharJanelasExtras() { for (const p of context.pages()) if (p !== pagina) await p.close().catch(() => {}) },
    // ── capas
    capaAbertura: () => capa(htmlAbertura()),
    indice: () => capa(htmlIndice()),
    capaParte: (i) => capa(htmlPasso(i)),
    capaEncerramento: () => capa(htmlEncerramento()),
    async semCapa() {
      await pagina.evaluate(() => { document.getElementById('gv-capa')?.classList.remove('on') })
      await esperar(650)
      await pagina.evaluate(() => { const el = document.getElementById('gv-capa'); if (el && !el.classList.contains('on')) el.innerHTML = '' })
    },
  }

  // legenda na faixa da moldura (fora do DOM do app: não atrapalha os seletores por texto). O texto vai em atributos e
  // aparece por CSS; se não couber na faixa, a fonte encolhe até 30 px.
  const legenda = (texto, cap) => pagina.evaluate(([texto, cap, base]) => {
    const el = document.getElementById('gv-legenda')
    el.parentElement.classList.toggle('on', !!texto) // só conta no perfil web, onde a caixa some sem texto
    el.dataset.t = texto
    el.dataset.cap = cap && texto ? cap : ''
    el.style.opacity = texto ? '1' : '0'
    el.style.fontSize = ''
    let px = base
    while (px > 30 && el.offsetHeight > el.parentElement.clientHeight - 60) { px -= 2; el.style.fontSize = `${px}px` }
  }, [texto, cap, G.FONTE_LEGENDA])

  // ── login (tudo antes do "inicio" é cortado na montagem)
  const L = VIDEO_INFO.login ?? {}
  await app.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  if (L.modo === 'senha') {
    await loginSenha(h, L.email, L.senha)
    if (L.inicio) await h.ir(L.inicio)
  }
  await esperar(1500)
  await h.capaAbertura()
  await esperar(1500)
  const inicio = agora()

  // ── roteiro
  const linha = []
  let parte = null
  for (const [ci, cena] of ROTEIRO.entries()) {
    if (cena.parte !== undefined) parte = cena.parte
    const rotulo = cena.capitulo ? (parte !== null ? `${PARTES[parte].titulo} · ${cena.capitulo}` : cena.capitulo) : null
    for (const [fi, f] of cena.falas.entries()) {
      const id = `c${dois(ci)}f${fi}`
      const t = agora()
      falaAtual = { id, t }
      linha.push({ id, t: t - inicio, texto: f.texto })
      await legenda(cena.parte !== undefined ? '' : f.texto, rotulo) // nas capas de passo, sem legenda
      try {
        await f.acao(h)
      } catch (e) {
        const foto = join(PASTA_CORRIDA, `erro-${id}.jpg`)
        console.warn(`! ${id}: ${e.message.split('\n')[0]} → ${foto}`)
        await pagina.screenshot({ path: foto, type: 'jpeg', quality: 70 }).catch(() => {})
      }
      if (process.env.FOTOS) await pagina.screenshot({ path: join(PASTA_CORRIDA, `${id}.jpg`), type: 'jpeg', quality: 70 }).catch(() => {})
      const falta = t + (DURACOES[id] ?? 1.5) + PAUSA - agora()
      if (falta > 0) await esperar(falta * 1000)
    }
  }
  await legenda('')
  await esperar(2500)
  const fim = agora()
  const videoPrincipal = ENSAIO ? null : await pagina.video().path() // janelas extras gravam arquivos à parte
  await context.close()
  await browser.close()

  // relatório de silêncios: do fim de cada fala ao começo da seguinte
  let total = 0
  const buracos = []
  linha.forEach((l, i) => {
    const prox = i + 1 < linha.length ? linha[i + 1].t : fim - inicio
    const g = prox - (l.t + (DURACOES[l.id] ?? 1.5))
    total += g
    if (g > 2.5) buracos.push(`${l.id} ${g.toFixed(1)}s  ${l.texto.slice(0, 55)}`)
  })
  console.log(`duração ${(fim - inicio).toFixed(1)} s · silêncio total ${total.toFixed(1)} s · buracos > 2,5 s: ${buracos.length}`)
  buracos.forEach((b) => console.log('  ', b))
  if (ENSAIO) return
  renameSync(videoPrincipal, join(P.video, 'tela.webm'))
  writeFileSync(join(P.video, 'linha-do-tempo.json'), JSON.stringify({ inicio, fim, falas: linha }, null, 2))
  // onde a legenda está no quadro (faixa ou caixa sobreposta, conforme o perfil), para o legendas.py recortar o lugar certo
  // e o montar.mjs e o conferir.sh saberem o tamanho do vídeo
  writeFileSync(join(P.video, 'layout.json'), JSON.stringify({ perfil: G.PERFIL, sobreposta: G.SOBREPOSTA, largura: W, altura: H, faixa_y: legendaY, faixa_h: legendaH }))
  console.log(`gravado (corte a partir de ${inicio.toFixed(1)} s)`)
}

// SO_CAPAS=1: desenha as capas na moldura e salva capa-*.png
async function soCapas() {
  const { browser, pagina } = await abrir({ gravar: false })
  const telas = { abertura: htmlAbertura(), indice: htmlIndice(), passo2: htmlPasso(Math.min(1, PARTES.length - 1)), encerramento: htmlEncerramento() }
  for (const [nome, html] of Object.entries(telas)) {
    await pagina.evaluate(async (html) => {
      const el = document.getElementById('gv-capa')
      el.innerHTML = html
      await document.fonts.ready
      el.classList.add('on')
    }, html)
    await pagina.waitForTimeout(2200)
    await pagina.screenshot({ path: join(P.video, `capa-${nome}.png`) })
  }
  await browser.close()
  console.log('capas salvas em', P.video)
}

;(process.env.SO_CAPAS ? soCapas() : main()).catch((e) => { console.error(e); process.exit(1) })
