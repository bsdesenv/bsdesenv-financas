#!/bin/sh
# Produz um vídeo da série: ./produzir.sh roteiros/01-primeiros-passos.mjs saida/01-primeiros-passos.mp4
#   vozes (gerar-falas) → gravação (gravar, numa vaga) → instante real de cada legenda/capa (legendas.py) → MP4 (montar)
#   → folha de quadros (folha.sh) → conferência (conferir.sh, que reprova com saída 1 folha ou linha do tempo mais velha que o MP4)
# Os logs são .txt (ensaio, gravacao, gerar-falas) porque o safety-net do projeto barra a leitura de *.log.
# Só a gravação ocupa uma vaga (protocolo em vaga.sh): vozes, sincronia e montagem rodam fora dela, e as vozes rodam uma vez só.
# Pastas de trabalho por vídeo (pastas.mjs): falas/<nome>, video/<nome>. Sem o 2º argumento, o MP4 vai para saida/<nome>.mp4, ou para saida/<perfil>/NN-<assunto>.mp4 com PERFIS no config.mjs.
# Variáveis: PYTHON (python com numpy; padrão ~/.venv-video/bin/python), EDGE_TTS, VOZ, VAGA_ESPERA (segundos, máx. 540).
# Nada é apagado: a gravação nova sobrescreve tela.webm, e o que sobra em video/<nome>/gravando/ fica (pasta ignorada pelo git).
set -eu
cd "$(dirname "$0")"
ROTEIRO="${1:-}"
[ -f "$ROTEIRO" ] || { echo "uso: $0 roteiros/<nome>.mjs [saida.mp4]" >&2; exit 1; }
export ROTEIRO
eval "$(node pastas.mjs "$ROTEIRO")"
SAIDA="${2:-$SAIDA}"
PY="${PYTHON:-$HOME/.venv-video/bin/python}"
curl -s -o /dev/null --max-time 5 "$BASE_URL/" || { echo "o front não responde em $BASE_URL: suba o servidor de desenvolvimento do projeto" >&2; exit 1; }
. ./vaga.sh
mkdir -p "$VIDEO" "$FALAS"

echo "== vozes"
node gerar-falas.mjs > "$FALAS/gerar-falas.txt" 2>&1 || { tail -n 20 "$FALAS/gerar-falas.txt"; exit 1; }
tail -n 1 "$FALAS/gerar-falas.txt"

vaga_iniciar "$NOME"
vaga_entrar
echo "== gravação (vaga $VAGA, base $ID)"
filho node gravar.mjs > "$VIDEO/gravacao.txt" 2>&1 || { tail -n 20 "$VIDEO/gravacao.txt"; exit 1; }
vaga_sair
grep -v "^   " "$VIDEO/gravacao.txt" | tail -12

echo "== sincronia"
"$PY" legendas.py "$VIDEO" > "$VIDEO/legendas.txt"
echo "falas estimadas (sem troca detectada): $(grep -c estimado "$VIDEO/legendas.txt" || true)"
node -e "const F=require('$VIDEO/linha-do-tempo-real.json').falas;const d=F.map(f=>f.tv-f.t);console.log('atraso voz×imagem: máx',Math.max(...d).toFixed(2),'s, mín',Math.min(...d).toFixed(2),'s')"
echo "== montagem"
node montar.mjs "$SAIDA" | tail -1

echo "== folha de quadros"
sh folha.sh "$ROTEIRO" "$SAIDA"
echo "== conferência"
sh conferir.sh "$ROTEIRO" "$SAIDA"
