# Protocolo das vagas de gravação. Não se executa: o ensaiar.sh, o produzir.sh e o explorar.sh fazem `. ./vaga.sh`
# depois de `cd` para a pasta da receita.
#
# Uma gravação mexe numa coisa compartilhada, o cenário (o backend do projeto apontado para bases de vídeo). Por isso toda
# gravação ocupa uma VAGA, e o número de vagas é o `cenario.sh vagas`: 1 quando o cenário liga uma base para o app inteiro,
# mais de 1 quando ele escolhe a base pelo cabeçalho X-Video-Base de cada requisição.
#
#   vaga_iniciar <nome>   calcula o id da corrida, lê as vagas do cenário e exporta VIDEO_BASE
#   vaga_entrar           espera uma vaga, `preparar` a base da corrida e `ligar` o cenário; instala os traps
#   filho <comando...>    roda um comando como filho, sem as travas, e devolve o código dele
#   vaga_sair             solta a vaga e, se nenhuma outra estiver ocupada, `desligar`; roda sozinha no trap EXIT
#
# O desenho, em três linhas:
#   1. Cada vaga é um arquivo em vagas/ com `flock`; quem pega uma segura o lock até soltar ou morrer (o kernel solta).
#   2. Uma "porta" (vagas/porta.lock) é uma trava curta em volta de `ligar` (entrada) e de "ver se há vaga ocupada e
#      `desligar`" (saída). Quem entra pega a vaga ANTES da porta; quem sai solta a vaga ANTES de pegar a porta.
#   3. Assim o `desligar` nunca corre contra um `ligar`: quem está entrando já segura a vaga, e o que sai a vê ocupada.
#
# Fora da vaga ficam gerar-falas, legendas, montagem e conferência: não tocam o cenário.
# Os filhos fecham os fds 8 (porta) e 9 (vaga) para um processo órfão, como o navegador, nunca segurar a trava.

VAGAS_DIR="${VAGAS_DIR:-vagas}"
VAGA_ENTROU=""
FILHO=""
VAGA=""

vaga_log() { echo "[$(date +%H:%M:%S)] vaga ($$): $*" >&2; }

# O Bash do agente morre em 10 min: a espera por vaga acaba antes, com mensagem para tentar de novo.
VAGA_ESPERA="${VAGA_ESPERA:-480}"
[ "$VAGA_ESPERA" -le 540 ] 2>/dev/null || VAGA_ESPERA=540
PORTA_ESPERA="${PORTA_ESPERA:-180}"

# Roda como filho em segundo plano e espera por ele com `wait`: assim um kill ou Ctrl-C dispara o trap na hora, em vez de
# esperar o filho acabar (o sh adia o trap enquanto há comando em primeiro plano). Devolve o código do filho.
filho() {
    "$@" 8>&- 9>&- &
    FILHO=$!
    _rc=0
    wait "$FILHO" || _rc=$?
    FILHO=""
    return "$_rc"
}

vaga_iniciar() {
    command -v flock >/dev/null 2>&1 || { echo "falta o flock (pacote util-linux)" >&2; exit 1; }
    [ -f ./cenario.sh ] || { echo "falta o cenario.sh nesta pasta: é o cenário do projeto (veja o README.md)" >&2; exit 1; }
    # O id da corrida: nome do vídeo + carimbo + pid, no formato ^[a-z0-9-]{1,80}$ que o contrato do cenário exige.
    # O pid separa duas corridas do mesmo vídeo no mesmo segundo; o nome é cortado em 56 para o id caber em 80.
    _nome=$(printf '%s' "$1" | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9' '-' | cut -c1-56)
    ID="${_nome:-corrida}-$(date +%y%m%d%H%M%S)-$$"
    NVAGAS=$(sh ./cenario.sh vagas 8>&- 9>&-) || { echo "o cenario.sh vagas falhou" >&2; exit 1; }
    case "$NVAGAS" in '' | *[!0-9]* | 0) echo "o cenario.sh vagas devolveu '$NVAGAS': esperado um inteiro >= 1" >&2; exit 1 ;; esac
    mkdir -p "$VAGAS_DIR"
    export VIDEO_BASE="$ID"
}

