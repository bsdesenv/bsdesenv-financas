#!/bin/sh
# Portão de entrega: as verificações do fim da tarefa num comando só.
#
# TEMPLATE. Copiar para spec/_fontes/verificar-entrega.sh e preencher os <...> do bloco INSTÂNCIA,
# logo abaixo deste cabeçalho.
#
# Existe porque o fim da tarefa gastava de 3 a 5 idas ao servidor, uma por verificação, com o
# contexto no maior tamanho. Aqui as quatro rodam sempre, sem parar na primeira falha, e só a que
# falha imprime: etapa verde fica muda e uma linha de resumo fecha.
#
# As etapas, nesta ordem:
#   1. lint do front, nos arquivos alterados e novos que caem nas pastas e extensões da instância
#   2. formatador do back, nos alterados e novos que caem nas pastas e extensões da instância
#   3. verificador de inventário
#   4. verificador de documentação
# A suíte de testes não faz parte do portão.
#
# ------------------------------------------------------------------------------------------------
# O QUE PRECISA SER PREENCHIDO
#
#   as seis variáveis do bloco INSTÂNCIA que trazem um texto entre `<` e `>`: LINT, LINT_PASTAS,
#   LINT_EXTENSOES, FORMATADOR, FORMATADOR_PASTAS e FORMATADOR_EXTENSOES. Etapa que o projeto não
#   tem se desliga com valor vazio, escrito de propósito, e a linha verde diz que foi pulada (a
#   exceção é FORMATADOR_PASTAS: vazia não pula nada, tira o filtro de pasta). Lacuna esquecida NÃO
#   vira etapa pulada: o script sai 1 antes de rodar qualquer coisa, dizendo qual falta
#
# QUATRO DECISÕES QUE NÃO SE MEXEM SEM MOTIVO:
#
#   1. Roda todas as etapas, sem parar na primeira falha. Parar na primeira devolve a ida ao
#      servidor que o script existe para tirar: corrige-se uma, roda de novo, aparece a segunda.
#   2. Correção não é falha. O formatador reescreve o arquivo, e isso sai numa linha informativa,
#      contada pelo conteúdo antes e depois porque a saída de cada formatador muda com o ambiente.
#   3. O stdin das etapas é fechado. Ferramenta que pergunta (um gerenciador de pacotes pedindo
#      para instalar) pararia a entrega esperando uma resposta que ninguém vê.
#   4. `${ENTREGA_X-padrão}`, sem dois-pontos. Com dois-pontos, variável vazia cairia no padrão e
#      desligar a etapa não teria como. É também o que deixa o harness (verificar-entrega.test.sh)
#      sobrepor a instância toda, sem depender do que o projeto preencheu.
# ------------------------------------------------------------------------------------------------
#
# Uso: sh spec/_fontes/verificar-entrega.sh          (de qualquer pasta)
# Sai 1 se qualquer etapa falhar, ou se a instância estiver incompleta.

set -u
# Sem glob: o comando e as listas da instância se dividem por espaço, e um `*` perdido num valor
# não pode virar a lista de arquivos da pasta.
set -f

# ------------------------------------------------------------------------------------------------
# INSTÂNCIA. Cada variável se troca por ENTREGA_<NOME> no ambiente, sem editar este arquivo.
# O `-` sem dois-pontos é de propósito: ENTREGA_<NOME> vazia desliga a etapa, e só a ausente cai no
# padrão daqui.

# Lint do front: vazio porque o projeto não tem linter configurado. Os testes rodam fora do portão.
LINT=${ENTREGA_LINT-""}
LINT_PASTAS=${ENTREGA_LINT_PASTAS-""}
LINT_EXTENSOES=${ENTREGA_LINT_EXTENSOES-""}

# Formatador do back: vazio porque o projeto não tem formatador configurado.
FORMATADOR=${ENTREGA_FORMATADOR-""}
FORMATADOR_PASTAS=${ENTREGA_FORMATADOR_PASTAS-""}
FORMATADOR_EXTENSOES=${ENTREGA_FORMATADOR_EXTENSOES-""}

