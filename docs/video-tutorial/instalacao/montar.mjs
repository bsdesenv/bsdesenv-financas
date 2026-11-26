// Montagem do vídeo 00 (instalação): slides com as capturas reais e as capas da série, voz do kit e MP4.
// As capturas ficam em video/00-instalacao/capturas (fora do git) e já saem com as contas mascaradas.
// Uso, de docs/video-tutorial:  ROTEIRO=roteiros/00-instalacao.mjs node instalacao/montar.mjs
// Antes: ROTEIRO=roteiros/00-instalacao.mjs node gerar-falas.mjs
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import CONFIG from '../config.mjs'
import { pastas, RAIZ } from '../pastas.mjs'

const P = pastas()
const { ROTEIRO, PARTES, VIDEO_INFO } = await import(P.url)
const DUR = JSON.parse(readFileSync(join(P.falas, 'duracoes.json'), 'utf8'))
const CAPTURAS = join(P.video, 'capturas')
const DOCS = join(RAIZ, '..', '..', 'docs', 'img')
const SLIDES = join(P.video, 'slides')
const CLIPES = join(P.video, 'clipes')
mkdirSync(SLIDES, { recursive: true })
mkdirSync(CLIPES, { recursive: true })
mkdirSync(dirname(P.saida), { recursive: true })

const COR = { destaque: '#4338CA', escuro: '#1E1B4B', realce: '#A5B4FC', texto: '#0E1525', suave: '#475467', chip: '#EEF0FF', borda: '#E4E8EE', faixa: '#0E1525', ...CONFIG.COR }
const FONTE = CONFIG.FONTE || 'Inter'
const NUMERO = ['um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito']
const NPASSOS = ['', 'Um passo', 'Dois passos', 'Três passos', 'Quatro passos', 'Cinco passos', 'Seis passos', 'Sete passos', 'Oito passos']
const dois = (n) => String(n).padStart(2, '0')

const CSS_CAPA = `
  html,body{margin:0;padding:0;width:1920px;height:1080px;overflow:hidden;background:#fff;font-family:'${FONTE}','Segoe UI',Arial,sans-serif}
  #capa{position:absolute;inset:0;background:#fff;color:${COR.texto};display:flex;flex-direction:column;justify-content:center;padding:0 160px 0 190px;box-sizing:border-box}
  #capa .barra{position:absolute;left:0;top:0;bottom:0;width:18px;background:${COR.destaque}}
  #capa .kicker{font:700 34px/1.2 '${FONTE}';letter-spacing:6px;text-transform:uppercase;color:${COR.destaque}}
  #capa h1{margin:20px 0 16px;font:700 96px/1.05 '${FONTE}';letter-spacing:-1px}
  #capa h2{margin:8px 0 34px;font:700 80px/1.05 '${FONTE}'}
  #capa p.sub{margin:0;font:400 40px/1.4 '${FONTE}';color:${COR.suave};max-width:1300px}
  #capa .filete{width:180px;height:14px;border-radius:7px;background:${COR.realce};margin-top:60px}
  #capa .cards{display:flex;flex-direction:row;gap:28px;width:100%}
  #capa .card{flex:1 1 0;min-width:0;background:#fff;border-radius:26px;padding:22px 26px 24px;box-shadow:0 8px 30px rgba(36,24,22,.09);border:2px solid ${COR.borda};border-top:10px solid ${COR.destaque};box-sizing:border-box}
  #capa .card .num{font:700 28px/1.1 '${FONTE}';letter-spacing:4px;color:${COR.destaque};white-space:nowrap}
  #capa .card .tit{margin:6px 0 8px;font:700 40px/1.1 '${FONTE}'}
  #capa .card .tops{font:400 28px/1.35 '${FONTE}';color:${COR.suave}}
  #capa .grande{font:700 200px/1 '${FONTE}';color:${COR.destaque};letter-spacing:-10px;margin-bottom:0}
  #capa .chips{display:flex;flex-wrap:wrap;gap:16px;margin-top:28px}
  #capa .chips span{padding:14px 28px;border-radius:999px;background:${COR.chip};color:${COR.escuro};font:600 36px '${FONTE}'}
  #capa .lado{margin-top:34px;border-top:3px solid ${COR.borda};padding-top:18px;display:flex;gap:40px;flex-wrap:wrap}
  #capa .lado div{padding:4px 0;font:500 30px '${FONTE}';color:#8C98AA}
  #capa .lado div b{display:inline-block;width:64px;color:inherit}
  #capa .lado div.atual{color:${COR.texto};font-weight:700}
  #capa .lado div.atual b{color:${COR.destaque}}
`
const CSS_CAPTURA = `
  html,body{margin:0;padding:0;width:1920px;height:1080px;overflow:hidden;background:${COR.faixa};font-family:'${FONTE}','Segoe UI',Arial,sans-serif}
  #card{position:absolute;top:30px;left:50%;transform:translateX(-50%);height:860px;display:flex;align-items:center;justify-content:center;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12)}
  #card img{height:860px;width:auto;max-width:1840px;display:block}
  #legenda{position:absolute;left:0;right:0;bottom:0;height:170px;box-sizing:border-box;background:${COR.faixa};border-top:8px solid ${COR.destaque};padding:16px 56px;display:flex;flex-direction:column;justify-content:center}
  #legenda .cap{font:700 24px/1.1 '${FONTE}';letter-spacing:4px;text-transform:uppercase;color:${COR.realce};margin-bottom:10px}
  #legenda .txt{font:500 40px/1.25 '${FONTE}';color:#fff}
`
const CARREGAR_FONTE = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`
const html = (css, corpo) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">${CARREGAR_FONTE}<style>${css}</style></head><body>${corpo}</body></html>`

