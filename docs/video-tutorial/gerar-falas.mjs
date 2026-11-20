// Gera um .mp3 por fala com a voz neural (edge-tts) e grava duracoes.json. Só o TEXTO das falas vai à Microsoft.
// Uso: ROTEIRO=roteiros/01-primeiros-passos.mjs node gerar-falas.mjs
//      (gera os MP3 que faltam e os de fala cujo texto mudou: o texto falado fica ao lado, em <id>.txt, e é o que se compara)
import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import CONFIG from './config.mjs'
import { pastas } from './pastas.mjs'

const P = pastas()
const { ROTEIRO } = await import(P.url)
const EDGE = process.env.EDGE_TTS || join(homedir(), '.venv-video/bin/edge-tts')
const VOZ = process.env.VOZ || 'pt-BR-AntonioNeural'
mkdirSync(P.audio, { recursive: true })

const pronuncia = (t) => CONFIG.PRONUNCIA.reduce((s, [de, para]) => s.replace(de, para), t)
const duracoes = {}
ROTEIRO.forEach((cena, ci) => cena.falas.forEach((f, fi) => {
  const id = `c${String(ci).padStart(2, '0')}f${fi}`
  const arq = join(P.audio, `${id}.mp3`)
  const falado = pronuncia(f.fala || f.texto)
  const lado = join(P.audio, `${id}.txt`)
  if (!existsSync(arq) || !existsSync(lado) || readFileSync(lado, 'utf-8') !== falado) {
    execFileSync(EDGE, ['--voice', VOZ, '--text', falado, '--write-media', arq], { stdio: 'ignore' })
    writeFileSync(lado, falado)
  }
  duracoes[id] = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]).toString())
  console.log(id, duracoes[id].toFixed(2), f.texto.slice(0, 60))
}))
writeFileSync(join(P.falas, 'duracoes.json'), JSON.stringify(duracoes, null, 2))
console.log(`${Object.keys(duracoes).length} falas, total ${Object.values(duracoes).reduce((s, d) => s + d, 0).toFixed(1)} s`)
