#!/usr/bin/env bash
# Reinstala o agente review nos dois runtimes a partir da fonte unica spec/_fontes/review.md.
# Rodar da raiz do projeto depois de editar review.md. Nunca editar as copias direto.
set -eu

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
# Aponta para dentro do projeto: a instalacao nao depende de nada fora dele.
FONTES="$RAIZ/spec/_fontes"

# Corpo = tudo depois do marcador, sem a nota de "corpo unico" que so vale na fonte.
CORPO="$(sed -n '/<!-- CORPO-INSTALAVEL -->/,$p' "$FONTES/review.md" | tail -n +2)"

instalar () {
  local frontmatter="$1" destino="$2"
  mkdir -p "$(dirname "$destino")"
  # O modelo mora no frontmatter de cada runtime, nunca `inherit`: o nome do modelo barato muda
  # de um runtime para o outro, e uma linha so, gravada aqui, erraria um dos dois.
  { cat "$frontmatter"; printf '\n%s\n' "$CORPO"; } > "$destino"
  echo "instalado: ${destino#$RAIZ/}"
}

instalar "$FONTES/review-frontmatter-claude.txt"   "$RAIZ/.claude/agents/review.md"
instalar "$FONTES/review-frontmatter-opencode.txt" "$RAIZ/.opencode/agents/review.md"
