#!/bin/sh
# Harness do portão de entrega (verificar-entrega.sh), no formato de verificar.test.sh.
#
# TEMPLATE, sem lacuna. Copiar para spec/_fontes/ junto com o portão. Roda num repositório
# temporário, com stubs no lugar das quatro etapas: não toca no repositório do projeto nem exige
# que o lint ou o formatador da stack estejam instalados. Cada caso confere o que o portão pega e o
# que ele deixa passar em silêncio, nos dois sentidos.
#
# Testa o MECANISMO, não a instância. Copia o portão vizinho para o repositório temporário e
# sobrepõe cada variável do bloco INSTÂNCIA por ENTREGA_*, então roda igual no kit, onde as lacunas
# ainda são `<...>`, e no projeto instalado, seja qual for o que ele preencheu. Daí também o que
# ele não prova: que as pastas, as extensões e os comandos do projeto estão certos. Isso só se
# prova rodando o portão de verdade.
#
# Uso (de qualquer diretório): sh <caminho>/verificar-entrega.test.sh

set -u
# Dentro de um hook o git exporta estas variáveis, e o `git init` abaixo miraria o repo do projeto.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE
script=$(cd "$(dirname "$0")" && pwd)/verificar-entrega.sh
tmp=$(mktemp -d) && [ -d "$tmp" ] || exit 1
# Os objetos do git nascem somente leitura: sem o chmod, o rm pergunta arquivo por arquivo.
trap 'chmod -R u+w "$tmp"; rm -r "$tmp"' EXIT

base=$tmp/base      # repositório com um commit, copiado a cada caso
stubs=$tmp/stubs
ctl=$tmp/ctl        # o que o teste pede aos stubs: código de saída, "corrija o arquivo", "leia o stdin"
log=$tmp/log        # o que os stubs registram: ordem das chamadas e argumentos
saida=$tmp/saida
mkdir -p "$stubs" "$ctl" "$log"
casos=0             # cada caso ganha um repositório novo, e tudo se apaga uma vez só, na saída

passou=0
falhou=0

conferir() {
  if [ "$3" -eq "$2" ]; then
    passou=$((passou + 1))
  else
    falhou=$((falhou + 1))
    echo "FALHA  $1 (esperado $2, obtido $3)"
  fi
}

saida_tem() { grep -qF -- "$1" "$saida"; conferir "$2" 0 $?; }
saida_nao_tem() { grep -qF -- "$1" "$saida"; conferir "$2" 1 $?; }
rodou() { [ -f "$log/$1.args" ]; conferir "$2" 0 $?; }
nao_rodou() { [ -f "$log/$1.args" ]; conferir "$2" 1 $?; }
# Os argumentos que o stub recebeu, numa linha só.
args_sao() { [ "$(tr '\n' ' ' <"$log/$1.args" 2>/dev/null | sed 's/ $//')" = "$2" ]; conferir "$3" 0 $?; }
ordem_e() { [ "$(tr '\n' ' ' <"$log/ordem" 2>/dev/null | sed 's/ $//')" = "$1" ]; conferir "$2" 0 $?; }
linhas() { wc -l <"$saida" | tr -d ' '; }
maiuscula() { echo "$1" | tr 'a-z' 'A-Z'; }

# Stub de uma etapa: registra a chamada, diz uma coisa em cada saída e sai com o código que o teste
# deixou em $ctl/<nome>. Com $ctl/<nome>-corrige, reescreve os arquivos que recebeu, como o
# formatador faz com o que está sujo. Com $ctl/<nome>-le-stdin, falha se conseguir ler o stdin.
criar_stub() {
  cat >"$stubs/$1" <<STUB
#!/bin/sh
echo $1 >>"$log/ordem"
printf '%s\n' "\$@" >"$log/$1.args"
echo "ok     verificacao-boa"
echo "$2-SAIDA"
echo "$2-ERRO" >&2
if [ -f "$ctl/$1-corrige" ]; then
  for f in "\$@"; do [ -f "\$f" ] && echo "// formatado" >>"\$f"; done
fi
if [ -f "$ctl/$1-le-stdin" ] && read -r entrada; then
  exit 7
fi
exit \$(cat "$ctl/$1" 2>/dev/null || echo 0)
STUB
}

