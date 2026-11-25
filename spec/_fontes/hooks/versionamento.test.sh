#!/bin/sh
# Harness dos hooks de versionamento: pre-commit, commit-msg, spec-acompanha e pre-push, no formato de
# verificar.test.sh.
#
# TEMPLATE, sem lacuna. Copiar para spec/_fontes/hooks/ junto com os hooks. Roda num repositorio
# temporario, entao nao toca no do projeto nem na rede. Os dois casos com o commitlint de verdade
# rodam contra o config do projeto, e so quando ele esta instalado; sem ele, sao pulados.
#
# No projeto instalado, NAO_VERSIONAR e VERSIONAR_APESAR (pre-commit), GATILHOS (spec-acompanha) e
# BRANCH_RELEASE (pre-push) sao do projeto. O harness testa o MECANISMO, nao a config: copia os
# hooks para o diretorio temporario e troca, na copia, os blocos NAO_VERSIONAR e VERSIONAR_APESAR
# por listas de fixture, o bloco GATILHOS por gatilhos de fixture e BRANCH_RELEASE por um valor de
# fixture. Assim roda igual em qualquer projeto, e nunca depende do que o projeto configurou.
#
# Cada hook e testado nos dois sentidos: o que so reprova vira alarme e acaba desligado, e o que
# so passa vira decoracao. Foi o caso "config presente" que pegou, no dia em que nasceu, o hook
# deixando passar tudo num projeto com commitlint.
#
# Uso (de qualquer diretorio): sh <caminho>/versionamento.test.sh

set -u
orig=$(cd "$(dirname "$0")" && pwd)
raiz=$(git -C "$orig" rev-parse --show-toplevel 2>/dev/null || echo "")
tmp=$(mktemp -d)
# Os objetos do git nascem somente leitura: sem o chmod, o rm pergunta arquivo por arquivo.
trap 'chmod -R u+w "$tmp"; rm -r "$tmp"' EXIT

# Copia dos hooks com a config trocada por fixture. O commit-msg chama o spec-acompanha pelo
# dirname, entao os dois precisam morar juntos na copia.
hooks="$tmp/hooks"
mkdir "$hooks"
for h in pre-commit commit-msg spec-acompanha pre-push; do
  [ -f "$orig/$h" ] && cp "$orig/$h" "$hooks/$h"
