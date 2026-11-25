#!/bin/sh
# Confronta a documentação (`docs/dev/`, `docs/uso/` e o sumário dos READMEs) com o código.
#
# TEMPLATE. Copiar para spec/_fontes/verificar-documentacao.sh e preencher os <...>. Apagar bloco
# inteiro cujo alvo não existir neste projeto: checagem sem alvo real não reprova nada e dá falsa
# sensação de cobertura.
#
# Existe porque no projeto de origem a varredura de setembro achou as duas documentações paradas no
# dia em que nasceram: 29 commits de código sem uma linha de doc, números errados na doc de dev,
# duas telas em produção sem página de ajuda, e o critério "a página muda no mesmo commit que muda
# a tela" sendo o único da spec que ninguém conferia. Doc que envelhece em silêncio ensina errado, e
# ensinar errado custa mais que não ensinar: a pessoa segue o passo, não funciona, e desconfia do
# sistema inteiro.
#
# O gatilho é o campo `cobre:`, que cada arquivo de doc declara: os caminhos de código que ele
# ensina. Daí a pergunta que este script faz é mecânica — o código que a doc cobre é mais novo que
# a doc? Na doc de uso a data é o campo `atualizado:` do frontmatter; na de dev, a data do último
# commit do próprio arquivo.
#
# A SAÍDA COM MOTIVO, `Doc-OK: <motivo>`:
#
#   Mudança que não torna o capítulo falso (tirar um id de comentário, apagar função que o capítulo
#   não cita) venceria a doc do mesmo jeito, e a única saída era tocar o capítulo só para carimbar a
#   data: o carimbo vira ruído e a doc deixa de dizer que alguém a conferiu. Como o `Spec-OK` do
#   commit-msg, a saída existe, pede motivo e fica no `git log`. A diferença é o momento: este
#   script roda ANTES do commit, quando a mensagem ainda não existe, então o motivo chega por dois
#   caminhos que se completam:
#
#     antes do commit   variável `DOC_OK="<motivo>"` no ambiente. Vale para o diff em curso, que
#                       deixa de contar como "hoje" na régua do código
#     depois do commit  linha `Doc-OK: <motivo>` na mensagem. A data do código coberto passa a
#                       ignorar os commits que a trazem; sem isso a régua reprovaria no dia
#                       seguinte, com o commit já feito
#
#   Motivo com menos de `MOTIVO_MINIMO` caracteres não vale: "ok" não é motivo, e a saída que se
#   abre sem custo vira o jeito normal de passar. A data do CAPÍTULO nunca ignora o trailer:
#   commit de doc com `Doc-OK` continua sendo commit de doc.
#
# ------------------------------------------------------------------------------------------------
# O QUE PRECISA SER PREENCHIDO
#
#   as duas pastas de doc, se não forem `docs/dev/` e `docs/uso/`
#   checagem 1: o padrão de caminho de código deste stack
#   checagem 2: um `conferir_numero` por contagem que a doc declara. Contagem que nenhum comando
#               reproduz sem ambiguidade fica de fora — número que o verificador não sabe conferir
#               é número que ninguém corrige
#   checagem 3: a fonte da lista de seções válidas da ajuda, e os campos obrigatórios
#   checagem 6: o arquivo de menu e o arquivo de rotas do front
#   checagem 10: os READMEs que são só navegação
#
# DUAS DECISÕES QUE NÃO SE MEXEM SEM MOTIVO:
#
#   1. Doc alterada no diff em curso conta como fresca. Sem isso o script reprova justamente quem
#      está consertando a doc agora, e quem apanha da própria trava desliga a trava.
#   2. `cobre:` estreito. Declarar a pasta inteira do módulo faz a página vencer a cada ajuste de
#      CSS; o que se declara é a tela e os arquivos que aquela página de fato ensina.
# ------------------------------------------------------------------------------------------------
#
# Uso: sh spec/_fontes/verificar-documentacao.sh
# Sai 1 se achar qualquer divergência. Chamado pela checagem de documentação do `spec-analyze`.

set -eu
raiz=$(cd "$(dirname "$0")/../.." && pwd)
cd "$raiz"
falhas=0

DEV=docs
MOTIVO_MINIMO=10

