# Visual: voz, vídeo, capas, legenda e cursor

Tudo é desenhado dentro da página pelo `gravar.mjs` (camadas HTML e CSS injetadas): sai na
gravação, sem edição depois. O CSS completo está nele; aqui só as regras.

## Fixo em todo projeto

| Item | Valor |
|---|---|
| Voz | `pt-BR-AntonioNeural`, velocidade padrão, nunca acelerada |
| Vídeo | H.264, crf 20, 30 fps |
| Áudio | AAC 160k, volume médio ≈ -21 dB, pico até -2 dB |
| Imagem | acelerada no máximo ~2,5× para caber na fala |
| Navegador | o Chrome do sistema (`channel: 'chrome'`), sem baixar outro; service worker bloqueado |

O `edge-tts` precisa de internet ao gerar as falas, e só o texto do roteiro vai ao serviço. A voz
só muda por pedido do usuário.

## Perfil de tela

`config.mjs` declara `export const PERFIL = 'celular'` ou `'web'`. Os dois compartilham tudo, menos
a geometria e o lugar da legenda.

| | `celular` | `web` |
|---|---|---|
| Orientação e saída | retrato, 1080 × 1920 | paisagem, 1920 × 1080 |
| App | num iframe de LARGURA × ALTURA (px de CSS) ampliado ESCALA vezes | janela cheia, escala ~1,2 |
| Legenda | faixa própria sob o app, fora da área dele | caixa sobreposta, base da tela |

No celular, o iframe é o que mantém a barra de baixo fixa e as folhas inferiores (`position: fixed`)
dentro do app. O `legendas.py` lê o `layout.json` que o gravador escreve para saber onde está a
faixa e a capa (detectada por troca de quadro); mudar a geometria sem regravar o `layout.json`
quebra a sincronia.

**Como o projeto escolhe:** a skill de QA de tela do projeto traz o viewport. Largura até 480 px é
`celular`; acima, `web`. Sem essa skill, perguntar ao usuário, e o app só de desktop é `web`.
O perfil `web` ainda não foi provado em projeto real: a primeira gravação nele confere a
sobreposição da legenda contra os elementos do app antes de produzir em série.

## Cor de destaque

A identidade visual está em `spec/produto.md` do projeto: a cor de marca vira `COR_DESTAQUE` do
`config.mjs`. Nenhuma cor, kicker, URL ou rótulo vem da receita. A fonte também sai da identidade
visual; sem ela, a do app.

## Capas

- **Fundo branco puro (`#ffffff`).** Nada de degradê nem fundo colorido de tela inteira: numa troca
  rápida parece um corte ("tela verde"). A cor de destaque aparece só nos detalhes: faixa fina na
  borda, kicker, número grande do passo, faixa dos cartões do índice, o passo atual no índice lateral.
- Quatro capas, sem legenda por cima, cada uma ≥ 3 s na tela:
  1. **Abertura:** kicker (`KICKER` do config, em maiúsculas), título em até 2 linhas, subtítulo de 1 frase.
  2. **Índice:** "Dois passos", "Três passos"...; cartões em grade, cada um com "PASSO 0N", título e
     tópicos separados por ponto médio.
  3. **Capa do passo:** número grande, "PASSO N DE M", título, chips dos tópicos, índice lateral com o atual em destaque.
  4. **Encerramento:** kicker, título do vídeo e a frase de consulta.
- A capa entra com fade (~0,8 s), elementos sobem com atraso escalonado. Sai por `h.semCapa()` antes
  do primeiro tópico, e o texto dela é esvaziado: texto de capa confunde seletor por texto.
- Ver as quatro sem gravar: `SO_CAPAS=1 node gravar.mjs` com o roteiro, que salva um PNG por capa.

## Legenda

- Caixa escura, texto branco, etiqueta pequena em maiúsculas acima: `PASSO · TÓPICO`, na cor
  de destaque clareada.
- O texto vai em atributos (`data-t`, `data-cap`) e é exibido por CSS `::before` e `::after`: assim
  não conta como texto da página e não atrapalha `getByText`, já que a fala muitas vezes repete o
  nome do botão.
- A posição da legenda é usada pelo `legendas.py` para medir a sincronia.
- No perfil `web` a legenda cobre o pé da página, onde mora a navegação fixa do app. `FIXOS_NO_PE` do
  `config.mjs` lista esses seletores (ex.: `['.q-footer']`): a gravação os sobe acima da faixa e dá folga
  ao pé, em toda carga. O roteiro não precisa de `addStyleTag` para isso. Vazio, nada sobe, e um alvo
  atrás da legenda reprova no ensaio.

## Cursor e cliques

- Cursor próprio (seta preta com contorno branco), atualizado no `mousemove`; no celular ele vive
  dentro do iframe do app.
- Anel que cresce e some (~0,55 s) a cada `mousedown`, numa cor de contraste fixa do modelo, que não é a de destaque.
- Movimento em passos (6 a 26, conforme a distância), pausa de 150 ms ao chegar e 300 ms depois do
  clique; digitação a 28 ms por caractere; 0,3 s de respiro entre falas.
- `h.mover` só move o cursor depois de conferir o alvo: centro na viewport, acima da faixa da legenda e
  sem nada por cima (`elementFromPoint` no centro é o alvo ou está dentro dele). Se falhar, centraliza o
  alvo na área útil pelo scroll do ancestral e confere de novo; ainda falhando, a ação sai com `!`. O
  `FIXOS_NO_PE` conta como cobertura. `{ parcial: true }` libera alvo grande de propósito.

## PDF e documento na tela

Mostrar a 1ª página convertida em imagem por `pdftoppm`, numa camada escura sobre a página; para
destacar um trecho, recortar com `pdftoppm -x -y -W -H`. Não confiar no visualizador de PDF do
navegador (`armadilhas.md`).

## Qualidade da captura

O Playwright grava com um ffmpeg próprio, de poucos Mbit/s e 1 thread, que borra a imagem em alta
resolução e perde quadros. O `ferramentas.mjs` troca o bitrate por 12M (`GV_BITRATE`) e as threads
por 4, e é importado antes do `playwright`. Depende dos argumentos que o Playwright passa ao ffmpeg:
a versão do Playwright fica fixa no `package.json`, e quem a atualiza reprova a captura num ensaio.