done
if [ -f "$hooks/pre-commit" ]; then
  # $1 = o unico caminho da VERSIONAR_APESAR; vazio deixa a lista sem elemento, que e o que o kit
  # distribui. A NAO_VERSIONAR tem sempre o prefixo backend/.env e a pasta pasta-local/.
  fixture_precommit() {
    awk -v apesar="$1" '
      /^NAO_VERSIONAR=\($/ {
        print "NAO_VERSIONAR=("
        print "  \"backend/.env\""
        print "  \"pasta-local/\""
        print ")"
        pula = 1
        next
      }
      /^VERSIONAR_APESAR=\($/ {
        print "VERSIONAR_APESAR=("
        if (apesar != "") print "  \"" apesar "\""
        print ")"
        pula = 1
        next
      }
      pula && /^\)$/ { pula = 0; next }
      pula { next }
      { print }
    ' "$orig/pre-commit"
  }
  fixture_precommit backend/.env.example >"$hooks/pre-commit"
  fixture_precommit "" >"$hooks/pre-commit-sem-apesar"
fi
if [ -f "$hooks/spec-acompanha" ]; then
  awk '
    /^GATILHOS=\($/ {
      print "GATILHOS=("
      print "  \"backend/app/Models/|spec/produto.md|entidades|A\""
      print "  \"backend/database/migrations/|spec/produto.md|entidades, colunas e schema|A\""
      print "  \"backend/app/Http/Controllers/|spec/produto.md|mapa de modulos|A\""
      print "  \"backend/app/Policies/|spec/regras.md spec/produto.md|autorizacao|*\""
      print "  \"backend/routes/|spec/produto.md|mapa de modulos e endpoints|*\""
      print "  \"src/modules/|spec/produto.md spec/features/|tela ou componente novo|A\""
      print ")"
      pula = 1
      next
    }
    pula && /^\)$/ { pula = 0; next }
    pula { next }
    { print }
  ' "$orig/spec-acompanha" >"$hooks/spec-acompanha"
fi
if [ -f "$hooks/pre-push" ]; then
  sed 's/^BRANCH_RELEASE=.*/BRANCH_RELEASE="trabalho"/' "$orig/pre-push" >"$hooks/pre-push"
fi

cd "$tmp" || exit 1

git init -q -b main . 2>/dev/null || git init -q .
git config user.email harness@exemplo.invalid
git config user.name harness
git config commit.gpgsign false
git config tag.gpgsign false

passou=0
falhou=0
pulou=0

conferir() {
  if [ "$3" -eq "$2" ]; then
    passou=$((passou + 1))
  else
    falhou=$((falhou + 1))
    echo "FALHA  $1 (esperado $2, obtido $3)"
  fi
}

zero=0000000000000000000000000000000000000000
empurrar() {
  printf 'refs/heads/x %s refs/heads/%s %s\n' "$1" "$2" "$zero" | sh "$hooks/pre-push" >/dev/null 2>&1
}

# --- pre-commit ---

# A copia $hooks/pre-commit leva a config de fixture: NAO_VERSIONAR com o prefixo backend/.env e a
# pasta pasta-local/, e VERSIONAR_APESAR com o backend/.env.example, que o prefixo barraria. A
# $hooks/pre-commit-sem-apesar e a mesma com a VERSIONAR_APESAR sem elemento. Os nomes sao de
# arquivo vazio: so o caminho conta.
if [ -f "$hooks/pre-commit" ]; then
  arquivos="backend/.env.example backend/.env backend/.env.production backend/leia-me.txt pasta-local/qualquer"
  mkdir backend pasta-local
  for f in $arquivos; do : >"$f"; done
  # $1 = a copia do hook, $2 = o arquivo que vai ao stage. O stderr fica em $tmp/err.
  precommit() { git add -f "$2"; sh "$1" >/dev/null 2>"$tmp/err"; r=$?; git reset -q -- "$2"; return $r; }

  precommit "$hooks/pre-commit" backend/.env.example
  conferir "pre-commit deixa passar o que a VERSIONAR_APESAR libera (backend/.env.example)" 0 $?
  precommit "$hooks/pre-commit" backend/.env
  conferir "pre-commit barra a entrada da NAO_VERSIONAR (backend/.env)" 1 $?
  precommit "$hooks/pre-commit" backend/.env.production
  conferir "pre-commit barra pelo prefixo o que a VERSIONAR_APESAR nao lista (backend/.env.production)" 1 $?
  precommit "$hooks/pre-commit" pasta-local/qualquer
  conferir "pre-commit barra o que mora na pasta da NAO_VERSIONAR (pasta-local/)" 1 $?
  precommit "$hooks/pre-commit" backend/leia-me.txt
  conferir "pre-commit deixa passar arquivo fora das duas listas" 0 $?

  # Lista de excecao sem elemento, que e o que o kit distribui. No bash anterior ao 4.4 (o macOS
  # traz o 3.2), o laco sem o + aborta aqui com "unbound variable".
  precommit "$hooks/pre-commit-sem-apesar" backend/leia-me.txt
  conferir "pre-commit com a VERSIONAR_APESAR vazia deixa passar arquivo fora das listas" 0 $?
  grep -q 'unbound variable' "$tmp/err"
  conferir "pre-commit com a VERSIONAR_APESAR vazia nao acusa variavel nao definida" 1 $?
  precommit "$hooks/pre-commit-sem-apesar" backend/.env.example
  conferir "pre-commit com a VERSIONAR_APESAR vazia volta a barrar o backend/.env.example" 1 $?

  # Ponto de extensao: cada arquivo de pre-commit.d/, ao lado do hook, roda depois das regras dele.
  echo ok >backend/extensao.txt
  precommit "$hooks/pre-commit" backend/extensao.txt
  conferir "pre-commit sem a pasta pre-commit.d segue como era" 0 $?
  mkdir "$hooks/pre-commit.d"
  printf '#!/bin/sh\nexit 0\n' >"$hooks/pre-commit.d/10-passa"
  chmod +x "$hooks/pre-commit.d/10-passa"
  precommit "$hooks/pre-commit" backend/extensao.txt
  conferir "pre-commit.d: a trava que passa libera o commit" 0 $?
  printf '#!/bin/sh\necho "trava do projeto: recusa" >&2\nexit 3\n' >"$hooks/pre-commit.d/20-barra"
  chmod +x "$hooks/pre-commit.d/20-barra"
  precommit "$hooks/pre-commit" backend/extensao.txt
  conferir "pre-commit.d: a trava que falha barra o commit" 1 $?
  grep -q '20-barra' "$tmp/err"
  conferir "pre-commit.d: a recusa diz qual trava barrou" 0 $?
  rm "$hooks/pre-commit.d/20-barra"
  printf '#!/bin/sh\nexit 0\n' >"$hooks/pre-commit.d/30-sem-bit"
  precommit "$hooks/pre-commit" backend/extensao.txt
  conferir "pre-commit.d: arquivo sem permissao de execucao barra" 1 $?
  grep -q 'permissao de execucao' "$tmp/err"
  conferir "pre-commit.d: e a mensagem diz o que fazer" 0 $?
  rm -r "$hooks/pre-commit.d" backend/extensao.txt

  for f in $arquivos; do rm "$f"; done
  rmdir backend pasta-local
else
  echo "pulado: casos do pre-commit (nao ha pre-commit ao lado do harness)"
fi

# --- commit-msg ---

echo "ajuste do badge" > msg-ruim
echo "fix(funil): o badge volta" > msg-boa

sh "$hooks/commit-msg" msg-ruim >/dev/null 2>&1
conferir "commit-msg sem config do commitlint e sem gatilho sai da frente" 0 $?

printf 'fix(x): y\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n' > msg-marca
sh "$hooks/commit-msg" msg-marca >/dev/null 2>&1
conferir "commit-msg recusa a marca de ferramenta de IA" 1 $?
printf 'fix(x): y\n\nCo-Authored-By: Fulana <fulana@exemplo.com>\n' > msg-humano
sh "$hooks/commit-msg" msg-humano >/dev/null 2>&1
conferir "commit-msg deixa passar co-autor humano" 0 $?

touch commitlint.config.js
sh "$hooks/commit-msg" msg-ruim >/dev/null 2>&1
conferir "commit-msg com config e sem node_modules pede npm install" 1 $?
mv commitlint.config.js commitlint.desligado

if [ -n "$raiz" ] && [ -x "$raiz/node_modules/.bin/commitlint" ]; then
  (cd "$raiz" && sh "$orig/commit-msg" "$tmp/msg-ruim") >/dev/null 2>&1
  conferir "commit-msg recusa cabecalho fora do formato" 1 $?
  (cd "$raiz" && sh "$orig/commit-msg" "$tmp/msg-boa") >/dev/null 2>&1
  conferir "commit-msg aceita cabecalho no formato" 0 $?
else
  pulou=2
fi

# --- spec-acompanha, spec versionada (modo stage) ---

# Repo proprio, para o stage de cada caso nao vazar para o dos de cima.
sp="$tmp/sp"
mkdir "$sp"
git -C "$sp" init -q -b main . 2>/dev/null || git -C "$sp" init -q .
git -C "$sp" config user.email harness@exemplo.invalid
git -C "$sp" config user.name harness
git -C "$sp" config commit.gpgsign false
mkdir -p "$sp/spec/features" "$sp/backend/database/migrations" "$sp/backend/app/Http/Controllers" \
  "$sp/backend/routes" "$sp/src/modules"
for f in spec/produto.md spec/regras.md spec/estado.md spec/features/x.md \
  backend/app/Http/Controllers/VagaController.php backend/routes/api.php; do echo base >"$sp/$f"; done
git -C "$sp" add -A
git -C "$sp" commit -q -m "chore: base"

# Cada caso: desfaz o stage, aplica as mudancas ($2 em diante: arquivo a tocar), confere.
acompanha() {
  # $1 = mensagem (arquivo), restante = arquivos a tocar e por no stage
  msg="$1"; shift
  git -C "$sp" reset -q --hard
  git -C "$sp" clean -qfd
  for f in "$@"; do
    mkdir -p "$sp/$(dirname "$f")"
    date +%s%N >>"$sp/$f"
    git -C "$sp" add "$f"
  done
  (cd "$sp" && sh "$hooks/spec-acompanha" "$tmp/$msg") >"$tmp/err" 2>&1
}
printf 'feat(x): y\n' >"$tmp/m-nenhuma"
printf 'feat(x): y\n\nSpec-OK: o modulo ja esta descrito\n' >"$tmp/m-ok"
printf 'feat(x): y\n\nSpec-OK: ok\n' >"$tmp/m-curta"
printf 'feat(x): y\n\n# Spec-OK: o modulo ja esta descrito\n# ------------------------ >8 ------------------------\nSpec-OK: depois da tesoura, nao vale\n' >"$tmp/m-comentada"
mig=backend/database/migrations/2026_10_04_000000_cria_x.php

acompanha m-nenhuma "$mig"
conferir "spec-acompanha: migration nova sem spec reprova" 1 $?
head -n 1 "$tmp/err" | grep -q '^.\{0,10\}commit-msg: este commit toca codigo que a spec/ descreve e nao traz a spec/ junto\.'
conferir "spec-acompanha: a primeira linha e a decisao" 0 $?
acompanha m-nenhuma "$mig" spec/produto.md
conferir "spec-acompanha: migration nova com spec/produto.md passa" 0 $?
acompanha m-nenhuma "$mig" spec/estado.md
conferir "spec-acompanha: migration nova com so spec/estado.md reprova" 1 $?
acompanha m-ok "$mig"
conferir "spec-acompanha: trailer Spec-OK com motivo valido passa" 0 $?
acompanha m-curta "$mig"
conferir "spec-acompanha: trailer com motivo curto reprova" 1 $?
acompanha m-comentada "$mig"
conferir "spec-acompanha: trailer so em linha comentada ou apos a tesoura reprova" 1 $?
SPEC_OK=1 acompanha m-nenhuma "$mig"
conferir "spec-acompanha: SPEC_OK=1 sem trailer reprova" 1 $?
acompanha m-nenhuma backend/app/Http/Controllers/VagaController.php
conferir "spec-acompanha: controller existente modificado passa" 0 $?
acompanha m-nenhuma backend/app/Http/Controllers/NovoController.php
conferir "spec-acompanha: controller novo sem spec reprova" 1 $?
acompanha m-nenhuma src/modules/exemplo/Nova.vue spec/features/x.md
conferir "spec-acompanha: arquivo novo em src/modules com spec/features passa" 0 $?
acompanha m-nenhuma backend/routes/api.php
conferir "spec-acompanha: routes modificado sem spec reprova" 1 $?

git -C "$sp" reset -q --hard
git -C "$sp" clean -qfd
mkdir -p "$sp/backend/database/migrations"
echo x >>"$sp/$mig"
git -C "$sp" add "$mig"
echo "$(git -C "$sp" rev-parse HEAD)" >"$sp/.git/MERGE_HEAD"
(cd "$sp" && sh "$hooks/spec-acompanha" "$tmp/m-nenhuma") >/dev/null 2>&1
conferir "spec-acompanha: merge em curso passa" 0 $?
rm "$sp/.git/MERGE_HEAD"

git -C "$sp" reset -q --hard
git -C "$sp" clean -qfd
mkdir -p "$sp/backend/database/migrations"
echo x >>"$sp/$mig"
git -C "$sp" add "$mig"
mv "$sp/spec" "$tmp/spec-guardada"
(cd "$sp" && sh "$hooks/spec-acompanha" "$tmp/m-nenhuma") >/dev/null 2>&1
conferir "spec-acompanha: sem spec/ no repo passa" 0 $?
mv "$tmp/spec-guardada" "$sp/spec"

# --- spec-acompanha, spec fora do git (modo mtime) ---

sm="$tmp/sm"
mkdir "$sm"
git -C "$sm" init -q -b main . 2>/dev/null || git -C "$sm" init -q .
git -C "$sm" config user.email harness@exemplo.invalid
git -C "$sm" config user.name harness
git -C "$sm" config commit.gpgsign false
mkdir -p "$sm/spec/features" "$sm/backend/database/migrations" "$sm/backend/app/Http/Controllers" \
  "$sm/backend/routes" "$sm/src/modules"
echo spec >"$sm/.git/info/exclude"
for f in backend/app/Http/Controllers/VagaController.php backend/routes/api.php; do echo base >"$sm/$f"; done
for f in spec/produto.md spec/regras.md spec/estado.md spec/features/x.md; do echo base >"$sm/$f"; done
git -C "$sm" add -A
git -C "$sm" commit -q -m "chore: base"
ct=$(git -C "$sm" log -1 --format=%ct)

# Poe o mtime de um doc da spec: antes ou depois do ultimo commit (delta em segundos).
datar() { touch -d "@$((ct + $2))" "$sm/$1"; }
# Todos os docs velhos: nenhum acompanhou o commit.
envelhecer() { for f in spec/produto.md spec/regras.md spec/estado.md spec/features/x.md; do datar "$f" -100; done; }

acompanha_mtime() {
  msg="$1"; shift
  git -C "$sm" reset -q --hard
  git -C "$sm" clean -qfd
  for f in "$@"; do
    mkdir -p "$sm/$(dirname "$f")"
    date +%s%N >>"$sm/$f"
    git -C "$sm" add "$f"
  done
  (cd "$sm" && sh "$hooks/spec-acompanha" "$tmp/$msg") >"$tmp/err" 2>&1
}

envelhecer
acompanha_mtime m-nenhuma "$mig"
conferir "spec-acompanha mtime: migration nova com a spec velha reprova" 1 $?
head -n 1 "$tmp/err" | grep -q 'commit-msg: este commit toca codigo que a spec/ descreve'
conferir "spec-acompanha mtime: a primeira linha e a decisao" 0 $?
grep -q 'atualizar o doc aceito' "$tmp/err"
conferir "spec-acompanha mtime: a saida 1 pede atualizar o doc aceito" 0 $?
grep -q 'git add' "$tmp/err"
conferir "spec-acompanha mtime: nao manda dar git add" 1 $?

datar spec/produto.md 5
acompanha_mtime m-nenhuma "$mig"
conferir "spec-acompanha mtime: doc aceito mais novo que o commit passa" 0 $?

# macOS: o stat do BSD nao tem -c, e o mtime vem do -f %m. Sem ele o doc parecia de 1970 e reprovava.
bsd="$tmp/bsd"
mkdir -p "$bsd"
printf '#!/bin/sh\ncase "$1" in -f) exec "%s" -c %%Y "$3" ;; esac\necho "stat: illegal option -- ${1#-}" >&2\nexit 1\n' \
  "$(command -v stat)" >"$bsd/stat"
chmod +x "$bsd/stat"
(PATH="$bsd:$PATH"; acompanha_mtime m-nenhuma "$mig")
conferir "spec-acompanha mtime: com o stat do BSD (macOS), doc aceito mais novo passa" 0 $?
envelhecer
(PATH="$bsd:$PATH"; acompanha_mtime m-nenhuma "$mig")
conferir "spec-acompanha mtime: com o stat do BSD (macOS), spec velha reprova" 1 $?

envelhecer
datar spec/produto.md 0
acompanha_mtime m-nenhuma "$mig"
conferir "spec-acompanha mtime: doc no mesmo segundo do commit passa (-ge)" 0 $?

envelhecer
datar spec/estado.md 5
acompanha_mtime m-nenhuma "$mig"
conferir "spec-acompanha mtime: so um doc nao aceito pelo gatilho reprova" 1 $?

envelhecer
acompanha_mtime m-ok "$mig"
conferir "spec-acompanha mtime: trailer Spec-OK com motivo valido passa" 0 $?
acompanha_mtime m-curta "$mig"
conferir "spec-acompanha mtime: trailer com motivo curto reprova" 1 $?

envelhecer
acompanha_mtime m-nenhuma backend/app/Http/Controllers/VagaController.php
conferir "spec-acompanha mtime: controller existente modificado passa" 0 $?
acompanha_mtime m-nenhuma backend/routes/api.php
conferir "spec-acompanha mtime: routes modificado com a spec velha reprova" 1 $?

envelhecer
acompanha_mtime m-nenhuma src/modules/a/Nova.vue
conferir "spec-acompanha mtime: arquivo novo em src/modules com a spec velha reprova" 1 $?
datar spec/features/x.md 5
acompanha_mtime m-nenhuma src/modules/a/Nova.vue
conferir "spec-acompanha mtime: doc em pasta (spec/features/) mais novo passa" 0 $?

if [ -f "$hooks/pre-push" ]; then
# --- pre-push ---

git commit -q --allow-empty -m "chore: a"
a=$(git rev-parse HEAD)
empurrar "$a" main
conferir "pre-push sem nenhuma tag v* sai da frente" 0 $?

git tag -a v1.0.0 -m v1.0.0
git commit -q --allow-empty -m "fix: b"
b=$(git rev-parse HEAD)
empurrar "$b" main
conferir "pre-push recusa commit sem tag na branch de deploy" 1 $?
empurrar "$a" main
conferir "pre-push aceita commit com tag na branch de deploy" 0 $?
empurrar "$b" outra
conferir "pre-push ignora outra branch" 0 $?
empurrar "$zero" main
conferir "pre-push ignora remocao da branch" 0 $?

# --- pre-push na branch de release (aviso, nao recusa) ---

# Stub do comando de release: no --dry-run imprime a linha que a ferramenta imprime; sem ele,
# commita e cria a tag, como a de verdade.
cat >"$tmp/release-stub.sh" <<'STUB'
#!/bin/sh
case "$*" in
  *--dry-run*) echo "bumping version in package.json from 1.0.0 to 1.0.1"; exit 0 ;;
