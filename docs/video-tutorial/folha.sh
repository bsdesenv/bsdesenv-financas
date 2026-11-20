#!/bin/sh
# Folha de conferência LEGÍVEL, a partir de video/<nome>/linha-do-tempo-final.json (que o montar.mjs grava junto com o MP4).
# Uso: ./folha.sh roteiros/01-x.mjs saida/01-x.mp4
# Gera em video/<nome>/:
#   folha-NN.png     6 quadros por imagem (3 × 2), um por fala, a ~85% do intervalo da fala no MP4, com o id e o instante no alto
#                    de cada quadro. Cada quadro tem 1/3 do tamanho do vídeo (web 640 × 360, celular 360 × 640): a legenda, o toast
#                    e o rótulo do botão se leem sem recorte.
#   falas.txt        id TAB texto de cada fala, na ordem dos quadros: o que a legenda do quadro tem de dizer.
#   folha-final.png  mosaico pequeno de todos os quadros (8 colunas): só visão geral, não serve para conferir texto.
# Só ffmpeg (drawtext com DejaVu Sans Bold + tile): nenhuma biblioteca a mais. O instante vem do JSON, nunca de conta própria.
# Nada é apagado: folha-NN.png que sobrou de uma corrida com mais falas vai para video/<nome>/antigas/.
cd "$(dirname "$0")"; ROTEIRO="$1"; V="$2"
[ -f "$ROTEIRO" ] && [ -f "$V" ] || { echo "uso: $0 roteiros/<nome>.mjs saida/<nome>.mp4" >&2; exit 1; }
eval "$(node pastas.mjs "$ROTEIRO")"
LT="$VIDEO/linha-do-tempo-final.json"
[ -f "$LT" ] || { echo "falta $LT: a montagem (montar.mjs, pelo produzir.sh) grava esse arquivo" >&2; exit 1; }
FONTE=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
[ -f "$FONTE" ] && FF="fontfile=$FONTE:" || FF=""
QUADROS="$VIDEO/quadros"; mkdir -p "$QUADROS"

# 1ª linha: largura e altura do quadro; depois "id TAB instante" por fala. Grava o falas.txt.
MARCAS=$(node -e "
const fs=require('fs');const [lt,lay,txt]=process.argv.slice(1);
const j=JSON.parse(fs.readFileSync(lt));const L=JSON.parse(fs.readFileSync(lay));
const out=[Math.round(L.largura/3)+' '+Math.round(L.altura/3)];
j.falas.forEach(f=>{out.push(f.id+'\t'+(f.ini+0.85*Math.min(f.fim-f.ini,f.voz+(j.respiro??0.3))).toFixed(2))});
fs.writeFileSync(txt,j.falas.map(f=>f.id+'\t'+f.texto.replace(/\s+/g,' ')).join('\n')+'\n');
console.log(out.join('\n'))" "$LT" "$VIDEO/layout.json" "$VIDEO/falas.txt") || exit 1
QL=$(echo "$MARCAS" | head -1 | cut -d' ' -f1); QA=$(echo "$MARCAS" | head -1 | cut -d' ' -f2)
ROT=28
N=$(echo "$MARCAS" | tail -n +2 | wc -l)
FOLHAS=$(( (N + 5) / 6 ))

# folhas de uma corrida anterior com mais falas saem do caminho (para antigas/), sem apagar
for f in "$VIDEO"/folha-[0-9][0-9].png; do
  [ -e "$f" ] || continue
  n=${f##*folha-}; n=$(expr "${n%.png}" + 0)
  if [ "$n" -gt "$FOLHAS" ]; then mkdir -p "$VIDEO/antigas"; mv "$f" "$VIDEO/antigas/$(date +%y%m%d%H%M%S)-$(basename "$f")"; fi
done

# um quadro por fala: reduzido, com a tira do rótulo no alto
i=0; LISTA="$QUADROS/lista.txt"; : > "$LISTA"
echo "$MARCAS" | tail -n +2 | while IFS="$(printf '\t')" read -r id m; do
  i=$((i + 1)); q="$QUADROS/q$(printf %03d $i).png"
  ffmpeg -nostdin -v error -y -ss "$m" -i "$V" -frames:v 1 \
    -vf "scale=$QL:$QA,pad=$QL:$((QA + ROT)):0:$ROT:white,drawtext=${FF}text='$id   ${m}s   ($i/$N)':x=6:y=4:fontsize=20:fontcolor=black" "$q" || exit 1
done || exit 1

# 6 por imagem, 3 × 2. A lista explícita evita pegar quadro velho de corrida anterior com mais falas.
k=1
while [ "$k" -le "$FOLHAS" ]; do
  a=$(( (k - 1) * 6 + 1 )); b=$(( k * 6 )); [ "$b" -gt "$N" ] && b=$N
  : > "$LISTA"; j=$a
  while [ "$j" -le "$b" ]; do printf "file '%s'\nduration 1\n" "$QUADROS/q$(printf %03d $j).png" >> "$LISTA"; j=$((j + 1)); done
  printf "file '%s'\n" "$QUADROS/q$(printf %03d $b).png" >> "$LISTA"
  ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$LISTA" -vf "tile=3x2:color=white" -frames:v 1 "$VIDEO/folha-$(printf %02d $k).png" || exit 1
  k=$((k + 1))
done

# visão geral pequena
: > "$LISTA"; j=1
while [ "$j" -le "$N" ]; do printf "file '%s'\nduration 1\n" "$QUADROS/q$(printf %03d $j).png" >> "$LISTA"; j=$((j + 1)); done
printf "file '%s'\n" "$QUADROS/q$(printf %03d $N).png" >> "$LISTA"
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$LISTA" -vf "scale=270:-1,tile=8x$(( (N + 7) / 8 )):color=white" -frames:v 1 "$VIDEO/folha-final.png" || exit 1

echo "folha: $N quadros em $FOLHAS imagens $VIDEO/folha-01.png ... (o texto de cada id está em $VIDEO/falas.txt; folha-final.png é só a visão geral)"
