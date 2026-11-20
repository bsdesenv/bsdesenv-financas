// O Playwright grava o vídeo chamando um ffmpeg próprio (ffmpeg-1013/ffmpeg-linux), que não vem no `npm install` e
// que limita o vídeo a poucos Mbit/s e 1 thread: em 1080×1920 vira borrão e perde quadros. Aqui o PLAYWRIGHT_BROWSERS_PATH
// aponta para uma pasta local (ferramentas/, fora do git) onde esse caminho é um script que chama o ffmpeg do sistema com
// mais bitrate e mais threads. Nenhum navegador é baixado: o Chrome é o do sistema (`channel: 'chrome'`).
// Importar este arquivo ANTES do `playwright`.
// O nome da pasta (ffmpeg-1013) é a revisão do ffmpeg que a versão EXATA do Playwright do package.json espera, e o que se
// troca são os argumentos que ela passa ao ffmpeg. Por isso o Playwright fica fixo, sem `^`: ao subir a versão, confira em
// node_modules/playwright-core/browsers.json a revisão do "ffmpeg" e ajuste ALVO aqui, senão o bitrate de 12M não pega e
// o vídeo sai borrado, sem nenhum erro.
import { mkdirSync, writeFileSync, chmodSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const RAIZ = dirname(fileURLToPath(import.meta.url))
const PASTA = join(RAIZ, 'ferramentas')
const ALVO = join(PASTA, 'ffmpeg-1013', 'ffmpeg-linux')
process.env.PLAYWRIGHT_BROWSERS_PATH = PASTA

if (!existsSync(ALVO)) {
  mkdirSync(dirname(ALVO), { recursive: true })
  writeFileSync(ALVO, `#!/bin/sh
# troca o que o Playwright manda ao ffmpeg: o valor depois de -b:v (bitrate) e de -threads.
# O ffmpeg é o do PATH; ~/.local/bin entra na frente para valer o binário estático instalado sem root.
PATH="$HOME/.local/bin:$PATH"
args=""; troca=""
for a in "$@"; do
  if [ -n "$troca" ]; then a="$troca"; troca=""
  else
    case "$a" in
      -b:v) troca="\${GV_BITRATE:-12M}" ;;
      -threads) troca="4" ;;
    esac
  fi
  args="$args $a"
done
exec ffmpeg $args
`)
  chmodSync(ALVO, 0o755)
}