esac
git commit -q --allow-empty -m "chore(release): 1.0.1" && git tag -a v1.0.1 -m v1.0.1
STUB
chmod +x "$tmp/release-stub.sh"
export PRE_PUSH_COMANDO_RELEASE="$tmp/release-stub.sh"
marca="$tmp/.git/release-avisada"

# Empurra para a trabalho sem terminal controlador (setsid) e guarda o stderr em $tmp/err.
empurrar_sem_terminal() {
  if command -v setsid >/dev/null 2>&1; then
    printf 'refs/heads/x %s refs/heads/trabalho %s\n' "$1" "$zero" | setsid -w sh "$hooks/pre-push" >/dev/null 2>"$tmp/err"
  else
    printf 'refs/heads/x %s refs/heads/trabalho %s\n' "$1" "$zero" | sh "$hooks/pre-push" >/dev/null 2>"$tmp/err"
  fi
}
# Empurra com a resposta da pergunta simulada ($2).
empurrar_responde() {
  printf 'refs/heads/x %s refs/heads/trabalho %s\n' "$1" "$zero" | PRE_PUSH_RESPOSTA="$2" sh "$hooks/pre-push" >/dev/null 2>"$tmp/err"
}

empurrar "$a" trabalho
conferir "pre-push trabalho: topo com tag passa" 0 $?

