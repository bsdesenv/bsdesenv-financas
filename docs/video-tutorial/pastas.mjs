// De onde vêm e para onde vão os arquivos de cada vídeo da série. O roteiro vem pelo caminho (ROTEIRO=...), e as pastas
// de trabalho levam o nome dele, então um vídeo nunca pisa no outro:
//   falas/<nome>/audio/*.mp3 + duracoes.json   (gerar-falas.mjs)
//   video/<nome>/tela.webm + linha-do-tempo*.json + layout.json + fotos/<AAAAMMDD-HHMMSS>/ por corrida   (gravar.mjs, legendas.py)
//   saida/<perfil>/NN-<assunto>.mp4 com PERFIS no config.mjs, ou saida/<nome>.mp4   (montar.mjs, quando o produzir.sh não recebe outro destino)
// Roteiro chamado `roteiro.mjs` usa o nome da pasta onde está.
// No shell: eval "$(node pastas.mjs roteiros/01-primeiros-passos.mjs)"  →  NOME, FALAS, VIDEO, SAIDA, BASE_URL.
import { basename, dirname, join, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import CONFIG from './config.mjs'

export const RAIZ = dirname(fileURLToPath(import.meta.url))

export function pastas(roteiro = process.env.ROTEIRO) {
  if (!roteiro) throw new Error('informe o roteiro: ROTEIRO=roteiros/01-primeiros-passos.mjs')
  const arquivo = resolve(RAIZ, roteiro)
  let nome = basename(arquivo, '.mjs')
  if (nome === 'roteiro') nome = basename(dirname(arquivo))
  // Série por perfil: com PERFIS no config.mjs, o roteiro `NN-<perfil>-<assunto>` sai em saida/<perfil>/NN-<assunto>.mp4,
  // a pasta que espelha a playlist do perfil. A lista é explícita porque `01-primeiros-passos` também casa com NN-x-y.
  const m = nome.match(/^(\d+)-([^-]+)-(.+)$/)
  const porPerfil = m && (CONFIG.PERFIS || []).includes(m[2])
  return {
    arquivo,
    url: pathToFileURL(arquivo).href,
    nome,
    falas: join(RAIZ, 'falas', nome),
    audio: join(RAIZ, 'falas', nome, 'audio'),
    video: join(RAIZ, 'video', nome),
    saida: porPerfil ? join(RAIZ, 'saida', m[2], `${m[1]}-${m[3]}.mp4`) : join(RAIZ, 'saida', `${nome}.mp4`),
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = pastas(process.argv[2])
  for (const k of ['arquivo', 'nome', 'falas', 'video', 'saida']) console.log(`${k.toUpperCase()}='${p[k]}'`)
  console.log(`BASE_URL='${CONFIG.BASE_URL}'`)
}
