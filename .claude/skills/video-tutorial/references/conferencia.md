# Conferência: ensaio, produção e folha de quadros

Nada se entrega sem ensaio seco, conferência numérica e folha de quadros vista. Os comandos rodam
em `docs/video-tutorial/`; o roteiro vai pelo caminho (`roteiros/NN-nome.mjs`). Quem grava é o
`ensaiar.sh`, que prepara a base, liga o cenário, roda e desliga no `trap`; os scripts de baixo
não precisam de vaga.

## 1. Ensaio seco

`./ensaiar.sh roteiros/NN-nome.mjs ensaio` roda o roteiro sem vídeo, com falas de ~1,5 s, e
fotografa cada passo em `video/<nome>/fotos/<AAAAMMDD-HHMMSS>/`, pasta que o ensaio imprime (`pasta da corrida:`).

- Sai com 1 se alguma ação falhou. Linha começando com `!` é ação que falhou (seletor errado,
  elemento escondido, diálogo por cima); cada uma deixa `erro-<id>.jpg` na pasta da corrida. O ensaio
  termina listando cada `!` com o caminho do seu `erro-<id>.jpg`.
- Corrigir e repetir até zero `!`. Como a base é nova a cada corrida, o ensaio não suja o seguinte.
- Abrir as fotos da pasta da corrida e ver, fala a fala, se a tela mostra o que o texto diz. Ensaio sem `!` não prova isso.
  Pastas de corridas antigas ficam em `fotos/` e não valem.
- Antes do primeiro ensaio, ver as capas sem gravar (`SO_CAPAS=1`, em `visual.md`).
- O ensaio roda seco, sem as durações das falas, então não prova tempo. Erro de tempo, como um menu que fecha antes da voz
  terminar, só aparece na folha da produção (seção 4).

## 2. Produção

`./ensaiar.sh roteiros/NN-nome.mjs produzir` gera as vozes (só as que faltam), grava no ritmo das
falas, mede na imagem quando cada legenda aparece e monta `saida/<nome>.mp4`. Com `PERFIS` no `config.mjs`, o MP4 sai em
`saida/<perfil>/NN-<assunto>.mp4`.

- Mudou só o texto falado: apagar os MP3 afetados e rodar `gerar-falas.mjs` e `montar.mjs`, sem regravar a tela.
- Cada fala começa quando a legenda aparece na imagem (`legendas.py`), não no relógio da gravação,
  que chega atrasado. A voz nunca é acelerada: o trecho de imagem é que acelera, até caber na fala.
- Montagem interrompida ou concorrente deixa arquivo corrompido: remontar sozinho.

## 3. conferir.sh

`sh conferir.sh roteiros/NN-nome.mjs saida/NN-nome.mp4`.

Reprova (saída 1):

| Item | Critério |
|---|---|
| MP4, linha do tempo, folhas e `falas.txt` | existem e a folha não é mais velha que o MP4 |
| Ações com erro na gravação | nenhuma linha começando por `! ` em `gravacao.txt` |

Só imprime, e se confere à mão (o script não reprova por faixa):

| Item | Esperado |
|---|---|
| Integridade, `ffmpeg -v error -i <mp4> -f null -` | nenhuma linha |
| Resolução e formato | a do perfil (1080 × 1920 ou 1920 × 1080), H.264 e AAC |
| Duração | de 3 a 6 min |
| Atraso voz × imagem | de -1,5 a +1,5 s; nenhuma sequência longa de falas "(estimado)" |
| Brilho médio no meio de cada capa de passo | ≈ 248 a 250: capa branca inteira |
| Volume médio e pico | ≈ -21 dB e até -2 dB |

Brilho de 240 a 246 saiu em capas inteiras (artefato do codec); valor bem menor é capa cortada:
corrigir e remontar. Fala do índice com ~2,5 s de atraso apareceu em alguns vídeos sem ser defeito.

## 4. Folha de quadros

`sh folha.sh roteiros/NN-nome.mjs saida/NN-nome.mp4` gera em `video/<nome>/`:

- `folha-NN.png`: 6 quadros por imagem (3 × 2), um por fala, a ~85% de cada fala no MP4, com o id e o
  instante no alto. Cada quadro tem 1/3 do vídeo (web 640 × 360; celular 360 × 640): legenda, toast e
  rótulo se leem sem recorte.
- `falas.txt`: `id TAB texto` de cada fala, na ordem dos quadros. É o texto que a legenda tem de trazer.
- `folha-final.png`: mosaico de 270 px, só visão geral. Não serve para conferir texto.

`produzir.sh` já roda `folha.sh` e `conferir.sh`. O `conferir.sh` sai 1 com `REPROVADO: motivo` se o JSON, uma
`folha-NN.png`, a `folha-final.png` ou o `falas.txt` faltarem ou forem mais velhos que o MP4. Só a folha mais
nova que o MP4 vale. `fotos/` nunca entra na conferência.

Critério, por fala:

- **PASS**: a tela mostra o que a fala descreve naquele instante; o elemento citado está à vista (sem
  toast, barra ou diálogo por cima), salvo quando o toast ou o diálogo é o assunto ou o efeito da fala;
  a legenda está inteira; o texto da fala confere com `falas.txt`.
- **FAIL**: a tela está noutro lugar; o elemento falado está coberto ou fora da área visível; a ação não
  terminou no estado que a fala descreve (o que ela anuncia ainda não aconteceu, ou o que ela fecha ou
  confirma continua aberto); a capa não aparece inteira; falta palavra no texto, ou o rótulo é outro.
- **DÚVIDA**: o quadro não decide: o estado é de transição, ou a fala cabe em mais de um momento da ação.

Quem confere (onda 2) devolve `PASS`, `FAIL` ou `DÚVIDA` por id, com o motivo em até 12 palavras, e não reescreve
nada. FAIL e DÚVIDA são conferidos pela sessão principal num recorte do quadro; os reprovados confirmados
voltam ao roteirista (onda 3).

## 5. Entrega

- Dizer o que foi conferido e o que não foi ("conferi os quadros de cada fala; não assisti ao vídeo inteiro com som").
- O cenário termina desligado: `cenario.sh estado` imprime `desligado`, e o arquivo versionado que ele editou não tem diff.
- Série colada: os vídeos saem com o mesmo codec, resolução, fps e áudio, então a colagem é por `ffmpeg -f concat -c copy`,
  sem reencode, na ordem alfabética dos nomes (`NN`, depois `a` e `b`). Se um vídeo sair com outro
  codec, fps ou áudio, reencodar. Conferir com `ffprobe` (duração igual à soma) e `-f null -` sem saída.

## 6. Achado de tela

Gravar o sistema inteiro é também um teste de ponta a ponta. O que estiver errado no app (botão
fixo ou aviso cobrindo conteúdo, texto cortado, rótulo estranho, erro que chega à tela como "erro de
rede") não se corrige no vídeo nem no app, na mesma tarefa: vira linha em `spec/estado.md` do
projeto, com a tela e o que se viu, e entra na tarefa que tocar aquela tela. Isso é parte do pedido,
não dívida escondida: o usuário é perguntado antes de gravar a linha.
