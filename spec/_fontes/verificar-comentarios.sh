#!/bin/sh
# Reprova comentário que virou artigo.
#
# TEMPLATE. Copiar para spec/_fontes/verificar-comentarios.sh e preencher os <...>.
#
# Existe porque a auditoria do projeto de origem achou uma classe com 238 linhas de docblock em
# 657 — um bloco só com 54 linhas, títulos `##` e tabela markdown. Isso é capítulo de `docs/dev/`
# escrito no arquivo errado, e o custo é duplo: quem abre o arquivo lê três telas de história
# antes da primeira linha de código, e o texto envelhece sem nada avisar. Em `docs/dev/` o campo
# `cobre:` avisa; num comentário, ninguém avisa.
#
# O que NÃO é alvo: o comentário de uma linha que explica o porquê, que é o que `convencoes.md`
# pede. No projeto de origem eram 1.048 deles, e ficaram todos.
#
# ------------------------------------------------------------------------------------------------
# O QUE PRECISA SER PREENCHIDO
#
#   os caminhos varridos por padrão, em `caminhos`, e as extensões de código deste stack, direto no `find`
#   TETO_DOCBLOCK, se 8 linhas de prosa não for a régua certa aqui
#
# As três checagens valem para qualquer linguagem com `/** */` e `//`. Linguagem cujo comentário
# seja `#` (shell, Python, Ruby) precisa da variante do padrão nas checagens 2 e 3, ou fica de fora.
# ------------------------------------------------------------------------------------------------
#
# Uso: sh spec/_fontes/verificar-comentarios.sh [arquivo...]
# Sem argumento, varre os caminhos padrão. Sai 1 se achar violação.

set -eu
raiz=$(cd "$(dirname "$0")/../.." && pwd)
cd "$raiz"

TETO_DOCBLOCK=${TETO_DOCBLOCK:-8}
falhas=0

if [ "$#" -gt 0 ]; then
  arquivos=$*
else
  caminhos="src testes"
  # Os `-name` ficam escritos aqui, nunca numa variavel: expandida, ela leva as aspas para dentro do
  # padrao, o find nao casa nada e as tres checagens saem verdes sem ter lido um arquivo.
  # shellcheck disable=SC2086
  arquivos=$(find $caminhos -type f \( -name '*.gs' -o -name '*.mjs' \) | sort)
  # Varredura vazia e caminho ou extensao errados, nao codigo limpo.
  [ -n "$arquivos" ] || { printf 'FALHA  a varredura padrao nao achou arquivo: conferir caminhos e extensoes do find\n'; exit 1; }
fi

# 1. Docblock acima do teto. O bloco começa em `/**` e termina em `*/`; conta as linhas entre eles.
longos=$(printf '%s\n' $arquivos | while read -r f; do
  [ -f "$f" ] || continue
  # Conta so PROSA: `@param`, `@return`, `@var` e afins sao contrato de tipo, nao texto. Um
  # docblock com cinco `@param` estouraria o teto sem ter uma linha de explicacao — e foi
  # exatamente o que a primeira versao desta regra acusou.
  awk -v teto="$TETO_DOCBLOCK" -v arq="$f" '
    # Docblock de uma linha (`/** ... */`) ja esta fechado: nao abre bloco. Sem isto o awk
    # procuraria o fecho na linha seguinte e contaria ate o proximo `*/` do arquivo.
    /\/\*\*.*\*\// { next }
    /\/\*\*/ { dentro = 1; n = 0; inicio = NR; next }
    dentro && /\*\// { if (n > teto) printf "%s:%d  (%d linhas de prosa)\n", arq, inicio, n; dentro = 0; next }
    dentro && $0 ~ /^[[:space:]]*\*[[:space:]]*@/ { next }
    dentro { n++ }
  ' "$f"
done)

if [ -n "$longos" ]; then
  printf 'FALHA  docblock acima de %d linhas — o texto longo vai para o capítulo de docs/dev/ que declara `cobre:` do arquivo:\n' "$TETO_DOCBLOCK"
  printf '%s\n' "$longos" | sed 's/^/         /'
  falhas=$((falhas + 1))
else
  printf 'ok     nenhum docblock acima de %d linhas\n' "$TETO_DOCBLOCK"
fi

# 2. Título markdown dentro de comentário: sinal de que o bloco virou documento.
titulos=$(printf '%s\n' $arquivos | while read -r f; do
  [ -f "$f" ] || continue
  grep -nE '^\s*(\*|//)\s*#{2,}\s' "$f" | sed "s|^|$f:|"
done)

if [ -n "$titulos" ]; then
  printf 'FALHA  título markdown (`##`) dentro de comentário — comentário não tem seção:\n'
  printf '%s\n' "$titulos" | sed 's/^/         /' | head -20
  falhas=$((falhas + 1))
else
  printf 'ok     nenhum título markdown em comentário\n'
fi

# 3. `//` SOLTO, fora de bloco. Entre duas linhas de comentario ele separa paragrafos, e isso e
#    legitimo — o que nao serve e o `//` vazio isolado, que so carrega ruido para o diff.
vazios=$(printf '%s\n' $arquivos | while read -r f; do
  [ -f "$f" ] || continue
  awk -v arq="$f" '
    { atual = $0 }
    NR > 1 && anterior ~ /^[[:space:]]*\/\/[[:space:]]*$/ &&
      !(anteriores ~ /^[[:space:]]*\/\//) && !(atual ~ /^[[:space:]]*\/\//) {
        printf "%s:%d\n", arq, NR - 1
      }
    { anteriores = anterior; anterior = atual }
  ' "$f"
done)

if [ -n "$vazios" ]; then
  printf 'FALHA  `//` vazio usado como separador:\n'
  printf '%s\n' "$vazios" | sed 's/^/         /' | head -20
  falhas=$((falhas + 1))
else
  printf 'ok     nenhum `//` vazio\n'
fi

printf '\n'
[ "$falhas" -eq 0 ] && { printf 'Comentários dentro do critério.\n'; exit 0; }
printf '%d critério(s) violado(s). O texto longo não se apaga: move para docs/dev/.\n' "$falhas"
exit 1
