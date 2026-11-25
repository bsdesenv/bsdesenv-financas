#!/usr/bin/env bash
# backup.sh - Empacota fora do repositorio o que o git deste projeto nao guarda.
#
# Rodar da raiz do projeto:
#   ./spec/_fontes/backup.sh
#
# Por que existe: a memoria do runtime mora em ~/.claude/projects/, fora do
# repositorio, e vai sempre no pacote. Onde a camada de IA tambem nao e versionada
# (restricao institucional, registrada em spec/estado.md), nao ha historico, diff
# nem recuperacao de nada dela: a unica protecao contra perder a maquina e uma
# copia fora dela, e a checagem 7B do spec-analyze cobra que o script tenha rodado.
# Onde a camada e versionada, CAMADA fica vazia e so a memoria vai no pacote.
#
# Onde grava: DESTINO abaixo, fora do repositorio de proposito. Um backup dentro
# da arvore que ele copia nao e backup, e uma copia que some junto.

set -eu

# ============================================
# CONFIGURACAO (ajustar por projeto)
# ============================================

# O que vai no pacote alem da memoria do runtime. Onde a camada de IA for
# versionada, deixar vazio: o git ja guarda o historico dela. docs/plans entra
# porque o pre-commit padrao mantem docs/ fora do versionamento, e plano sem
# backup nem historico se perde de vez.
CAMADA=""

# ============================================

RAIZ="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "backup: rodar de dentro do repositorio" >&2
    exit 1
}
cd "$RAIZ"

PROJETO="$(basename "$RAIZ")"
DESTINO="${SPEC_BACKUP_DIR:-$HOME/backups-ia}"
DATA="$(date +%d%m%y-%H%M)"
ARQUIVO="$DESTINO/$PROJETO-ia-$DATA.tar.gz"

# A pasta de memoria do runtime fica fora do repositorio, com o caminho derivado
# do caminho absoluto do projeto. E a camada que todo mundo esquece de salvar.
MEM="$HOME/.claude/projects/$(printf '%s' "$RAIZ" | sed 's/[^A-Za-z0-9]/-/g')/memory"

ALVOS=""
for item in $CAMADA; do
    [ -e "$item" ] && ALVOS="$ALVOS $item"
done

[ -n "$ALVOS" ] || [ -d "$MEM" ] || { echo "backup: nada para salvar" >&2; exit 1; }

mkdir -p "$DESTINO"

# --dereference resolve o symlink AGENTS.md para o conteudo do CLAUDE.md, senao o
# tar guarda um link apontando para um arquivo que pode nao existir na restauracao.
# node_modules do .opencode fica de fora: e dependencia reinstalavel, nao contexto.
# shellcheck disable=SC2086
tar czf "$ARQUIVO" \
    --dereference \
    --exclude='.claude/hooks/safety-net.log' \
    --exclude='*/node_modules' \
    $ALVOS \
    $([ -d "$MEM" ] && printf '%s' "-C $HOME/.claude/projects/$(printf '%s' "$RAIZ" | sed 's/[^A-Za-z0-9]/-/g') memory")

echo "backup: $ARQUIVO"
ls -lh "$ARQUIVO" | awk '{print "         " $5}'
echo ""
echo "Conferir o conteudo:"
echo "  tar -tzf $ARQUIVO | head -30"
# A data so se registra onde a 7B cobra, com a camada fora do git.
if [ -n "$ALVOS" ]; then
    echo ""
    echo "Registrar a data em spec/estado.md, secao de restricoes de processo."
fi
