#!/bin/sh
# Harness de regressao dos verificadores estaticos.
#
# TEMPLATE. Copiar para spec/_fontes/verificar.test.sh. Nao tem lacuna a preencher: o que muda de
# projeto para projeto sao as fixtures, nao o harness.
#
# Existe porque no projeto de origem os dois primeiros verificadores nasceram sem fixture e
# precisaram de QUATRO correcoes no mesmo dia — todas descobertas rodando contra o codigo de
# producao, nao contra caso conhecido: uma anotacao de tipo contada como prosa, uma leitura
# legitima reprovada junto com a escrita, um comentario de uma linha que nunca fechava, e um
# separador de paragrafo tratado como ruido. Nenhuma chegou a producao, e as quatro custaram uma
# rodada de investigacao cada.
#
# A regra de trava com fixture ja existia para o `safety-net`; este arquivo a estende para os
# verificadores estaticos, no mesmo formato de `.claude/hooks/safety-net.test.sh`.
#
# Cada fixture e nomeada pelo que se espera dela: `reprova-*` deve sair 1, `passa-*` deve sair 0.
# Os dois sentidos importam: regua que so testa o que pega vira alarme falso e acaba desligada, e
# regua que so testa o que ignora deixa de pegar e vira decoracao.
#
# Uso: sh spec/_fontes/verificar.test.sh

set -u
# Absoluto: o `cd "$raiz"` logo abaixo não pode mudar para onde `$DIR` aponta.
DIR=$(cd "$(dirname "$0")" && pwd)
raiz=$(cd "$DIR/../.." && pwd)
cd "$raiz"

passou=0
falhou=0
falhas=""

conferir() {
  verificador=$1
  fixture=$2
  espera=${3:-}
  nome=$(basename "$fixture")

  case "$nome" in
    reprova-*) esperado=1 ;;
    passa-*)   esperado=0 ;;
    *) echo "fixture sem prefixo reprova-/passa-: $fixture" >&2; falhou=$((falhou + 1)); return ;;
  esac

  saida=$(sh "$verificador" "$fixture" 2>&1)
  obtido=$?

  # Cada linha de `espera` tem de aparecer na saida: sair 1 por outro motivo nao prova a regra.
  faltou=""
  if [ -n "$espera" ]; then
    while IFS= read -r linha; do
      printf '%s\n' "$saida" | grep -qF -- "$linha" || faltou=$linha
    done <<EOF
$espera
EOF
  fi

  if [ "$obtido" -eq "$esperado" ] && [ -z "$faltou" ]; then
    passou=$((passou + 1))
  else
    falhou=$((falhou + 1))
    motivo="esperava sair $esperado, saiu $obtido"
    [ -n "$faltou" ] && motivo="faltou na saida: $faltou (saiu $obtido)"
    falhas="${falhas}  $nome: $motivo
"
  fi
}

