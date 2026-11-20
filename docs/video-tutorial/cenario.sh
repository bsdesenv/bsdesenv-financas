#!/bin/sh
# O CENÁRIO do bsdesenv-financas: a base isolada do vídeo e o servidor que a serve.
#
# Contrato da receita (não mude os nomes, os argumentos nem os códigos de saída):
#   cenario.sh vagas          escreve 1: a troca é global (base/atual) e uma gravação anda de cada vez.
#   cenario.sh preparar <id>  cria base/<id>.json, nova e com dados simulados, a partir de base-simulada.mjs.
#                             NUNCA toca a base do dev (base/dev.json) nem a planilha real. Log só na stderr.
#   cenario.sh ligar <id>     escreve o id em base/atual; o servidor lê esse arquivo em cada requisição. Idempotente.
#   cenario.sh desligar       remove base/atual; o app volta a usar a base do dev. Idempotente.
#   cenario.sh estado         `ligado` se base/atual existe.
#
# Como o app é Google Apps Script, o "backend" da gravação é o testes/gas-mock.mjs rodando no servidor.mjs desta pasta:
# a planilha falsa de cada base vive só na memória do servidor de desenvolvimento (http://localhost:8787). O servidor
# escolhe a base pelo cabeçalho X-Video-Base que a receita manda em toda requisição; sem ele, usa base/atual; sem
# base/atual, usa base/dev.json. Suba o servidor com `npm run video:servidor` antes de ensaiar ou produzir.
#
# Nenhum arquivo versionado é editado; não há bloco de marca para o pre-commit barrar.
# Nada aqui apaga base de corrida: elas se acumulam em base/ e a limpeza é decisão manual.
set -eu

AQUI=$(cd "$(dirname "$0")" && pwd -P)
BASES="$AQUI/base"
ATUAL="$BASES/atual"
DEV="$BASES/dev.json"
EXEMPLO="$AQUI/../../exemplos/dados-exemplo.json"

log() { echo "$*" >&2; }

validar_id() {
    printf '%s' "${1:-}" | grep -Eq '^[a-z0-9-]{1,80}$' || { log "cenario.sh: id inválido: '${1:-}'"; exit 2; }
}

preparar_pasta() {
    mkdir -p "$BASES"
    # A base do dev é uma cópia do exemplo, para a gravação nunca escrever no arquivo versionado.
    if [ ! -s "$DEV" ]; then
        cp "$EXEMPLO" "$DEV.tmp"
        mv "$DEV.tmp" "$DEV"
        log "base do dev criada em $DEV"
    fi
}

preparar() {
    validar_id "${1:-}"
    ID="$1"
    ARQUIVO="$BASES/$ID.json"
    preparar_pasta
    # A trava só protege o temporário e o mv: um preparar concorrente nunca lê arquivo pela metade.
    exec 9>"$BASES/.cenario.lock"
    flock 9
    if [ -e "$ARQUIVO" ]; then
        log "a base $ID já existe; ela será substituída por uma nova"
    fi
    node "$AQUI/base-simulada.mjs" "$ID" "$BASES/.$ID.tmp"
    mv "$BASES/.$ID.tmp" "$ARQUIVO"
    flock -u 9
    log "base pronta: $ARQUIVO"
}

ligar() {
    validar_id "${1:-}"
    [ -s "$BASES/$1.json" ] || { log "cenario.sh ligar: a base $1 não existe; rode preparar $1 antes."; exit 1; }
    printf '%s\n' "$1" > "$BASES/.atual.tmp"
    mv "$BASES/.atual.tmp" "$ATUAL"
    log "ligado: base $1"
}

desligar() {
    if [ -f "$ATUAL" ]; then rm -f "$ATUAL"; fi
    log "desligado: o servidor volta à base do dev"
}

case "${1:-}" in
    vagas) echo 1 ;;
    preparar) preparar "${2:-}" ;;
    ligar) ligar "${2:-}" ;;
    desligar) desligar ;;
    estado) if [ -f "$ATUAL" ]; then echo ligado; else echo desligado; fi ;;
    *)
        log "Uso: $0 vagas | preparar <id> | ligar <id> | desligar | estado"
        exit 2
        ;;
esac
