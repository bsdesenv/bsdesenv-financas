# Mede, na gravação, quando a legenda de cada fala (e cada capa de passo) realmente aparece na IMAGEM.
# O gravador do navegador atrasa a imagem em relação ao relógio (0,2 s a vários segundos em páginas pesadas), então o
# `t` de linha-do-tempo.json não serve para casar a voz com a imagem. Grava linha-do-tempo-real.json com `tv`.
#
# Uso: ~/.venv-video/bin/python legendas.py video/<nome>        (precisa de numpy e ffmpeg)
#
# Legenda: olha só a região da legenda, que o gravar.mjs grava em layout.json (faixa_y e faixa_h, em px do vídeo): no perfil
#   celular é a faixa abaixo da área do app; no web, a caixa sobreposta ao pé do app. Nos dois é um fundo escuro liso: o texto
#   novo, ou sumir/aparecer, muda muitos pixels em mais de 70 níveis. Se mudar o perfil em config.mjs, o layout.json acompanha.
# Capa de passo: não tem legenda, e a capa anterior também é branca (abertura → índice → passo), então "ficar branco" não
#   marca nada. O que marca é o quadro inteiro mudar (capa trocada, ou fade entre a capa e o app): mais de 2% dos pixels,
#   num quadro reduzido a 108 × 192 (retrato) ou 192 × 108 (paisagem), mudam mais de 40 níveis em 6 quadros.
import json, subprocess, sys, numpy as np

DIR = sys.argv[1]
lt = json.load(open(f'{DIR}/linha-do-tempo.json'))
lay = json.load(open(f'{DIR}/layout.json'))
VIDEO = f'{DIR}/tela.webm'
W, H, FPS, PASSO = 216, 72, 25, 6   # a região da legenda, reduzida a 216 × 72
GW, GH = (108, 192) if lay['altura'] >= lay['largura'] else (192, 108)   # o quadro inteiro, em retrato ou paisagem
RECORTE = f"crop={lay['largura']}:{lay['faixa_h'] - 24}:0:{lay['faixa_y'] + 16}"   # sem a borda vermelha de cima

def quadros(filtro, w, h):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', VIDEO, '-vf', filtro, '-r', str(FPS), '-f', 'rawvideo', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w)

q = quadros(f'{RECORTE},scale={W}:{H},format=gray', W, H).astype(np.int16)
s = np.zeros(len(q))
s[PASSO:] = (np.abs(q[PASSO:] - q[:-PASSO]) > 70).mean(axis=(1, 2))
LIM = 0.02
subidas = [k / FPS for k in range(1, len(s)) if s[k] > LIM and s[k - 1] <= LIM]

# o quadro inteiro (retrato 9:16), para achar a troca de capa
g = quadros(f'scale={GW}:{GH},format=gray', GW, GH).astype(np.int16)
sc = np.zeros(len(g))
sc[PASSO:] = (np.abs(g[PASSO:] - g[:-PASSO]) > 40).mean(axis=(1, 2))
LIM_CAPA = 0.02
subidas_capa = [k / FPS for k in range(1, len(sc)) if sc[k] > LIM_CAPA and sc[k - 1] <= LIM_CAPA]

ini, falas = lt['inicio'], lt['falas']
anterior = -1.0
for i, f in enumerate(falas):
    T = ini + f['t']
    ate = ini + (falas[i + 1]['t'] if i + 1 < len(falas) else lt['fim'] - ini) + 12
    # o vídeo pode começar um pouco antes do relógio (atraso negativo): olha desde 1,5 s antes
    achou = [x for x in subidas if max(T - 1.5, anterior + 0.8) <= x <= ate]
    if f['texto'].startswith('Passo '):
        achou = [x for x in subidas_capa if max(T - 1.5, anterior + 0.8) <= x <= ate]
    tv = (achou[0] - ini) if achou else None
    atraso_ant = falas[i - 1]['tv'] - falas[i - 1]['t'] if i else 0
    # sem troca detectada, ou salto de atraso absurdo (pegou a legenda de outra fala): mantém o atraso anterior
    if tv is None or (tv - f['t']) - atraso_ant > 4:
        tv, achou = f['t'] + atraso_ant, []
    f['tv'] = round(tv, 3)
    anterior = ini + tv
    print(f"{f['id']} t={f['t']:7.2f} tela={tv:7.2f} atraso={tv - f['t']:+5.2f}{'' if achou else '  (estimado)'}  {f['texto'][:45]}")
json.dump(lt, open(f'{DIR}/linha-do-tempo-real.json', 'w'), ensure_ascii=False, indent=2)