# Os dois verificadores de spec/_fontes. Script ausente: etapa pulada, e a linha verde diz qual.
INVENTARIO=${ENTREGA_INVENTARIO-sh spec/_fontes/verificar-inventario.sh}
DOCUMENTACAO=${ENTREGA_DOCUMENTACAO-sh spec/_fontes/verificar-documentacao.sh}
# ------------------------------------------------------------------------------------------------

# Lacuna que ninguém preencheu: o que o kit deixa é um texto entre `<` e `>`. Sai antes de rodar
# qualquer etapa, dizendo todas as que faltam de uma vez. Esquecer de instanciar não pode virar
# etapa pulada, porque pulada é o que a linha verde diz e ninguém lê: o portão ficaria verde sem
# ter verificado nada. Vale para as seis, inclusive a de etapa desligada: desligar é escrever
# vazio, e não deixar o texto do kit.
incompleta=0
for par in "LINT=$LINT" "LINT_PASTAS=$LINT_PASTAS" "LINT_EXTENSOES=$LINT_EXTENSOES" \
  "FORMATADOR=$FORMATADOR" "FORMATADOR_PASTAS=$FORMATADOR_PASTAS" \
  "FORMATADOR_EXTENSOES=$FORMATADOR_EXTENSOES"; do
  case "${par#*=}" in
    "<"*">")
      printf 'instancia incompleta: preencher %s no topo de spec/_fontes/verificar-entrega.sh\n' "${par%%=*}"
      incompleta=1
      ;;
  esac
done
[ "$incompleta" -eq 0 ] || exit 1

raiz=$(cd "$(dirname "$0")/../.." && pwd)
cd "$raiz"

verdes=""
vermelhas=""

# Etapa que não rodou, dita na linha verde: pular em silêncio esconderia que a verificação não houve.
pular() {
  verdes="${verdes:+$verdes, }$1 pulado ($2)"
}

# Roda a etapa e só imprime se ela falhar: nome, código e o que ela disse. A linha `ok` dos
# verificadores de spec/_fontes não diz nada quando algo falhou, então sai. O stdin fechado impede
# que a ferramenta pare numa pergunta.
etapa() {
  nome=$1
  detalhe=$2
  shift 2
  saida=$("$@" 2>&1 </dev/null)
  codigo=$?
  if [ "$codigo" -eq 0 ]; then
    verdes="${verdes:+$verdes, }$nome${detalhe:+ ($detalhe)}"
    return 0
  fi
  vermelhas="${vermelhas:+$vermelhas, }$nome"
  printf 'FALHA  %s (saiu %d)\n' "$nome" "$codigo"
  [ -n "$saida" ] && printf '%s\n' "$saida" | grep -v '^ok  '
  return 0
}

# Alterados desde o HEAD (modificados ou em stage) mais os novos fora do git, sem os ignorados.
alterados() {
  {
    git -c core.quotePath=false diff --name-only HEAD --
    git -c core.quotePath=false ls-files --others --exclude-standard
  } | sort -u
}

# Os três filtros abaixo leem nomes de arquivo, um por linha, e deixam passar o que cabe. Compõem-se
# num pipe: o lint usa os três, e o formatador também, só que com a pasta opcional (ver o passo 2).

# Só o que existe: arquivo apagado, no disco ou em stage, não tem o que a ferramenta abrir.
existentes() {
  while IFS= read -r f; do
    [ -f "$f" ] && printf '%s\n' "$f"
  done
}

