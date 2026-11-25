#!/bin/sh
# Confronta cada nome citado na skill de inventário com o disco.
# Uso: sh spec/_fontes/verificar-inventario.sh
# Sai 1 se achar qualquer citação sem lastro.

set -eu
raiz=$(cd "$(dirname "$0")/../.." && pwd)
cd "$raiz"
skill=".claude/skills/bsdesenv-financas"
falhas=0

corpo=$(cat "$skill/SKILL.md" "$skill/references/"*.md 2>/dev/null | sed '/[Nn]ão existe/,/^$/d')

citados=$(mktemp); reais=$(mktemp)
trap 'rm -f "$citados" "$reais"' EXIT INT TERM

conferir() {
  rotulo=$1; padrao=$2; achador=$3
  printf '%s' "$corpo" | grep -oE "$padrao" | tr -d '`' | sort -u > "$citados"
  eval "$achador" | sort -u > "$reais"
  mortos=$(comm -23 "$citados" "$reais")
  if [ -n "$mortos" ]; then
    printf 'FALHA  %s citado(s) e inexistente(s):\n' "$rotulo"
    printf '%s\n' "$mortos" | sed 's/^/         /'
    falhas=$((falhas + 1))
  else
    printf 'ok     %s\n' "$rotulo"
  fi
}

# Funções de API do servidor (citadas como `nome()`)
conferir "função de API" '\`[a-z][a-zA-Z0-9_]*\(\)\`' \
  "grep -nE '^function (doGet|incluir|carregar|estado|sincronizar|onEdit)\\(' src/Codigo.gs | sed 's/.*function \\([a-zA-Z0-9_]*\\).*/\\1()/'"

# Funções privadas do servidor (citadas como `nome_()`)
conferir "função privada" '\`[a-z][a-zA-Z0-9_]*_\(\)\`' \
  "grep -nE '^function [a-z][a-zA-Z0-9_]*_\\(' src/Codigo.gs | sed 's/.*function \\([a-zA-Z0-9_]*\\).*/\\1()/'"

# Constantes do servidor (citadas como `NOME_MAIUSCULO`)
conferir "constante" '\`[A-Z][A-Z0-9_]*\`' \
  "grep -oE '^var [A-Z][A-Z0-9_]*' src/Codigo.gs | sed 's/^var //'"

# Telas do front (citadas como `inicio`, `lancar` etc.)
conferir "tela" '\`[a-z][a-z0-9_-]+\`' \
  "grep -oE 'data-route=\"[a-z][a-z0-9_-]*\"' src/App.html | sed 's/data-route=\"//; s/\"$//'"

printf '\n'
[ "$falhas" -eq 0 ] && { printf 'Inventário sem citação morta.\n'; exit 0; }
printf '%d categoria(s) com citação morta. O código manda: corrigir a skill.\n' "$falhas"
exit 1