etapas="lint formatador inventario documentacao"
for e in $etapas; do
  criar_stub "$e" "$(maiuscula "$e")"
done

# A instância inteira, sobreposta por ENTREGA_*. O comando é de várias palavras, como o `npx
# eslint` de verdade: o portão tem de dividi-lo. Cada caso volta a ela antes de mexer no que quer.
instancia() {
  export ENTREGA_LINT="sh $stubs/lint"
  export ENTREGA_LINT_PASTAS="src test ."
  export ENTREGA_LINT_EXTENSOES="js vue"
  export ENTREGA_FORMATADOR="sh $stubs/formatador"
  export ENTREGA_FORMATADOR_PASTAS="backend"
  export ENTREGA_FORMATADOR_EXTENSOES="php"
  export ENTREGA_INVENTARIO="sh $stubs/inventario"
  export ENTREGA_DOCUMENTACAO="sh $stubs/documentacao"
}

# Repositório base: o portão copiado para onde ele espera estar e um arquivo de cada tipo que os
# filtros têm de separar. `srcextra/` existe para provar que `src` casa a pasta, não o prefixo do
# nome, e `fixtures/f.php` é o PHP que entra na lista do formatador só pela extensão e tem de ficar
# de fora.
mkdir -p "$base/spec/_fontes/fixtures" "$base/src" "$base/srcextra" "$base/test/unit" \
  "$base/backend/app" "$base/backend/assets" "$base/docs"
cp "$script" "$base/spec/_fontes/verificar-entrega.sh"
printf 'src/gerado.js\n' >"$base/.gitignore"
for f in src/a.vue src/b.js src/velho.js src/leia.md src/x.mjs srcextra/z.js config.js \
  test/unit/t.js backend/app/Foo.php backend/assets/app.js spec/_fontes/fixtures/f.js \
  spec/_fontes/fixtures/f.php docs/x.md; do
  echo base >"$base/$f"
done
git init -q -b main "$base" 2>/dev/null || git init -q "$base"
git -C "$base" config user.email harness@exemplo.invalid
git -C "$base" config user.name harness
git -C "$base" config commit.gpgsign false
git -C "$base" add -A
git -C "$base" commit -q --no-verify -m base