function abertura() {
  return html(CSS_CAPA, `<div id="capa"><div class="barra"></div><div class="kicker">${CONFIG.KICKER}</div><h1>${VIDEO_INFO.titulo}</h1><p class="sub">${VIDEO_INFO.subtitulo}</p></div>`)
}
function indice() {
  const cards = PARTES.map((p, i) => `<div class="card"><div class="num">PASSO ${dois(i + 1)}</div><div class="tit">${p.titulo}</div><div class="tops">${p.topicos.join(' · ')}</div></div>`).join('')
  return html(CSS_CAPA, `<div id="capa"><div class="barra"></div><div class="kicker">Neste vídeo</div><h2>${NPASSOS[PARTES.length]}</h2><div class="cards">${cards}</div></div>`)
}
function passo(i) {
  const p = PARTES[i]
  const lado = PARTES.map((x, j) => `<div class="${j === i ? 'atual' : ''}"><b>${dois(j + 1)}</b>${x.titulo}</div>`).join('')
  return html(CSS_CAPA, `<div id="capa"><div class="barra"></div><div class="grande">${dois(i + 1)}</div><div class="kicker">Passo ${i + 1} de ${PARTES.length}</div><h1>${p.titulo}</h1><div class="chips">${p.topicos.map((t) => `<span>${t}</span>`).join('')}</div><div class="lado">${lado}</div></div>`)
}
function encerramento() {
  return html(CSS_CAPA, `<div id="capa"><div class="barra"></div><div class="kicker">${CONFIG.KICKER}</div><h1>${VIDEO_INFO.titulo.replace(/<br>/g, ' ')}</h1><p class="sub">${VIDEO_INFO.encerramento}</p><div class="filete"></div></div>`)
}
function captura(imagem, cap, texto) {
  return html(CSS_CAPTURA, `<div id="card"><img src="${imagem}" alt=""></div><div id="legenda"><div class="cap">${cap}</div><div class="txt">${texto}</div></div>`)
}
function imagemDe(slide) {
  const docs = { 'primeiro-acesso': join(DOCS, 'primeiro-acesso.png'), 'celular-inicio': join(DOCS, 'celular-inicio.png') }
  const caminho = docs[slide] || ['.jpeg', '.jpg', '.png'].map((e) => join(CAPTURAS, slide + e)).find(existsSync)
  if (!caminho) throw new Error(`captura não encontrada: ${slide} em ${CAPTURAS}`)
  const ext = extname(caminho).slice(1).toLowerCase()
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
  return `data:${mime};base64,${readFileSync(caminho).toString('base64')}`
}

const slides = []
let parte = null
ROTEIRO.forEach((cena, ci) => {
  if (cena.parte !== undefined) parte = cena.parte
  cena.falas.forEach((f, fi) => {
    const id = `c${dois(ci)}f${fi}`
    const voz = DUR[id]
    if (!voz) throw new Error(`sem voz para ${id}; rode gerar-falas.mjs`)
    let corpo
    if (cena.abertura) corpo = abertura()
    else if (cena.parte !== undefined) corpo = passo(cena.parte)
    else if (f.slide === 'indice') corpo = indice()
    else if (f.slide === 'encerramento') corpo = encerramento()
    else corpo = captura(imagemDe(f.slide), parte !== null && cena.capitulo ? `${PARTES[parte].titulo} · ${cena.capitulo}` : '', f.texto)
    slides.push({ id, voz, dur: voz + 0.3, html: corpo, texto: f.texto })
  })
})

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [i, s] of slides.entries()) {
  const png = join(SLIDES, `slide-${String(i + 1).padStart(3, '0')}.png`)
  await page.setContent(s.html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(120)
  await page.screenshot({ path: png, type: 'png' })
  const mp3 = join(P.audio, `${s.id}.mp3`)
  const clip = join(CLIPES, `clip-${String(i + 1).padStart(3, '0')}.mp4`)
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-i', png, '-i', mp3,
    '-t', s.dur.toFixed(3), '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-af', 'apad=pad_dur=0.3,volume=3.2dB', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', clip], { stdio: 'inherit' })
  s.clip = clip
  console.log(`${s.id} ${s.dur.toFixed(2)}s ${s.texto.slice(0, 52)}`)
}
await browser.close()

const lista = join(CLIPES, 'lista.txt')
writeFileSync(lista, slides.map((s) => `file '${s.clip}'`).join('\n') + '\n')
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista,
  '-c', 'copy', '-movflags', '+faststart', P.saida], { stdio: 'inherit' })

const final = []
let t = 0
for (const s of slides) {
  final.push({ id: s.id, ini: +t.toFixed(3), fim: +(t + s.dur).toFixed(3), voz: +s.voz.toFixed(3), texto: s.texto })
  t += s.dur
}
writeFileSync(join(P.video, 'linha-do-tempo-final.json'), JSON.stringify({ mp4: realpathSync(P.saida), duracao: +t.toFixed(3), respiro: 0.3, falas: final }, null, 1))
writeFileSync(join(P.video, 'layout.json'), JSON.stringify({ perfil: 'web', sobreposta: true, largura: 1920, altura: 1080, faixa_y: 910, faixa_h: 170 }, null, 1))
writeFileSync(join(P.video, 'gravacao.txt'), 'Vídeo de instalação: slides de capturas reais; sem ações de gravação a conferir.\n')
console.log(`pronto: ${P.saida} (${t.toFixed(1)} s)`)