# Um bloco por verificador que aceite arquivo como argumento. Verificador ausente faz o bloco ser
# pulado com aviso: o harness e copiado sempre por causa do `fixtures/plano`, e projeto sem
# `verificar-documentacao.sh` nao pode quebrar a regua que ele tem.
if [ -f "$DIR/verificar-comentarios.sh" ]; then
  for f in "$DIR"/fixtures/comentarios/*; do
    [ -f "$f" ] && conferir "$DIR"/verificar-comentarios.sh "$f"
  done
else
  printf 'aviso: verificar-comentarios.sh ausente; casos de comentarios pulados\n' >&2
fi

if [ -f "$DIR/verificar-template.sh" ]; then
  for f in "$DIR"/fixtures/template/*; do
    [ -f "$f" ] && conferir "$DIR"/verificar-template.sh "$f"
  done
else
  printf 'aviso: verificar-template.sh ausente; casos de template pulados\n' >&2
fi

# A fixture de plano declara em `<!-- espera: ... -->` o que a saida traz: a onda, o lote, o motivo
# da falha. So o codigo de saida deixava o calculo das ondas sem teste nenhum.
if [ -f "$DIR/verificar-plano.sh" ]; then
  for f in "$DIR"/fixtures/plano/*.md; do
    [ -f "$f" ] || continue
    espera=$(sed -n 's/^<!-- espera: \(.*\) -->$/\1/p' "$f")
    if [ -z "$espera" ]; then
      falhou=$((falhou + 1))
      falhas="${falhas}  $(basename "$f"): fixture de plano sem <!-- espera: ... -->
"
      continue
    fi
    conferir "$DIR"/verificar-plano.sh "$f" "$espera"
  done
else
  printf 'aviso: verificar-plano.sh ausente; casos de plano pulados\n' >&2
fi


# ------------------------------------------------------------------------------------------------
# `data_do_codigo`, de `verificar-documentacao.sh`: quando a regua alerta
#
# Estes casos nao usam fixture de arquivo porque a funcao nao responde a conteudo — responde a
# ESTADO DO GIT. Cada caso monta um repositorio descartavel com um commit antigo e pergunta que
# data a funcao devolve.
#
# O que se protege aqui e o MOMENTO do alerta. Ate 22/09/2026 a data saia so do `git log`, entao
# codigo alterado e ainda nao commitado parecia velho e a regua passava verde justamente antes do
# commit — que e quando ela serve. Custou uma entrega inteira: seis capitulos venceram de uma vez,
# e o aviso so veio depois de tudo commitado.
conferir_data() {
  if [ "$2" = "$3" ]; then
    passou=$((passou + 1))
  else
    falhou=$((falhou + 1))
    falhas="${falhas}  data_do_codigo, $1: esperava $3, veio \"$2\"
"
  fi
}

repo_descartavel() {
  d=$(mktemp -d)
  mkdir -p "$d/app"
  echo original > "$d/app/a.txt"
  (
    cd "$d" || exit 1
    git init -q
    git config user.email harness@local
    git config user.name harness
    git add -A
    GIT_AUTHOR_DATE="$DATA_ANTIGA 10:00:00" GIT_COMMITTER_DATE="$DATA_ANTIGA 10:00:00" \
      git commit -qm inicial
  ) >/dev/null 2>&1
  printf '%s' "$d"
}

DATA_ANTIGA=2026-01-15
HOJE=$(date +%F)

# A funcao sai do proprio verificador: copia-la para ca criaria uma segunda versao que envelhece
# sozinha, que e exatamente o defeito que este arquivo existe para pegar.
VERIFICADOR="$DIR/verificar-documentacao.sh"
FIXTURES="$DIR/fixtures/documentacao"

if [ -f "$VERIFICADOR" ]; then

# Função que não sai do verificador não pode deixar caso `passa-*` passar: sem ela, todo caso que
# espera zero falha passa sem ter rodado nada.
extrair() {
  corpo=$(sed -n "/^$1()/,/^}/p" "$VERIFICADOR")
  if [ -z "$corpo" ]; then
    printf 'função %s não encontrada em %s\n' "$1" "$VERIFICADOR" >&2
    exit 1
  fi
  eval "$corpo"
}

extrair data_do_codigo

d=$(repo_descartavel); cd "$d" || exit 1
conferir_data 'so commitado' "$(data_do_codigo app)" "$DATA_ANTIGA"

d=$(repo_descartavel); cd "$d" || exit 1
echo mexido >> app/a.txt
conferir_data 'alterado, sem commit' "$(data_do_codigo app)" "$HOJE"

d=$(repo_descartavel); cd "$d" || exit 1
echo mexido >> app/a.txt
git add app/a.txt
conferir_data 'alterado, ja no index' "$(data_do_codigo app)" "$HOJE"

d=$(repo_descartavel); cd "$d" || exit 1
echo novo > app/b.txt
conferir_data 'arquivo novo, sem rastreio' "$(data_do_codigo app)" "$HOJE"

# O sentido negativo importa tanto quanto: mexida FORA do caminho coberto nao pode envelhecer doc
# nenhuma, senao a regua vira alarme falso e as pessoas param de olhar para ela.
d=$(repo_descartavel); cd "$d" || exit 1
echo fora > outro.txt
conferir_data 'mexida fora do caminho coberto' "$(data_do_codigo app)" "$DATA_ANTIGA"

# A saida `Doc-OK`: so vale para a data do CODIGO (2o argumento), nunca para a do capitulo, e so com
# motivo de MOTIVO_MINIMO caracteres. Sem estes casos a saida pode virar buraco sem ninguem ver.
MOTIVO_MINIMO=10

# Variavel `DOC_OK` valida (SAIDA_DOC): o diff em curso sai da conta do codigo, mas nao da do capitulo.
d=$(repo_descartavel); cd "$d" || exit 1
echo mexido >> app/a.txt
SAIDA_DOC=1
conferir_data 'DOC_OK valido, alterado sem commit' "$(data_do_codigo app saida)" "$DATA_ANTIGA"
conferir_data 'DOC_OK valido, data do capitulo' "$(data_do_codigo app)" "$HOJE"
echo novo > app/b.txt
conferir_data 'DOC_OK valido, arquivo novo' "$(data_do_codigo app saida)" "$DATA_ANTIGA"
SAIDA_DOC=''
conferir_data 'sem DOC_OK, alterado sem commit' "$(data_do_codigo app saida)" "$HOJE"

# Trailer `Doc-OK:` no commit: o commit sai da conta do codigo e a data volta ao commit anterior.
commitar_hoje() {
  echo "$1" >> app/a.txt
  git add -A
  git commit -qm "$2" -m "$3"
}
d=$(repo_descartavel); cd "$d" || exit 1
commitar_hoje x 'refactor: tira comentario' 'Doc-OK: so um comentario, o capitulo segue verdadeiro' >/dev/null 2>&1
conferir_data 'trailer Doc-OK valido, data do codigo' "$(data_do_codigo app saida)" "$DATA_ANTIGA"
conferir_data 'trailer Doc-OK valido, data do capitulo' "$(data_do_codigo app)" "$HOJE"

d=$(repo_descartavel); cd "$d" || exit 1
commitar_hoje x 'refactor: tira comentario' 'Doc-OK: curto' >/dev/null 2>&1
conferir_data 'trailer Doc-OK curto nao isenta' "$(data_do_codigo app saida)" "$HOJE"

d=$(repo_descartavel); cd "$d" || exit 1
commitar_hoje x 'refactor: tira comentario' 'Doc-OK: 123456789' >/dev/null 2>&1
conferir_data 'trailer Doc-OK com 9 caracteres nao isenta' "$(data_do_codigo app saida)" "$HOJE"

d=$(repo_descartavel); cd "$d" || exit 1
commitar_hoje x 'refactor: tira comentario' 'Doc-OK: 1234567890' >/dev/null 2>&1
conferir_data 'trailer Doc-OK com 10 caracteres isenta' "$(data_do_codigo app saida)" "$DATA_ANTIGA"

# So o commit com trailer sai da conta: o commit sem ele, mais antigo que o de hoje, continua valendo.
d=$(repo_descartavel); cd "$d" || exit 1
commitar_hoje x 'feat: muda comportamento' 'sem trailer' >/dev/null 2>&1
commitar_hoje y 'refactor: tira comentario' 'Doc-OK: so um comentario, o capitulo segue verdadeiro' >/dev/null 2>&1
conferir_data 'commit sem trailer segue valendo' "$(data_do_codigo app saida)" "$HOJE"

cd "$raiz" || exit 1

# Fim a fim, pelo script inteiro: motivo curto reprova dizendo o minimo. A fala da FALHA e o contrato
# que o autor le na hora de usar a saida.
saida_curta=$(DOC_OK=curto sh "$VERIFICADOR" 2>&1 || true)
case "$saida_curta" in
  *"DOC_OK com motivo curto"*"o mínimo é 10"*) passou=$((passou + 1)) ;;
  *)
    falhou=$((falhou + 1))
    falhas="${falhas}  verificar-documentacao.sh, DOC_OK curto: nao reprovou dizendo o minimo
"
    ;;
esac

# ------------------------------------------------------------------------------------------------
# `conferir_numero`, de `verificar-documentacao.sh`: ampliação para spec/*.md e CLAUDE.md
#
# A função varre docs/dev/*.md, spec/*.md e CLAUDE.md. Cada caso monta um tmpdir com a árvore
# mínima e roda a função extraída do verificador.
extrair conferir_numero

conferir_numero_fixture() {
  nome=$1; esperado=$2
  d=$(mktemp -d)
  case "$nome" in
    passa-numero-sem-alvo)
      ;;
    passa-numero-so-em-docs-dev)
      mkdir -p "$d/docs/dev"
      echo "42 models" > "$d/docs/dev/estado.md"
      ;;
    reprova-numero-errado-em-spec)
      mkdir -p "$d/docs/dev" "$d/spec"
      echo "42 models" > "$d/docs/dev/estado.md"
      echo "99 models" > "$d/spec/estado.md"
      ;;
    passa-numero-correto-em-spec)
      mkdir -p "$d/docs/dev" "$d/spec"
      echo "42 models" > "$d/docs/dev/estado.md"
      echo "42 models" > "$d/spec/estado.md"
      ;;
    reprova-numero-errado-em-claude)
      mkdir -p "$d/docs/dev"
      echo "42 models" > "$d/docs/dev/estado.md"
      echo "99 models" > "$d/CLAUDE.md"
      ;;
    passa-numero-correto-em-claude)
      mkdir -p "$d/docs/dev"
      echo "42 models" > "$d/docs/dev/estado.md"
      echo "42 models" > "$d/CLAUDE.md"
      ;;
  esac
  (
    cd "$d" || exit 1
    DEV=docs/dev
    falhas=0
    falhar() { falhas=$((falhas + 1)); }
    conferir_numero models 42 >/dev/null 2>&1
    exit "$falhas"
  )
  obtido=$?
  rm -rf "$d"
  if [ "$obtido" -eq "$esperado" ]; then
    passou=$((passou + 1))
  else
    falhou=$((falhou + 1))
    falhas="${falhas}  conferir_numero, $nome: esperava sair $esperado, saiu $obtido
"
  fi
}

conferir_numero_fixture passa-numero-sem-alvo 0
conferir_numero_fixture passa-numero-so-em-docs-dev 0
conferir_numero_fixture reprova-numero-errado-em-spec 1
conferir_numero_fixture passa-numero-correto-em-spec 0
conferir_numero_fixture reprova-numero-errado-em-claude 1
conferir_numero_fixture passa-numero-correto-em-claude 0

# ------------------------------------------------------------------------------------------------
# `conferir_lacunas` e `conferir_poda`, de `verificar-documentacao.sh`: checagens novas
#
# Cada uma responde a uma mini-árvore `spec/` falsa, então a fixture é um DIRETÓRIO (não um arquivo
# como nos verificadores que aceitam caminho). O harness entra na árvore e roda a função extraída.
extrair conferir_lacunas
extrair conferir_poda

conferir_checagem() {
  funcao=$1
  fixture=$2
  # Terceiro argumento: o locale da rodada. Hook e CI sem LANG rodam em C, e ali regex com
  # caractere acentuado se comporta diferente.
  locale=${3:-}
  nome=$(basename "$fixture")
  case "$nome" in
    reprova-*) esperado=1 ;;
    passa-*)   esperado=0 ;;
    *) echo "fixture sem prefixo reprova-/passa-: $fixture" >&2; falhou=$((falhou + 1)); return ;;
  esac
  (
    cd "$fixture" || exit 1
    if [ -n "$locale" ]; then export LC_ALL="$locale"; fi
    falhas=0
    falhar() { falhas=$((falhas + 1)); }
    "$funcao" >/dev/null 2>&1
    exit "$falhas"
  )
  obtido=$?
  if [ "$obtido" -eq "$esperado" ]; then
    passou=$((passou + 1))
  else
    falhou=$((falhou + 1))
    falhas="${falhas}  $funcao, $nome${locale:+ sob LC_ALL=$locale}: esperava sair $esperado, saiu $obtido
"
  fi
}

for f in "$FIXTURES"/lacunas/*; do
  [ -d "$f" ] || continue
  conferir_checagem conferir_lacunas "$f"
  conferir_checagem conferir_lacunas "$f" C
done

for f in "$FIXTURES"/poda/*; do
  [ -d "$f" ] || continue
  conferir_checagem conferir_poda "$f"
  conferir_checagem conferir_poda "$f" C
done

cd "$raiz" || exit 1
else
  printf 'aviso: verificar-documentacao.sh ausente; casos de documentacao pulados\n' >&2
fi

printf '%d caso(s) conferido(s): %d ok, %d falha(s).\n' "$((passou + falhou))" "$passou" "$falhou"

[ "$falhou" -eq 0 ] && exit 0
printf '\n%s' "$falhas"
exit 1
