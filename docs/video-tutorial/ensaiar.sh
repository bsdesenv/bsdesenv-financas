#!/bin/sh
# Ensaia ou produz um vídeo da série numa vaga de gravação (protocolo em vaga.sh).
# Uso: ./ensaiar.sh roteiros/NN-nome.mjs ensaio|produzir|fila
#   ensaio    SECO=1 FOTOS=1 gravar.mjs. Imprime a pasta da corrida (a linha `pasta da corrida: CAMINHO` do gravar.mjs: fotos e
#             erro-*.jpg dessa corrida) e termina com as linhas "! ID: MENSAGEM → erro-ID.jpg". Sai 1 se houver alguma.
#   produzir  ./produzir.sh (vozes, gravação, sincronia, MP4). Imprime o caminho do MP4.
#   fila      só para provar as vagas: segura a vaga FILA_SEGUNDOS (padrão 8) com o cenário ligado, sem gravar.
# A corrida pega uma vaga (`cenario.sh vagas` diz quantas), prepara uma base nova só dela, liga o cenário e o desliga ao sair
# quando nenhuma outra vaga está ocupada, também em erro, Ctrl-C ou kill. Quem chega com todas as vagas ocupadas espera até
# 8 min e sai com código 75 e a mensagem de tentar de novo (o Bash do agente morre em 10 min). A voz (gerar-falas) fica fora da
# vaga, e só roda uma vez. Mensagens vão para o stderr com a hora; o stdout leva só o caminho do resultado.
set -eu
cd "$(dirname "$0")"

ROTEIRO="${1:-}"
MODO="${2:-}"
case "$MODO" in ensaio | produzir | fila) ;; *)
    echo "Uso: $0 roteiros/NN-nome.mjs ensaio|produzir|fila" >&2
    exit 2
    ;;
esac
[ -f "$ROTEIRO" ] || { echo "roteiro não encontrado: $ROTEIRO" >&2; exit 2; }

export ROTEIRO
eval "$(node pastas.mjs "$ROTEIRO")"

# Produzir tem o seu próprio roteiro de passos (vozes, vaga, sincronia, montagem): só passa a vez.
if [ "$MODO" = produzir ]; then
    ./produzir.sh "$ROTEIRO" >&2
    echo "$SAIDA"
    exit 0
fi

curl -s -o /dev/null --max-time 5 "$BASE_URL/" || { echo "o front não responde em $BASE_URL: suba o servidor de desenvolvimento do projeto" >&2; exit 1; }

. ./vaga.sh
mkdir -p "$FALAS" "$VIDEO"

# As vozes não dependem do cenário: ficam fora da vaga, para ela durar só o que precisa do backend.
if [ "$MODO" = ensaio ]; then
    node gerar-falas.mjs > "$FALAS/gerar-falas.txt" 2>&1 || { tail -n 20 "$FALAS/gerar-falas.txt" >&2; exit 1; }
    tail -n 1 "$FALAS/gerar-falas.txt" >&2
fi

vaga_iniciar "$NOME"
vaga_entrar

if [ "$MODO" = fila ]; then
    vaga_log "segurando a vaga ${FILA_SEGUNDOS:-8} s, sem gravar"
    filho sleep "${FILA_SEGUNDOS:-8}"
    exit 0
fi

# ensaio: o log (.txt, porque o safety-net barra a leitura de *.log) fica na pasta do vídeo, sobrescrito a cada ensaio; nada é apagado
LOG="$VIDEO/ensaio.txt"
export SECO=1 FOTOS=1
PASTA_CORRIDA() { sed -n 's/^pasta da corrida: //p' "$LOG" | head -n 1; }
filho node gravar.mjs > "$LOG" 2>&1 || { tail -n 20 "$LOG" >&2; echo "pasta da corrida: $(PASTA_CORRIDA)" >&2; exit 1; }
vaga_sair
grep -E '^duração' "$LOG" >&2 || true
PASTA_CORRIDA
if grep -q '^! ' "$LOG"; then
    echo "ensaio com ação marcada com !:" >&2
    grep '^! ' "$LOG" >&2
    exit 1
fi