# Só o que está sob uma das pastas. `.` são os arquivos da raiz (sem barra no caminho). A barra
# final e o `./` do começo se aceitam, porque o git escreve o caminho sem eles. Sem pasta nenhuma,
# nada passa.
nas_pastas() {
  while IFS= read -r f; do
    # shellcheck disable=SC2086
    for p in $1; do
      p=${p%/}
      p=${p#./}
      if [ "$p" = . ]; then
        case "$f" in */*) continue ;; esac
      else
        case "$f" in "$p"/*) ;; *) continue ;; esac
      fi
      printf '%s\n' "$f"
      break
    done
  done
}

# Só as extensões da lista. Aceita `js`, `.js` e `*.js`: errar o ponto faria a etapa pular sem
# ninguém ver.
com_extensao() {
  aceitas=" "
  # shellcheck disable=SC2086
  for e in $1; do
    e=${e#\*}
    aceitas="$aceitas${e#.} "
  done
  while IFS= read -r f; do
    case "$aceitas" in
      *" ${f##*.} "*) printf '%s\n' "$f" ;;
    esac
  done
}

# Verificador de spec/_fontes: comando vazio ou script ausente pula a etapa. O script é a primeira
# palavra do comando que é um caminho (tem barra), então `sh spec/_fontes/verificar-x.sh` e
# `./bin/verificar` se conferem. Comando sem caminho roda sempre, e a falta dele aparece como
# falha, que é o certo para o que não se sabe conferir.
verificador() {
  nome=$1
  comando=$2
  if [ -z "$comando" ]; then
    pular "$nome" "sem comando"
    return 0
  fi
  # shellcheck disable=SC2086
  for palavra in $comando; do
    case "$palavra" in
      */*)
        if [ ! -f "$palavra" ]; then
          pular "$nome" "sem $palavra"
          return 0
        fi
        break
        ;;
    esac
  done
  # shellcheck disable=SC2086
  etapa "$nome" "" $comando
}

# 1. Lint do front, só nos arquivos alterados e novos das pastas e extensões da instância.
lista=$(alterados | existentes | nas_pastas "$LINT_PASTAS" | com_extensao "$LINT_EXTENSOES")
if [ -z "$LINT" ]; then
  pular lint "sem comando"
elif [ -z "$lista" ]; then
  pular lint "sem arquivo de front"
else
  set --
  # Sem pipe: o laço rodaria num subshell e o `set --` se perderia.
  while IFS= read -r f; do
    set -- "$@" "$f"
  done <<FIM
$lista
FIM
  # shellcheck disable=SC2086
  etapa lint "$# arquivo(s)" $LINT "$@"
fi

# 2. Formatador do back, sem modo de checagem: corrige a formatação no lugar. O que ele corrigiu se
#    conta pelo conteúdo dos arquivos antes e depois, e sai numa linha: correção não é falha.
lista=$(alterados | existentes | com_extensao "$FORMATADOR_EXTENSOES")
# Fixture não se formata: só vai ao formatador o que está nas pastas da instância. Condicional
# porque nas_pastas, com a lista vazia, não deixa passar nada, e aqui vazia quer dizer todas.
if [ -n "$FORMATADOR_PASTAS" ]; then
  lista=$(printf '%s\n' "$lista" | nas_pastas "$FORMATADOR_PASTAS")
fi
if [ -z "$FORMATADOR" ]; then
  pular formatador "sem comando"
elif [ -z "$lista" ]; then
  pular formatador "sem arquivo de back"
else
  set --
  while IFS= read -r f; do
    set -- "$@" "$f"
  done <<FIM
$lista
FIM
  antes=$(for f in "$@"; do cksum "$f"; done)
  # shellcheck disable=SC2086
  etapa formatador "$# arquivo(s)" $FORMATADOR "$@"
  corrigidos=$(printf '%s\n' "$antes" | while read -r soma bytes f; do
    [ -n "$f" ] && [ "$(cksum "$f")" != "$soma $bytes $f" ] && printf '%s\n' "$f"
  done)
  n=$(printf '%s\n' "$corrigidos" | grep -c .)
  if [ "$n" -gt 0 ]; then
    mais=""
    [ "$n" -gt 5 ] && mais=" e mais $((n - 5))"
    nomes=$(printf '%s\n' "$corrigidos" | head -n 5 | tr '\n' ' ')
    printf 'formatador corrigiu %d arquivo(s): %s%s\n' "$n" "${nomes% }" "$mais"
  fi
fi

# 3 e 4. Os dois verificadores de spec/_fontes.
verificador inventario "$INVENTARIO"
verificador documentacao "$DOCUMENTACAO"

if [ -z "$vermelhas" ]; then
  printf 'entrega verde: %s\n' "$verdes"
  exit 0
fi
printf 'entrega vermelha: falharam %s\n' "$vermelhas"
exit 1
