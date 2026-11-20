---
name: video-tutorial
description: "Produz vídeo tutorial narrado do sistema, gravando a tela real com voz neural, capas e legenda. Usar quando o usuário pedir vídeo tutorial, tutorial narrado ou série de vídeos do sistema. Não usar para print, GIF, documentação escrita nem gravação de bug."
---

# Vídeo tutorial narrado

A tela do sistema é gravada de verdade por um navegador automatizado, com cursor, legenda e capas
desenhados na página, e narrada por voz neural. Todo projeto sai igual em voz, estrutura e tom. O
que muda de um projeto para outro é o **cenário** (banco, isolamento, dados, perfil de tela) e mora
no projeto: `config.mjs` e `cenario.sh`. Esta skill traz só a receita.

Instalada, ela fica em `.claude/skills/video-tutorial/` e os scripts em `docs/video-tutorial/`.

## Quando usar

- Usar: o usuário pede um vídeo, uma série ou o refazer de um vídeo cuja tela mudou.
- Não usar: sem o app rodando em ambiente de desenvolvimento, ou se o pedido é gravar contra a
  produção ou contra a base do dev. Isso se recusa.

## Ferramentas

Chrome e `pdftoppm` costumam estar no docker-dev; `ffmpeg` e `edge-tts` não. Conferir com
`command -v` e instalar só o que faltar, sem mexer no docker-dev: `~/.venv-video` com `edge-tts` e
`numpy`; `npm install` em `docs/video-tutorial/` (Playwright em versão fixa). Detalhe: `references/cenario.md`, seção "Ferramentas".

## Fluxo em ondas

Os scripts congelam na onda 0: são o contrato. Peça nova em `comum.mjs` ou `gravar.mjs` volta ao
orquestrador, que a inclui entre ondas (arquivo-hub não se edita em paralelo). Quem executa não commita.

| Onda | Quem | O quê |
|---|---|---|
| 0, serial | `pleno` e sessão principal | ferramentas, `cenario.sh`, `config.mjs` e `explorar.mjs`; o vídeo 1 inteiro; o usuário aprova voz, ritmo e visual |
| 1, até 4 | um `pleno` por vídeo | roteiro, ensaio, produção, `conferir.sh` e folha; escreve só o próprio `roteiros/NN-*.mjs` |
| 2, até 4 | um `levantamento` por vídeo | folha de quadros contra as falas: PASS, FAIL ou DÚVIDA por fala, pelo prompt da seção abaixo |
| 3, serial | sessão principal e `mecanico` | só os quadros reprovados, colagem, README, achados para a spec, commit |

A gravação corre em até as vagas que `cenario.sh vagas` declarar (1 se o cenário não isola por
requisição); legendas, montagem e conferência ficam fora da vaga. Cada vídeo tem a própria pasta,
então nenhum pisa no outro.

`ensaiar.sh` ou `produzir.sh` que sai com 75 não achou vaga em `VAGA_ESPERA` segundos (no máximo 540): tentar de novo; não é erro do roteiro.

Ensaio e produção seguram o shell por mais tempo que a duração do vídeo: disparar cada cadeia em segundo plano, com log
próprio, e esperar o fim; em primeiro plano, estoura o limite do shell do agente (10 min no Claude Code). Duas corridas do
mesmo roteiro nunca juntas: dividem `falas/<nome>` e `video/<nome>`.

## Conferência da onda 2

`produzir.sh` já roda `folha.sh` e `conferir.sh` no fim. A onda 2 só começa com o `conferir.sh` em saída 0.
Cada `levantamento` recebe este prompt, com `<nome>` trocado pelo nome do vídeo:

```
Confira as falas do vídeo <nome>, em docs/video-tutorial/video/<nome>/.
Entrada: folha-01.png, folha-02.png... (6 quadros por imagem, na ordem; cada quadro traz o id e o instante no alto)
e falas.txt (id TAB texto de cada fala). Não abra fotos/.
Critério, por fala:
PASS: a tela mostra o que a fala descreve naquele instante; o elemento citado está à vista, sem toast, barra ou diálogo
por cima (salvo quando o toast ou o diálogo é o assunto ou o efeito da fala); a legenda está inteira; o texto confere com falas.txt.
FAIL: a tela está noutro lugar; o elemento falado está coberto ou fora da área visível; a ação não terminou no estado que a
fala descreve (o que ela anuncia ainda não aconteceu, ou o que ela fecha ou confirma continua aberto); a capa não aparece
inteira; falta palavra no texto ou o rótulo é outro.
DÚVIDA: o quadro não decide (estado de transição, ou a fala cabe em mais de um momento da ação).
Saída: uma linha por fala, na ordem de falas.txt, no formato `id | PASS, FAIL ou DÚVIDA | motivo em até 12 palavras`.
Nada além dessas linhas. Não reescreva nada.
```

FAIL e DÚVIDA são conferidos pela sessão principal num recorte do quadro, antes da onda 3.

## O que ler, e quando

1. Antes de escrever o cenário e o `config.mjs`: `references/cenario.md` (contrato, exigências,
   ferramentas) e `references/visual.md`, seção "Perfil de tela".
2. Antes de explorar as telas e escrever um roteiro: `references/roteiro.md`, inteira na onda 0, e
   a seção "Formato do arquivo" nas ondas 1.
3. Ao escolher cor, capa e legenda: `references/visual.md`.
4. Antes de ensaiar e depois de produzir: `references/conferencia.md`.
5. Quando uma ação falha ou o vídeo sai estranho: `references/armadilhas.md`, antes de investigar.
6. Antes de enviar a série ao YouTube: `references/publicacao.md` (manifesto, nomes, playlists, helpers do Studio).

## Pedido

Sem `docs/video-tutorial/`, copiar `modelos/` deste repositório para lá (ver o README.md dele) e perguntar o que não se acha no
projeto: banco e mecanismo de isolamento, perfil de tela, voz só se o usuário quiser outra. O
conteúdo dos vídeos vem de `spec/produto.md` e `spec/glossario.md` do projeto e das telas
exploradas, nunca de memória.