# Procura uma vaga livre, de 2 em 2 s, até VAGA_ESPERA segundos. O `flock -n` que consegue É a posse da vaga.
vaga_pegar() {
    _t0=$(date +%s)
    _avisado=""
    _ultimo=$_t0
    while :; do
        _i=1
        while [ "$_i" -le "$NVAGAS" ]; do
            exec 9>>"$VAGAS_DIR/vaga-$_i.lock"
            if flock -n 9; then
                VAGA=$_i
                return 0
            fi
            _i=$((_i + 1))
        done
        exec 9>&-
        _agora=$(date +%s)
        if [ $((_agora - _t0)) -ge "$VAGA_ESPERA" ]; then
            echo "Todas as $NVAGAS vagas de gravação ficaram ocupadas por $VAGA_ESPERA s. Nada foi gravado: tente de novo em alguns minutos." >&2
            echo "(as gravações em curso não foram afetadas; o limite de espera é VAGA_ESPERA, em segundos, no máximo 540)" >&2
            exit 75
        fi
        if [ -z "$_avisado" ]; then
            vaga_log "as $NVAGAS vagas estão ocupadas: esperando a vez (até $VAGA_ESPERA s)"
            _avisado=1
        elif [ $((_agora - _ultimo)) -ge 60 ]; then
            vaga_log "ainda esperando vaga ($((_agora - _t0)) s)"
            _ultimo=$_agora
        fi
        sleep 2
    done
}

# A porta: trava curta, que cabe esperar. Sem ela em PORTA_ESPERA s, algo travou o `ligar` ou o `desligar` de outra corrida.
vaga_porta() {
    exec 8>>"$VAGAS_DIR/porta.lock"
    flock -w "$PORTA_ESPERA" 8
}
vaga_porta_soltar() { exec 8>&-; }

# Sucesso se nenhuma vaga está ocupada. Olha todos os arquivos que existem, não só os NVAGAS desta corrida: o cenário pode
# ter mudado o número de vagas entre uma corrida e outra.
vaga_nenhuma_ocupada() {
    for _f in "$VAGAS_DIR"/vaga-*.lock; do
        [ -e "$_f" ] || continue
        flock -n "$_f" true 8>&- 9>&- || return 1
    done
    return 0
}

vaga_entrar() {
    trap vaga_sair EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM HUP
    vaga_log "pedindo vaga para $ID ($NVAGAS no total)"
    vaga_pegar
    VAGA_ENTROU=1
    vaga_log "vaga $VAGA é minha: preparando a base $ID"
    filho sh ./cenario.sh preparar "$ID" >&2 || { echo "o cenario.sh preparar falhou" >&2; exit 1; }
    vaga_porta || { echo "a porta das vagas ficou ocupada por ${PORTA_ESPERA}s; desisto sem ligar o cenário" >&2; exit 1; }
    filho sh ./cenario.sh ligar "$ID" >&2 || { vaga_porta_soltar; echo "o cenario.sh ligar falhou" >&2; exit 1; }
    vaga_porta_soltar
    vaga_log "cenário ligado na base $ID (vaga $VAGA)"
}

vaga_sair() {
    [ -n "$VAGA_ENTROU" ] || return 0
    VAGA_ENTROU=""
    if [ -n "$FILHO" ]; then
        pkill -TERM -P "$FILHO" 2>/dev/null || true
        kill "$FILHO" 2>/dev/null || true
    fi
    exec 9>&- # solta a vaga ANTES de pegar a porta
    if vaga_porta; then
        if vaga_nenhuma_ocupada; then
            vaga_log "nenhuma vaga ocupada: desligando o cenário"
            sh ./cenario.sh desligar 8>&- 9>&- >&2 || vaga_log "AVISO: o cenario.sh desligar falhou; rode-o à mão quando nenhuma gravação estiver em curso"
            [ "$(sh ./cenario.sh estado 8>&- 9>&- 2>/dev/null)" = desligado ] || vaga_log "AVISO: o cenario.sh estado não diz 'desligado'"
        else
            vaga_log "há outra gravação em curso: o cenário continua ligado"
        fi
        vaga_porta_soltar
    else
        vaga_log "AVISO: sem a porta das vagas em ${PORTA_ESPERA}s; o cenário pode ter ficado ligado. Quando nenhuma gravação estiver em curso: sh cenario.sh desligar"
    fi
}