# Cada caso parte de uma cópia limpa do base, sem pedido pendente aos stubs e com a instância padrão.
novo_repo() {
  casos=$((casos + 1))
  repo=$tmp/caso$casos
  cp -R "$base" "$repo"
  rm -f "$ctl"/*
  instancia
}

# Roda o portão do repositório temporário a partir de $1 (por padrão, fora dele): saída em $saida,
# código em $codigo. O stdin chega com conteúdo, para que um stdin que vaze até a etapa apareça.
entrega() {
  rm -f "$log"/*
  ( cd "${1:-$tmp}" && echo entrada | sh "$repo/spec/_fontes/verificar-entrega.sh" ) >"$saida" 2>&1
  codigo=$?
}

# --- tudo verde ---

novo_repo
echo mudou >>"$repo/src/a.vue"
echo mudou >>"$repo/backend/app/Foo.php"
entrega
conferir "tudo verde: sai 0" 0 "$codigo"
[ "$(linhas)" -eq 1 ]
conferir "tudo verde: imprime so o resumo, uma linha" 0 $?
saida_tem "entrega verde: lint (1 arquivo(s)), formatador (1 arquivo(s)), inventario, documentacao" "tudo verde: o resumo diz o que rodou"
ordem_e "$etapas" "tudo verde: as quatro rodam, nesta ordem"
args_sao lint "src/a.vue" "tudo verde: o lint recebe o arquivo de front alterado"
args_sao formatador "backend/app/Foo.php" "tudo verde: o formatador recebe o arquivo de back alterado, sem flag que o portao invente"
saida_nao_tem "SAIDA" "tudo verde: etapa verde nao imprime a propria saida"

# --- uma etapa vermelha, cada uma de uma vez ---

for etapa in $etapas; do
  marca=$(maiuscula "$etapa")
  novo_repo
  echo mudou >>"$repo/src/a.vue"
  echo mudou >>"$repo/backend/app/Foo.php"
  echo 1 >"$ctl/$etapa"
  entrega
  [ "$codigo" -ne 0 ]
  conferir "$etapa vermelha: sai diferente de zero" 0 $?
  saida_tem "FALHA  $etapa (saiu 1)" "$etapa vermelha: imprime o nome e o codigo da etapa"
  saida_tem "$marca-SAIDA" "$etapa vermelha: imprime a saida dela"
  saida_tem "$marca-ERRO" "$etapa vermelha: imprime tambem o stderr dela"
  saida_nao_tem "verificacao-boa" "$etapa vermelha: a linha ok do verificador fica de fora"
  saida_tem "entrega vermelha: falharam $etapa" "$etapa vermelha: o resumo nomeia a etapa"
  for outra in $etapas; do
    [ "$outra" = "$etapa" ] && continue
    saida_nao_tem "$(maiuscula "$outra")-SAIDA" "$etapa vermelha: nao imprime a saida de $outra"
    rodou "$outra" "$etapa vermelha: $outra rodou mesmo assim"
  done
  ordem_e "$etapas" "$etapa vermelha: as quatro rodaram, nesta ordem"
done

# --- duas vermelhas ---

novo_repo
echo mudou >>"$repo/src/a.vue"
echo mudou >>"$repo/backend/app/Foo.php"
echo 1 >"$ctl/lint"
echo 2 >"$ctl/documentacao"
entrega
saida_tem "LINT-SAIDA" "duas vermelhas: imprime a saida do lint"
saida_tem "FALHA  documentacao (saiu 2)" "duas vermelhas: imprime o codigo de saida da segunda"
saida_nao_tem "FORMATADOR-SAIDA" "duas vermelhas: o formatador verde fica mudo"
saida_tem "entrega vermelha: falharam lint, documentacao" "duas vermelhas: o resumo nomeia as duas"

# --- arquivo novo fora do git ---

novo_repo
echo novo >"$repo/src/novo.vue"
echo novo >"$repo/src/gerado.js"
echo novo >"$repo/docs/novo.md"
echo novo >"$repo/backend/app/Novo.php"
entrega "$repo/src"
conferir "arquivo novo: sai 0" 0 "$codigo"
args_sao lint "src/novo.vue" "arquivo novo fora do git entra no lint, sem o ignorado e sem o que nao e front, e de dentro de uma subpasta"
args_sao formatador "backend/app/Novo.php" "arquivo novo fora do git entra no formatador"

# --- arquivo apagado ---

novo_repo
rm "$repo/src/velho.js"
git -C "$repo" rm -q src/b.js
echo mudou >>"$repo/src/a.vue"
entrega
args_sao lint "src/a.vue" "arquivo apagado, no disco ou em stage, nao entra no lint"

novo_repo
rm "$repo/src/velho.js" "$repo/backend/app/Foo.php"
entrega
conferir "so arquivos apagados: sai 0" 0 "$codigo"
nao_rodou lint "so arquivos apagados: o lint pula, sem arquivo para dar"
nao_rodou formatador "so arquivos apagados: o formatador pula, sem arquivo para dar"

# --- modificado e em stage ---

novo_repo
echo mudou >>"$repo/src/b.js"
git -C "$repo" add src/b.js
echo mudou >>"$repo/config.js"
git -C "$repo" add config.js
echo mais >>"$repo/config.js"
echo mudou >>"$repo/src/a.vue"
entrega
args_sao lint "config.js src/a.vue src/b.js" "modificado e em stage entram, e o que esta nos dois so uma vez"

# --- so extensao e pasta de front ---

novo_repo
for f in src/a.vue config.js test/unit/t.js backend/assets/app.js srcextra/z.js \
  spec/_fontes/fixtures/f.js src/leia.md src/x.mjs; do
  echo mudou >>"$repo/$f"
done
entrega
args_sao lint "config.js src/a.vue test/unit/t.js" "so entram js e vue de src/, test/ e da raiz, e nao backend, srcextra, fixtures, md nem mjs"
nao_rodou formatador "so extensao e pasta de front: nenhum arquivo do formatador, ele pula"

# --- a raiz, com o ponto, e as pastas ---

novo_repo
echo mudou >>"$repo/config.js"
echo mudou >>"$repo/src/a.vue"
export ENTREGA_LINT_PASTAS="."
entrega
args_sao lint "config.js" "LINT_PASTAS so com o ponto: entra o arquivo da raiz e nao o de src/"

novo_repo
echo mudou >>"$repo/config.js"
echo mudou >>"$repo/src/a.vue"
export ENTREGA_LINT_PASTAS="src test"
entrega
args_sao lint "src/a.vue" "LINT_PASTAS sem o ponto: o arquivo da raiz fica de fora"

novo_repo
echo mudou >>"$repo/src/a.vue"
echo mudou >>"$repo/backend/assets/app.js"
echo mudou >>"$repo/config.js"
export ENTREGA_LINT_PASTAS="./src/ backend/assets"
entrega
args_sao lint "backend/assets/app.js src/a.vue" "pasta com ./ e barra final casa, pasta aninhada tambem, e a raiz fica de fora sem o ponto"

novo_repo
echo mudou >>"$repo/src/a.vue"
export ENTREGA_LINT_PASTAS=""
entrega
conferir "LINT_PASTAS vazia: sai 0" 0 "$codigo"
nao_rodou lint "LINT_PASTAS vazia: nenhuma pasta, nenhum arquivo, o lint pula"
saida_tem "lint pulado (sem arquivo de front)" "LINT_PASTAS vazia: o resumo diz que pulou"

# --- extensao com ponto e com asterisco ---

novo_repo
echo mudou >>"$repo/src/a.vue"
echo mudou >>"$repo/src/b.js"
echo mudou >>"$repo/src/x.mjs"
export ENTREGA_LINT_EXTENSOES=".js *.vue"
entrega
args_sao lint "src/a.vue src/b.js" "extensao com ponto ou asterisco vale como sem ele"

# --- sem arquivo de front ---

novo_repo
echo mudou >>"$repo/backend/app/Foo.php"
echo mudou >>"$repo/docs/x.md"
echo novo >"$repo/docs/novo.md"
entrega
conferir "sem arquivo de front: sai 0" 0 "$codigo"
nao_rodou lint "sem arquivo de front: o lint pula"
saida_tem "lint pulado (sem arquivo de front)" "sem arquivo de front: o resumo diz que pulou"
ordem_e "formatador inventario documentacao" "sem arquivo de front: as outras tres rodam"

novo_repo
entrega
conferir "arvore limpa: sai 0" 0 "$codigo"
nao_rodou lint "arvore limpa: o lint pula"
nao_rodou formatador "arvore limpa: o formatador pula"
saida_tem "formatador pulado (sem arquivo de back)" "arvore limpa: o resumo diz que o formatador pulou"
ordem_e "inventario documentacao" "arvore limpa: so os dois verificadores rodam"

# --- o formatador: so as extensoes dele ---

novo_repo
echo mudou >>"$repo/backend/app/Foo.php"
echo mudou >>"$repo/src/a.vue"
echo mudou >>"$repo/docs/x.md"
entrega
args_sao formatador "backend/app/Foo.php" "o formatador recebe so a extensao dele, e nao o front nem o md"

novo_repo
echo mudou >>"$repo/backend/app/Foo.php"
echo mudou >>"$repo/docs/x.md"
echo mudou >>"$repo/src/leia.md"
export ENTREGA_FORMATADOR_EXTENSOES="php md"
export ENTREGA_FORMATADOR_PASTAS=""
entrega
args_sao formatador "backend/app/Foo.php docs/x.md src/leia.md" "FORMATADOR_EXTENSOES com duas extensoes e FORMATADOR_PASTAS vazia: o formatador recebe as duas, de qualquer pasta"

novo_repo
echo mudou >>"$repo/src/a.vue"
entrega
conferir "sem arquivo de back: sai 0" 0 "$codigo"
nao_rodou formatador "sem arquivo de back: o formatador pula"
saida_tem "formatador pulado (sem arquivo de back)" "sem arquivo de back: o resumo diz que pulou"
ordem_e "lint inventario documentacao" "sem arquivo de back: as outras tres rodam"

# --- o formatador: so as pastas dele ---

# O caso que motivou a variável: PHP de fixture, que o formatador reescreveria, alterado e novo.
novo_repo
echo mudou >>"$repo/backend/app/Foo.php"
echo mudou >>"$repo/spec/_fontes/fixtures/f.php"
echo novo >"$repo/spec/_fontes/fixtures/novo.php"
entrega
args_sao formatador "backend/app/Foo.php" "FORMATADOR_PASTAS: o php de backend entra no formatador, e o de fixtures, alterado ou novo, fica de fora"

novo_repo
echo mudou >>"$repo/spec/_fontes/fixtures/f.php"
entrega
conferir "so php fora das pastas: sai 0" 0 "$codigo"
nao_rodou formatador "so php fora das pastas: o formatador pula, sem arquivo para dar"
saida_tem "formatador pulado (sem arquivo de back)" "so php fora das pastas: o resumo diz que pulou"
ordem_e "inventario documentacao" "so php fora das pastas: so os dois verificadores rodam"

novo_repo
echo mudou >>"$repo/backend/app/Foo.php"
echo mudou >>"$repo/docs/x.md"
echo mudou >>"$repo/src/leia.md"
export ENTREGA_FORMATADOR_EXTENSOES="php md"
export ENTREGA_FORMATADOR_PASTAS="./backend/ docs"
entrega
args_sao formatador "backend/app/Foo.php docs/x.md" "FORMATADOR_PASTAS com duas pastas, uma com ./ e barra final: o formatador recebe as duas e nao o md de src/"

novo_repo
echo mudou >>"$repo/backend/app/Foo.php"
echo mudou >>"$repo/spec/_fontes/fixtures/f.php"
export ENTREGA_FORMATADOR_PASTAS=""
entrega
args_sao formatador "backend/app/Foo.php spec/_fontes/fixtures/f.php" "FORMATADOR_PASTAS vazia: sem filtro, o formatador recebe o php de qualquer pasta, como antes da variavel"

# --- o formatador corrige ---

novo_repo
echo mudou >>"$repo/backend/app/Foo.php"
touch "$ctl/formatador-corrige"
entrega
conferir "formatador corrigiu: sai 0, correcao nao e falha" 0 "$codigo"
saida_tem "formatador corrigiu 1 arquivo(s): backend/app/Foo.php" "formatador corrigiu: uma linha informativa nomeia o arquivo"
[ "$(linhas)" -eq 2 ]
conferir "formatador corrigiu: so a linha informativa e o resumo" 0 $?
saida_nao_tem "FALHA" "formatador corrigiu: nao aparece como falha"

novo_repo
echo mudou >>"$repo/backend/app/Foo.php"
for n in 1 2 3 4 5 6; do echo novo >"$repo/backend/app/P$n.php"; done
touch "$ctl/formatador-corrige"
entrega
saida_tem "formatador corrigiu 7 arquivo(s): backend/app/Foo.php backend/app/P1.php backend/app/P2.php backend/app/P3.php backend/app/P4.php e mais 2" "formatador corrigiu 7: lista cinco e conta o resto"

novo_repo
echo mudou >>"$repo/backend/app/Foo.php"
touch "$ctl/formatador-corrige"
echo 1 >"$ctl/formatador"
entrega
conferir "formatador corrigiu e falhou: sai 1" 1 "$codigo"
saida_tem "FALHA  formatador (saiu 1)" "formatador corrigiu e falhou: a falha aparece"
saida_tem "formatador corrigiu 1 arquivo(s): backend/app/Foo.php" "formatador corrigiu e falhou: a correcao aparece tambem"

# --- etapa vazia e pulada ---

for etapa in $etapas; do
  novo_repo
  echo mudou >>"$repo/src/a.vue"
  echo mudou >>"$repo/backend/app/Foo.php"
  export "ENTREGA_$(maiuscula "$etapa")="
  entrega
  conferir "$etapa vazia: sai 0" 0 "$codigo"
  saida_tem "$etapa pulado (sem comando)" "$etapa vazia: o resumo diz que pulou e por que"
  nao_rodou "$etapa" "$etapa vazia: a etapa nao rodou"
  for outra in $etapas; do
    [ "$outra" = "$etapa" ] && continue
    rodou "$outra" "$etapa vazia: $outra rodou mesmo assim"
  done
done

# --- lacuna sem preencher: sai 1, nao pula ---

for nome in LINT LINT_PASTAS LINT_EXTENSOES FORMATADOR FORMATADOR_PASTAS FORMATADOR_EXTENSOES; do
  novo_repo
  echo mudou >>"$repo/src/a.vue"
  echo mudou >>"$repo/backend/app/Foo.php"
  export "ENTREGA_$nome=<preencher $nome>"
  entrega
  conferir "$nome sem preencher: sai 1" 1 "$codigo"
  saida_tem "instancia incompleta: preencher $nome no topo de spec/_fontes/verificar-entrega.sh" "$nome sem preencher: a mensagem nomeia a variavel"
  [ "$(linhas)" -eq 1 ]
  conferir "$nome sem preencher: so a mensagem, uma linha" 0 $?
  [ ! -f "$log/ordem" ]
  conferir "$nome sem preencher: nenhuma etapa rodou" 0 $?
done

novo_repo
echo mudou >>"$repo/src/a.vue"
export ENTREGA_LINT="<comando>"
export ENTREGA_FORMATADOR_EXTENSOES="<extensoes>"
entrega
conferir "duas lacunas: sai 1" 1 "$codigo"
saida_tem "instancia incompleta: preencher LINT no topo de spec/_fontes/verificar-entrega.sh" "duas lacunas: nomeia a primeira"
saida_tem "instancia incompleta: preencher FORMATADOR_EXTENSOES no topo de spec/_fontes/verificar-entrega.sh" "duas lacunas: nomeia a segunda, na mesma rodada"

novo_repo
echo mudou >>"$repo/src/a.vue"
export ENTREGA_LINT=""
export ENTREGA_LINT_PASTAS="<pastas>"
entrega
conferir "lacuna numa etapa desligada: sai 1" 1 "$codigo"
saida_tem "instancia incompleta: preencher LINT_PASTAS no topo de spec/_fontes/verificar-entrega.sh" "lacuna numa etapa desligada: reprova do mesmo jeito"

# --- verificador ausente e pulado ---

for etapa in inventario documentacao; do
  novo_repo
  echo mudou >>"$repo/src/a.vue"
  echo mudou >>"$repo/backend/app/Foo.php"
  export "ENTREGA_$(maiuscula "$etapa")=sh spec/_fontes/verificar-$etapa.sh"
  entrega
  conferir "$etapa ausente: sai 0" 0 "$codigo"
  saida_tem "$etapa pulado (sem spec/_fontes/verificar-$etapa.sh)" "$etapa ausente: o resumo diz que pulou e qual script faltou"
  nao_rodou "$etapa" "$etapa ausente: a etapa nao rodou"
  for outra in $etapas; do
    [ "$outra" = "$etapa" ] && continue
    rodou "$outra" "$etapa ausente: $outra rodou mesmo assim"
  done
done

novo_repo
echo mudou >>"$repo/src/a.vue"
echo 'exit 3' >"$repo/spec/_fontes/verificar-inventario.sh"
export ENTREGA_INVENTARIO="sh spec/_fontes/verificar-inventario.sh"
entrega
saida_tem "FALHA  inventario (saiu 3)" "verificador presente: o caminho relativo se resolve da raiz do projeto, nao da pasta de quem chamou"
saida_nao_tem "pulado" "verificador presente: nada foi pulado"

# --- stdin fechado ---

novo_repo
echo mudou >>"$repo/src/a.vue"
touch "$ctl/lint-le-stdin"
entrega
conferir "stdin fechado: a etapa nao leu o stdin do portao, sai 0" 0 "$codigo"

echo "$passou passaram, $falhou falharam"
[ "$falhou" -eq 0 ]
