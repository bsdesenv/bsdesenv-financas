// Junta a gravação da tela com as falas → MP4 no tamanho do layout.json (celular 1080×1920, web 1920×1080; H.264 crf 20 + AAC 160k).
// Uso: ROTEIRO=roteiros/01-x.mjs node montar.mjs saida/01.mp4
//
// Cada fala começa no instante em que a SUA legenda aparece na imagem (`tv`, de linha-do-tempo-real.json, gerado por
// legendas.py). O trecho entre uma fala e a próxima é ACELERADO até caber na fala + respiro (a tela muda enquanto a
// voz descreve; a voz nunca é acelerada). A última fala (encerramento) fica em 1×.
// Tudo num único setpts contínuo (sem trim+concat por trecho, que arredonda até 1 quadro em cada um e acumula).
//
// Fonte única do instante de cada fala NO MP4: video/<nome>/linha-do-tempo-final.json, gravado aqui, depois do ffmpeg (por isso
// é sempre mais novo que o MP4 que descreve). folha.sh e conferir.sh leem dele e não refazem a conta de aceleração.
//   { mp4: caminho real, duracao: s, respiro: s, falas: [{ id, ini, fim, voz, texto }] }   ini/fim em segundos do MP4 já acelerado
import { execFileSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'fs'
import { join, dirname } from 'path'
import { pastas } from './pastas.mjs'

const P = pastas()
const DIR = P.video
const LAYOUT = JSON.parse(readFileSync(join(DIR, 'layout.json'), 'utf-8')) // o tamanho do vídeo vem da gravação, não do perfil
const { inicio, fim: fimRelogio, falas: brutas } = JSON.parse(readFileSync(join(DIR, 'linha-do-tempo-real.json'), 'utf-8'))
const falas = brutas.map((f) => ({ ...f, t: f.tv }))
const ultimaBruta = brutas[brutas.length - 1]
const durTela = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(DIR, 'tela.webm')]))
const fim = Math.min(fimRelogio + (ultimaBruta.tv - ultimaBruta.t), durTela - 0.1) // o fim também chega atrasado na imagem
const DUR = JSON.parse(readFileSync(join(P.falas, 'duracoes.json'), 'utf-8'))
const SAIDA = process.argv[2] || P.saida
mkdirSync(dirname(SAIDA), { recursive: true })
const RESPIRO = 0.3 // o mesmo PAUSA do gravar.mjs

// segmentos [início, fim, velocidade] em segundos da gravação (já descontado o `inicio`)
const segmentos = []
const novoInicio = {}
const linhaDoTempo = []
let saida = 0
falas.forEach((f, i) => {
  const ultima = i + 1 === falas.length
  const prox = ultima ? fim - inicio : falas[i + 1].t
  const v = ultima ? 1 : Math.max(1, (prox - f.t) / (DUR[f.id] + RESPIRO))
  novoInicio[f.id] = saida
  segmentos.push([f.t, prox, v])
  const ini = saida
  saida += (prox - f.t) / v
  linhaDoTempo.push({ id: f.id, ini: +ini.toFixed(3), fim: +saida.toFixed(3), voz: +DUR[f.id].toFixed(3), texto: f.texto })
})
const dur = saida

const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(DIR, 'tela.webm')]
falas.forEach((f) => args.push('-i', join(P.audio, `${f.id}.mp3`)))
const t = '((PTS-STARTPTS)*TB)'
const mapa = segmentos.map(([a, b, v]) => `clip(${t}-${a.toFixed(3)},0,${(b - a).toFixed(3)})/${v.toFixed(4)}`).join('+')
const corte = `[0:v]trim=start=${inicio.toFixed(3)}:end=${fim.toFixed(3)},setpts='(${mapa})/TB'[vc]`
const video = `[vc]scale=${LAYOUT.largura}:${LAYOUT.altura}:flags=lanczos,fps=30,fade=t=in:st=0:d=0.6,fade=t=out:st=${(dur - 1.2).toFixed(2)}:d=1.2,format=yuv420p[vout]`
const atrasos = falas.map((f, i) => `[${i + 1}:a]adelay=${Math.round(novoInicio[f.id] * 1000)}:all=1[a${i}]`).join(';')
const mix = falas.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${falas.length}:normalize=0,afade=t=out:st=${(dur - 1.5).toFixed(2)}:d=1.5[aout]`
args.push('-filter_complex', `${corte};${video};${atrasos};${mix}`, '-map', '[vout]', '-map', '[aout]', '-t', dur.toFixed(3),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', SAIDA)
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] })
writeFileSync(join(DIR, 'linha-do-tempo-final.json'), JSON.stringify({ mp4: realpathSync(SAIDA), duracao: +dur.toFixed(3), respiro: RESPIRO, falas: linhaDoTempo }, null, 1))
const acelerados = segmentos.filter(([, , v]) => v > 1)
const maior = acelerados.reduce((m, s) => Math.max(m, s[2]), 1)
console.log('pronto:', SAIDA, `(${dur.toFixed(1)} s; gravação ${(fim - inicio).toFixed(1)} s; ${acelerados.length} trechos acelerados, maior ${maior.toFixed(1)}×)`)