falhar() {
  printf 'FALHA  %s\n' "$1"
  shift
  [ $# -gt 0 ] && printf '%s\n' "$@" | sed 's/^/         /'
  falhas=$((falhas + 1))
}

# Saída com motivo, lado do diff em curso. Motivo curto não abre a saída e ainda reprova, dizendo o
# mínimo: quem digitou `DOC_OK=ok` quis passar, e passar calado é o que a regra evita.
SAIDA_DOC=''
if [ -n "${DOC_OK:-}" ]; then
  if [ "${#DOC_OK}" -ge "$MOTIVO_MINIMO" ]; then
    SAIDA_DOC=1
  else
    falhar "DOC_OK com motivo curto: tem ${#DOC_OK} caracteres e o mínimo é $MOTIVO_MINIMO." \
      "Diga por que a doc continua verdadeira, ou toque o capítulo."
  fi
fi

# `cobre:` aceita `pasta/**`; o git entende a pasta, e o `**` só existe para quem lê.
caminhos_de_cobre() {
  printf '%s' "$1" | tr ',' '\n' | sed 's/^ *//;s/ *$//;s#/\*\*$##' | grep -v '^$' || true
}

# Data do commit mais recente em qualquer um dos caminhos. Vazio = nada commitado ainda.
#
# Código alterado no diff em curso, ou ainda sem rastreio, conta como de HOJE — pelo mesmo motivo
# que o capítulo alterado conta na checagem 7. A data que o `git log` devolve é a do último
# commit, então, ANTES de commitar, o código coberto parecia velho e a régua passava verde
# justamente na hora em que ela serve: quem mexeu no código e não na doc só era avisado depois do
# commit, quando a entrega já estava fechada.
#
# O segundo argumento, quando presente, diz que é a data do CÓDIGO coberto e que a saída `Doc-OK`
# vale: `$SAIDA_DOC` (variável `DOC_OK`) tira o diff em curso da conta, e o trailer `Doc-OK:` tira
# os commits que o trazem. A data do capítulo chama sem ele.
data_do_codigo() {
  saida=''
  [ -n "${2:-}" ] && saida=1

  if [ -z "$saida" ] || [ -z "${SAIDA_DOC:-}" ]; then
    # shellcheck disable=SC2086
    if ! git diff --quiet HEAD -- $1 2>/dev/null; then
      date +%F
      return
    fi

    # `git diff` não enxerga arquivo novo sem rastreio, e arquivo novo é metade do que uma entrega
    # dá à doc para absorver.
    # shellcheck disable=SC2086
    if [ -n "$(git ls-files --others --exclude-standard -- $1 2>/dev/null)" ]; then
      date +%F
      return
    fi
  fi

  if [ -n "$saida" ]; then
    # Trailer com motivo curto não isenta o commit, pela mesma régua da variável.
    # shellcheck disable=SC2086
    git log -1 --format=%cs --invert-grep --extended-regexp --grep="^Doc-OK: .{${MOTIVO_MINIMO:-10},}" -- $1 2>/dev/null || true
    return
  fi

  # shellcheck disable=SC2086
  git log -1 --format=%cs -- $1 2>/dev/null || true
}

# ---------------------------------------------------------------- 1. citação com lastro
padrao_de_caminho='src/[A-Za-z0-9_./-]+\.(gs|html|json)'
mortas=''
for citada in $(grep -ohE "$padrao_de_caminho" "$DEV"/*.md | sort -u); do
  [ -e "$citada" ] || mortas="$mortas$citada
"
done
if [ -n "$mortas" ]; then
  falhar "caminho citado em $DEV/ e inexistente:" "$(printf '%s' "$mortas")"
else
  printf 'ok     citação de caminho em %s/\n' "$DEV"
fi

# ---------------------------------------------------------------- 2. números declarados
# A forma escrita é o contrato: `<N> models` casa, "cerca de 50 modelos" não casa nada.
conferir_numero() {
  rotulo=$1; real=$2
  alvos=''
  [ -d "$DEV" ] && alvos="$alvos $(find "$DEV" -maxdepth 1 -name '*.md' 2>/dev/null)"
  [ -d spec ] && alvos="$alvos $(find spec -maxdepth 1 -name '*.md' 2>/dev/null)"
  [ -f CLAUDE.md ] && alvos="$alvos CLAUDE.md"
  if [ -z "$alvos" ]; then
    printf 'ok     %s (sem alvo)\n' "$rotulo"
    return
  fi
  # shellcheck disable=SC2086
  errados=$(grep -rhoE "[0-9]+ $rotulo" $alvos | sort -u | grep -v "^$real $rotulo$" || true)
  if [ -n "$errados" ]; then
    falhar "número $rotulo errado (real: $real $rotulo):" "$errados"
  else
    printf 'ok     %s (%s)\n' "$rotulo" "$real"
  fi
}
# Um por contagem que a doc declara. Exemplos de forma (apagar e substituir):
#   conferir_numero models      "$(find <pasta dos models> -maxdepth 1 -name '*.<ext>' | wc -l | tr -d ' ')"
#   conferir_numero controllers "$(find <pasta dos controllers> -name '*.<ext>' | wc -l | tr -d ' ')"
#   conferir_numero endpoints   "$(grep -cE '<padrão de declaração de rota>' <arquivo de rotas> | tr -d ' ')"

# ---------------------------------------------------------------- 7. doc vencida
# É a checagem que importa: as outras achatam erro de digitação, esta acha doc que virou mentira.
vencidas=''
for capitulo in "$DEV"/*.md; do
  # O README é o mapa da pasta, não ensina código: não tem o que cobrir.
  [ "$capitulo" = "$DEV/README.md" ] && continue
  cobre=$(sed -n '1,3p' "$capitulo" | sed -n 's/^<!-- cobre: *//p' | sed 's/ *-->$//' | head -1)
  if [ -z "$cobre" ]; then
    vencidas="$vencidas$capitulo (sem <!-- cobre: --> na primeira linha)
"
    continue
  fi
  # Capítulo alterado no diff em curso conta como fresco: quem carimba a data é o commit, e sem
  # isto o script reprovaria justamente quem está consertando a doc agora.
  if git diff --quiet HEAD -- "$capitulo" 2>/dev/null; then
    doc=$(data_do_codigo "$capitulo")
  else
    doc=$(date +%F)
  fi
  codigo=$(data_do_codigo "$(caminhos_de_cobre "$cobre" | tr '\n' ' ')" saida)
  [ -n "$doc" ] && [ -n "$codigo" ] || continue
  [ "$codigo" \> "$doc" ] && vencidas="$vencidas$capitulo (código $codigo > doc $doc)
"
done
[ -n "$vencidas" ] && falhar 'documentação vencida — o código que ela cobre andou depois dela:' "$(printf '%s' "$vencidas")" || printf 'ok     doc mais nova que o código que cobre\n'

# ---------------------------------------------------------------- 8. contagem de lacunas
# Confronta o número declarado na prosa de spec/estado.md com a contagem real de `### Q-` nos
# arquivos de lacunas. Sem estado.md ou sem número declarado, não falha.
conferir_lacunas() {
  if [ ! -f spec/estado.md ]; then
    printf 'ok     lacunas (sem alvo)\n'
    return
  fi
  abertas_declaradas=$(grep -oE '[0-9]+ lacunas? abertas?' spec/estado.md | grep -oE '[0-9]+' | head -1)
  fechadas_declaradas=$(grep -oE '[0-9]+ já fechadas?' spec/estado.md | grep -oE '[0-9]+' | head -1)
  if [ -z "$abertas_declaradas" ] && [ -z "$fechadas_declaradas" ]; then
    printf 'ok     lacunas (sem número declarado)\n'
    return
  fi
  # `grep -c` já imprime 0 quando não acha; `|| echo 0` somava um segundo zero e reprovava o zero.
  abertas_reais=$(grep -c '^### Q-' spec/estado.md || true)
  fechadas_reais=0
  if [ -f spec/_arquivo/lacunas-fechadas.md ]; then
    fechadas_reais=$(grep -c '^### Q-' spec/_arquivo/lacunas-fechadas.md || true)
  fi
  divergiu=0
  if [ -n "$abertas_declaradas" ] && [ "$abertas_declaradas" != "$abertas_reais" ]; then
    falhar "lacunas abertas: estado.md declara $abertas_declaradas, mas há $abertas_reais Q- em spec/estado.md"
    divergiu=1
  fi
  if [ -n "$fechadas_declaradas" ] && [ "$fechadas_declaradas" != "$fechadas_reais" ]; then
    falhar "lacunas fechadas: estado.md declara $fechadas_declaradas, mas há $fechadas_reais Q- em spec/_arquivo/lacunas-fechadas.md"
    divergiu=1
  fi
  [ "$divergiu" -eq 0 ] && printf 'ok     lacunas (%s abertas, %s fechadas)\n' "$abertas_reais" "$fechadas_reais"
}

# ---------------------------------------------------------------- 9. tabela podada citada como viva
# Se spec/produto.md tiver frase de poda do tipo "`x`, `y` saíram em <data>", esses nomes não podem
# aparecer em nenhum outro ponto do arquivo.
conferir_poda() {
  if [ ! -f spec/produto.md ]; then
    printf 'ok     poda (sem alvo)\n'
    return
  fi
  # Linhas de poda: contêm "saíram em <data>", na forma ISO (AAAA-MM-DD) ou DD/MM/AAAA. Cada linha
  # pode podar vários termos; o que vier DEPOIS de "saíram" na mesma linha — ex.: uma enumeração de
  # tabelas que seguem vivas — não é poda. `(i|í)`, e não `[ií]`: classe com caractere multibyte
  # não casa nada sob LC_ALL=C, o locale de hook e de CI sem LANG.
  linhas_poda=$(grep -E 'sa(i|í)ram em ([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}/[0-9]{2}/[0-9]{4})' spec/produto.md || true)
  if [ -z "$linhas_poda" ]; then
    printf 'ok     poda (sem poda declarada)\n'
    return
  fi
  # Termos podados: só os `...` que aparecem ANTES de "saíram" na linha da frase de poda.
  podados=$(printf '%s' "$linhas_poda" | sed -E 's/sa(i|í)ram.*//' | grep -oE '`[^`]+`' | tr -d '`' | sort -u)
  # O resto do arquivo, sem as frases de poda.
  corpo_sem_poda=$(grep -vE 'sa(i|í)ram em ([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}/[0-9]{2}/[0-9]{4})' spec/produto.md || true)
  vivos=''
  # Linha a linha: `for` sobre a lista quebraria nome com espaço e expandiria glob. `-F` porque
  # nome de tabela não é regex.
  while IFS= read -r nome; do
    [ -n "$nome" ] || continue
    if printf '%s' "$corpo_sem_poda" | grep -qF "\`$nome\`"; then
      vivos="$vivos$nome
"
    fi
  done <<EOF
$podados
EOF
  if [ -n "$vivos" ]; then
    falhar "termo declarado como podado e ainda citado em spec/produto.md fora da frase de poda:" "$(printf '%s' "$vivos")"
  else
    printf 'ok     poda (%s termo(s) podado(s), nenhum vivo)\n' "$(printf '%s\n' "$podados" | grep -c . || true)"
  fi
}

conferir_lacunas
conferir_poda

# ---------------------------------------------------------------- 10. sumário do README resolve
# O README é a porta de entrada e é só navegação: nenhum número, nenhum trecho de código, então não
# tem `cobre:` nem vence. O que ele tem a perder é o destino — capítulo renomeado deixa o sumário
# apontando para o vazio, e quem chega desiste ali.
quebrados=''
readmes="README.md"
# shellcheck disable=SC2086
for destino in $(grep -oE '\]\([^)#]+\.md(#[^)]*)?\)' $readmes \
  | sed 's/^[^(]*(//;s/)$//;s/#.*$//' | grep -v '^http' | sort -u); do
  [ -e "$destino" ] || quebrados="$quebrados$destino
"
done
[ -n "$quebrados" ] && falhar 'link do README apontando para arquivo inexistente:' "$(printf '%s' "$quebrados")" || printf 'ok     links do README\n'

printf '\n'
[ "$falhas" -eq 0 ] && { printf 'Documentação de dev e de uso conferida com o código.\n'; exit 0; }
printf '%d checagem(ns) com divergência. O código manda: corrigir a documentação.\n' "$falhas"
exit 1
