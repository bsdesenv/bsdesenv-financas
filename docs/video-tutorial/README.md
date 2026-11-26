# Vídeos tutoriais do Finanças

A tela real do app, com voz neural, capas e legenda. A receita (scripts desta pasta) é a mesma em todo projeto; o que é deste
projeto é o `config.mjs`, o `cenario.sh`, o `servidor.mjs`, o `base-simulada.mjs` e os `roteiros/`. A skill que conduz o fluxo
é `.claude/skills/video-tutorial/SKILL.md`.

## A série

Perfil `web`, no layout de computador (gaveta lateral, lançamento rápido e a planilha do ano), em 1920 × 1080:

A base simulada tem planos em todos os meses, recorrências pagas e em aberto, dois cartões (um ativo e um arquivado), um notebook parcelado em 6 vezes, agosto e setembro fechados e outubro com pendências para o fechamento.

| Vídeo | Assunto |
|---|---|
| `00-instalacao` | Instalação: a página Antes de começar, o instalador em quatro passos (autorizar, API, nome, instalar), o QR code e o primeiro acesso |
| `01-primeiros-passos` | Início: o disponível e a composição, o que falta pagar, o plano do mês, onde foi o dinheiro e o seletor de mês |
| `02-lancar-e-corrigir` | Lançamento rápido, formulário completo, parcelar no cartão, a fatura, editar, apagar e desfazer |
| `03-todo-mes-e-contas` | Recorrências (o bloco Todo mês), vencimentos, Confirmar, Liberar, Guardar e Recebi |
| `04-planejar-o-mes` | Tela Planejar: planos por categoria, sugestões, copiar/médias, a meta de economia e liberar a sobra |
| `05-extrato-e-importar` | Extrato com busca, escopo e filtros; abrir um lançamento; importar CSV/OFX do banco |
| `06-planilha-e-fechamento` | Planilha do ano (mapa de calor, célula, CSV), impressão do mês e o fechamento com a sobra levada |
| `07-ajustes-cartoes-backup` | Ajustes: nome e tema, categorias, cartões de crédito, backup JSON e CSVs, atualizações e diagnósticos |

O conteúdo vem de `spec/produto.md`, `spec/glossario.md`, `docs/USAR.md`, do README do projeto e de `docs/INSTALAR.md`, e os
rótulos e seletores vêm da exploração (`explorar-financas.mjs`). A série foi refeita em 26/11/2026 na playlist
**Finanças · Tutoriais** do canal @bsdesenvmidia (https://www.youtube.com/playlist?list=PLOrq0JTHxh_A), com os oito vídeos e
a playlist não listados (como a série do SIG); o manifesto e os links estão em `envio.md`.

## O cenário

O app é Google Apps Script, mas o servidor de verdade (`src/Codigo.gs`) roda no Node sobre a planilha falsa de
`testes/gas-mock.mjs`. O `servidor.mjs` serve o app de verdade (`src/Index.html`, `Estilos.html`, `App.html`) e troca a ponte
`google.script.run` por HTTP; cada requisição escolhe a base pelo cabeçalho `X-Video-Base`, por `base/atual` ou, sem nada
ligado, por `base/dev.json`.

1. `preparar <id>` gera `base/<id>.json` com `base-simulada.mjs` (dados inventados, relativos ao dia de hoje). A base do dev
   (`base/dev.json`, cópia de `exemplos/dados-exemplo.json`) nunca é tocada.
2. `ligar <id>` escreve o id em `base/atual`; `desligar` remove o arquivo.
3. Uma vaga: a troca é global e uma gravação anda de cada vez. O `ensaiar.sh` segura a vaga e desliga o cenário no `trap`.

Nada aqui apaga base de corrida: elas se acumulam em `base/`, fora do git. A limpeza é manual.

## Instalar e subir o servidor

```sh
npm install --prefix docs/video-tutorial   # Playwright em versão fixa; o navegador é o Chrome do sistema
npm run video:servidor                     # http://localhost:8787, em primeiro plano (ou nohup, para gravar em segundo)
```

O `ensaiar.sh` e o `produzir.sh` conferem `http://localhost:8787/` antes de começar: o servidor tem de estar no ar. Para
parar: `kill "$(cat docs/video-tutorial/base/servidor.pid)"` (se subiu com o pid gravado) ou Ctrl-C.

O vídeo 00 (instalação) é especial: a tela é a UI real da página Antes de começar, do instalador e do primeiro acesso,
e não passa pelo `cenario.sh`. As capturas ficam em `video/00-instalacao/capturas` (fora do git) e saem de
`instalacao/capturar-instalador.mjs`, que renderiza o instalador com o `google.script.run` imitado; a montagem é
`instalacao/montar.mjs` (slides, voz e MP4). Para refazer:

O servidor de vídeo precisa estar no ar (ele serve a base vazia do primeiro acesso).

```sh
node instalacao/capturar-instalador.mjs
ROTEIRO=roteiros/00-instalacao.mjs node gerar-falas.mjs
ROTEIRO=roteiros/00-instalacao.mjs node instalacao/montar.mjs
sh folha.sh roteiros/00-instalacao.mjs saida/00-instalacao.mp4
sh conferir.sh roteiros/00-instalacao.mjs saida/00-instalacao.mp4
```

Ferramentas de sistema: `ffmpeg`, `ffprobe`, `pdftoppm`, Chrome e o Python de `~/.venv-video` com `edge-tts` e `numpy`. O
`folha.sh` usa `drawtext`: o build estático que estava em `~/.local/bin` não tinha o filtro, e o ambiente passou a usar o
build completo em `~/.local/ffmpeg-full` (symlinks em `~/.local/bin/ffmpeg` e `ffprobe`).

## Usar

```sh
./ensaiar.sh roteiros/01-primeiros-passos.mjs ensaio     # fotos de cada ação; sai 1 se alguma terminou com "!"
./ensaiar.sh roteiros/01-primeiros-passos.mjs produzir   # vozes, gravação, sincronia, MP4, folha e conferência
./conferir.sh roteiros/01-primeiros-passos.mjs saida/01-primeiros-passos.mp4
./folha.sh roteiros/01-primeiros-passos.mjs saida/01-primeiros-passos.mp4
```

Ensaio e produção seguram o shell por mais tempo que a duração do vídeo: disparar em segundo plano, com log próprio. Duas
corridas do mesmo roteiro nunca juntas. A voz fica fora da vaga; só a gravação precisa do servidor na base certa.

`node explorar-financas.mjs` fotografa as telas e lista os rótulos na base ligada (`explorar/`); é a ferramenta do projeto
para escrever e conferir os seletores.

## O que fica fora do git

`vagas/`, `base/`, `falas/`, `video/`, `saida/`, `node_modules/`, `ferramentas/`, `explorar/` e `__pycache__/` (ver
`.gitignore`). Nada aqui apaga arquivo: a gravação nova sobrescreve a anterior.
