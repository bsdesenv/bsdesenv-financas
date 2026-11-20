#!/bin/sh
# Conferência automática do vídeo final: ./conferir.sh roteiros/01-x.mjs saida/01-x.mp4
#  1) arquivo íntegro (nenhum erro de decodificação)
#  2) resolução (a do layout.json: celular 1080 × 1920, web 1920 × 1080) e duração
#  3) cada capa de passo aparece branca e inteira (brilho médio no meio da fala ≈ 248–250)
#  4) volume médio/pico
#  0) antes de tudo: linha-do-tempo-final.json, folha-NN.png, falas.txt e folha-final.png existem e não são mais velhos que o MP4
#     (e o JSON descreve este MP4). Folha velha confere a corrida anterior: reprova com saída 1, sem olhar o resto.
# Os instantes vêm de linha-do-tempo-final.json (montar.mjs), nunca de conta própria.
# Erros de ação da gravação: linhas "!" que o gravar.mjs imprime em gravacao.txt; qualquer uma reprova (o produzir.sh mostra o fim do log).
cd "$(dirname "$0")"; ROTEIRO="$1"; V="$2"
eval "$(node pastas.mjs "$ROTEIRO")"
LT="$VIDEO/linha-do-tempo-final.json"
reprovar() { echo "REPROVADO: $1" >&2; exit 1; }
[ -f "$V" ] || reprovar "o MP4 $V não existe"
[ -f "$VIDEO/gravacao.txt" ] && grep -q '^! ' "$VIDEO/gravacao.txt" && reprovar "ação marcada com ! em gravacao.txt"
[ -f "$LT" ] || reprovar "falta $LT: o MP4 foi montado sem a linha do tempo final (monte de novo pelo produzir.sh)"
[ "$LT" -ot "$V" ] && reprovar "linha-do-tempo-final.json é mais velha que o MP4: monte de novo pelo produzir.sh"
[ "$(realpath "$V")" = "$(node -p "require('$LT').mp4")" ] || reprovar "linha-do-tempo-final.json descreve outro MP4 ($(node -p "require('$LT').mp4")), não $V"
FOLHAS=$(node -p "Math.ceil(require('$LT').falas.length/6)")
k=1; PNGS=""
while [ "$k" -le "$FOLHAS" ]; do PNGS="$PNGS $VIDEO/folha-$(printf %02d $k).png"; k=$((k + 1)); done
for f in $PNGS "$VIDEO/folha-final.png" "$VIDEO/falas.txt"; do
  [ -f "$f" ] || reprovar "falta $f: rode ./folha.sh $ROTEIRO $V"
  [ "$f" -ot "$V" ] && reprovar "$f é mais velho que o MP4: rode ./folha.sh $ROTEIRO $V antes de conferir os quadros"
done
echo "== folha: $FOLHAS imagens + folha-final.png + falas.txt, todos mais novos que o MP4"
LARG=$(node -e "console.log(require('$VIDEO/layout.json').largura)")
ALT=$(node -e "console.log(require('$VIDEO/layout.json').altura)")
echo "== integridade: $(ffmpeg -nostdin -v error -i "$V" -f null - 2>&1 | wc -l) linhas de erro (esperado 0)"
ffprobe -v error -select_streams v -show_entries stream=width,height,codec_name -of csv=p=0 "$V" | sed "s/^/== vídeo (esperado h264,$LARG,$ALT): /"
echo "== duração: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V") s"
ffmpeg -nostdin -i "$V" -af volumedetect -vn -f null - 2>&1 | grep -E "mean_volume|max_volume" | sed 's/.*\] /== /'
echo "== capas de passo (brilho médio aos 30% e 80% da fala; esperado ≈ 248–250):"
node -e "
require('$LT').falas.forEach(f=>{if(/^Passo /.test(f.texto)){const d=f.fim-f.ini;console.log(f.id,(f.ini+d*0.3).toFixed(2),(f.ini+d*0.8).toFixed(2))}})" | while read id a b; do
  r=""; for t in $a $b; do
    m=$(ffmpeg -nostdin -v quiet -ss "$t" -i "$V" -frames:v 1 -vf "scale=48:48,format=gray" -f rawvideo - | od -An -tu1 -v | awk '{for(i=1;i<=NF;i++){s+=$i;n++}} END{printf "%.0f", s/n}')
    r="$r $m"; done
  echo "   $id:$r"
done