empurrar_sem_terminal "$b"
conferir "pre-push trabalho: sem terminal e sem aviso previo para o push" 1 $?
head -n 1 "$tmp/err" | grep -q 'a trabalho vai subir sem release (seria a v1.0.1, patch)\. Com release: .* e sincronize\. Sem release: sincronize de novo\.'
conferir "pre-push trabalho: a primeira linha carrega versao, tipo e decisao" 0 $?
[ "$(cat "$marca" 2>/dev/null)" = "$b" ]
conferir "pre-push trabalho: grava o SHA avisado na marca" 0 $?

empurrar_sem_terminal "$b"
conferir "pre-push trabalho: segundo push do mesmo SHA passa" 0 $?

git commit -q --allow-empty -m "fix: c"
c=$(git rev-parse HEAD)
empurrar_sem_terminal "$c"
conferir "pre-push trabalho: commit novo avisa de novo" 1 $?

git commit -q --allow-empty -m "fix: d"
d=$(git rev-parse HEAD)
empurrar_responde "$d" n
conferir "pre-push trabalho: terminal com n deixa passar" 0 $?

echo x >t.txt
git add t.txt
git commit -q -m "fix: e"
e=$(git rev-parse HEAD)
echo y >t.txt
tags_antes=$(git tag --list 'v*' | wc -l)
empurrar_responde "$e" s
conferir "pre-push trabalho: terminal com s e arvore suja recusa" 1 $?
[ "$(git tag --list 'v*' | wc -l)" -eq "$tags_antes" ]
conferir "pre-push trabalho: a recusa por arvore suja nao cria tag" 0 $?
git checkout -q -- t.txt

