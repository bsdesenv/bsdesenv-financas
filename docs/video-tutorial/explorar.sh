#!/bin/sh
# Explora telas numa base própria: ./explorar.sh <email> <rota1,rota2,...>   com SENHA=<senha> no ambiente.
# É o `node explorar.mjs` com a vaga de gravação em volta (protocolo em vaga.sh): reserva a vaga, prepara uma base nova,
# liga o cenário e o desliga ao sair. A exploração clica e pode gravar, então nunca roda na base do dev.
# `node explorar.mjs <email> <rotas>` chama este script sozinho quando não há VIDEO_BASE no ambiente.
set -eu
cd "$(dirname "$0")"
[ $# -ge 1 ] || { echo "uso: SENHA=<senha> $0 <email> <rota1,rota2,...>" >&2; exit 2; }
. ./vaga.sh
vaga_iniciar explorar
vaga_entrar
filho node explorar.mjs "$@"
vaga_sair