empurrar_responde "$e" s
conferir "pre-push trabalho: terminal com s e arvore limpa cria a release e para" 1 $?
[ -n "$(git tag --points-at HEAD --list 'v1.0.1')" ]
conferir "pre-push trabalho: a release criou a tag no topo" 0 $?
empurrar_sem_terminal "$(git rev-parse HEAD)"
conferir "pre-push trabalho: nenhum commit desde a tag passa" 0 $?

# --- pre-push na branch de release com a verificacao da doc ---

# Cada caso parte de um SHA novo e de marcas limpas. Release pendente: $b.. ja nao e topo com tag,
# entao todo commit novo desde v1.0.1 tem release pendente.
git commit -q --allow-empty -m "fix: g"
g=$(git rev-parse HEAD)
export PRE_PUSH_COMANDO_VERIFICAR=true
git tag -a v1.0.2 -m v1.0.2
empurrar_sem_terminal "$g"
conferir "pre-push trabalho: verificacao verde e sem release pendente nao para" 0 $?

git commit -q --allow-empty -m "fix: h"
h=$(git rev-parse HEAD)
git tag -a v1.0.3 -m v1.0.3
export PRE_PUSH_COMANDO_VERIFICAR=false
empurrar_responde "$h" n
conferir "pre-push trabalho: verificacao vermelha com terminal nao para" 0 $?
grep -q 'divergem do codigo' "$tmp/err"
conferir "pre-push trabalho: com terminal avisa a divergencia" 0 $?

git commit -q --allow-empty -m "fix: i"
i=$(git rev-parse HEAD)
git tag -a v1.0.4 -m v1.0.4
empurrar_sem_terminal "$i"
conferir "pre-push trabalho: verificacao vermelha sem terminal para" 1 $?
head -n 1 "$tmp/err" | grep -q '^pre-push: a doc ou o inventario divergem do codigo; rode sh '
conferir "pre-push trabalho: a primeira linha carrega a decisao da verificacao" 0 $?
empurrar_sem_terminal "$i"
conferir "pre-push trabalho: segundo push do mesmo SHA com verificacao vermelha passa" 0 $?

git commit -q --allow-empty -m "fix: j"
j=$(git rev-parse HEAD)
empurrar_sem_terminal "$j"
conferir "pre-push trabalho: release pendente e verificacao vermelha sem terminal param" 1 $?
grep -q 'divergem do codigo' "$tmp/err" && grep -q 'vai subir sem release' "$tmp/err"
conferir "pre-push trabalho: a parada unica traz as duas mensagens" 0 $?
empurrar_sem_terminal "$j"
conferir "pre-push trabalho: segundo push depois da parada unica passa" 0 $?
unset PRE_PUSH_COMANDO_VERIFICAR

git commit -q --allow-empty -m "fix: f"
empurrar "$(git rev-parse HEAD)" main
conferir "pre-push main sem tag continua recusando" 1 $?

else
  echo "pulado: casos do pre-push (nao ha pre-push ao lado do harness)"
fi

echo "$passou passaram, $falhou falharam, $pulou pulados"
[ "$pulou" -eq 0 ] || echo "  (os casos com o commitlint de verdade: nao ha commitlint instalado aqui)"
[ "$falhou" -eq 0 ]
