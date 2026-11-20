# Roteiro

O roteiro é um módulo JavaScript, `docs/video-tutorial/roteiros/NN-nome.mjs`: diz o que se fala e o
que se toca na tela. Cada fala tem o texto da legenda, opcionalmente o texto falado (quando a
pronúncia difere) e a ação que acontece enquanto a voz fala.

## De onde vem o conteúdo

- Fluxos e perfis: `spec/produto.md` do projeto. Termos: `spec/glossario.md`.
- Telas, rótulos e seletores: pela exploração (`SENHA=<senha> sh docs/video-tutorial/explorar.sh <email> <rota1,rota2>`), que
  fotografa a tela e lista os rótulos visíveis. Seletor escrito de cabeça é a maior fonte de erro.
- Rótulo de botão, aba, campo e menu é dito exatamente como está na tela.
- Nada de dado real de pessoa na fala, na tela ou no roteiro: tudo o que aparece é simulado pelo cenário.

## Estrutura fixa

```
abertura        capa de abertura + "Neste vídeo você vai ..."        (1 fala)
                para que serve a área do sistema                       (1 fala)
índice          "O vídeo tem N passos: A; B; C; e, por fim, D."        (1 fala)
passo 1         capa do passo, voz diz "Passo um: <título>."           (1 fala)
                tópico 1.1 ... tópico 1.k                              (1 a 4 falas cada)
passo 2 ...     idem
encerramento    "Pronto! ..." + capa final                             (1 fala)
```

- De 2 a 5 passos, cada um com 1 a 6 tópicos. Passo é uma etapa que o usuário reconhece; tópico é
  uma tela ou ação dentro do passo.
- Dizer sempre "Passo", nunca "Parte".
- O encerramento aponta o próximo vídeo ou onde consultar.

## Fala e ritmo

- 1 a 2 frases, até ~25 palavras, uma ideia por fala. A voz fala ~2,5 palavras por segundo.
- A fala descreve o que está na tela naquele instante. A ação começa junto com a fala. Se for mais
  longa, a montagem acelera o trecho: até ~2,5× fica natural; acima, dividir a fala.
- A ação de uma fala termina no estado que a fala descreve. O que ela anuncia ("vamos abrir o menu")
  acontece dentro da própria fala. O que fecha ou confirma ("Adicionar", "Salvar", um toast) fecha a
  fala ou passa à seguinte. Para segurar um estado enquanto a voz fala, `await h.ateOFimDaFala()` espera
  até 90% da duração da voz da fala corrente, sem espera fixa.
- O rótulo citado leva a grafia da tela. Se ele começa por preposição ou artigo, põe-se um substantivo
  antes: "clique na opção No portal", nunca "clique em no portal".
- Mostrar o fluxo completo: preencher, salvar, ver o resultado. Passar o mouse só para apontar.
- Tom: segunda pessoa, didático, sem jargão técnico. "Escolha a pessoa", não "selecione o registro".
- Pronúncia: sigla e símbolo como se fala, só no campo `fala` do roteiro ou na tabela `PRONUNCIA`
  do `config.mjs` (a legenda mantém a grafia). Voz e velocidade são fixas; ver `visual.md`.
- Duração de 2 a 6 minutos. Acima de 6, dividir (seção "Teto de 6 minutos").

## Conteúdo para quem nunca viu o sistema

- Termo do domínio é dito e explicado na primeira vez que aparece, com as palavras do glossário
  ("repasse é o material que a pessoa leva"), e a sigla da tela é lida como a tela a mostra.
- Cada termo da tela entra em algum tópico; conferir a lista do vídeo contra `spec/produto.md`.
- O que o sistema ainda não entregou não entra.

## Ação irreversível ou com efeito de fora

Enviar e-mail ou mensagem, publicar, pagar, ligar para alguém: abrir o diálogo, preencher e
**cancelar**, e dizer isso na fala ("Neste caso o envio é cancelado."). O que só abriria outro
aplicativo (telefone, mensageiro) é apontado com o cursor, não tocado. O e-mail do cenário vai
para `log`; nada sai de verdade.

## Troca de usuário e preparação

Trocar de usuário (quem pede, quem atende) e preparar dados ficam **atrás da capa do passo**,
segundo argumento de `capaDoPasso(i, antes)`, nunca no meio de um tópico. A capa fica mais 2,5 s
depois da preparação. Estado que o vídeo precisa e o cenário não traz é criado pela própria
tela, atrás da capa, nunca por script síncrono.

## Teto de 6 minutos, partes `a` e `b`

Passou de 6 min no ensaio: dividir em `NNa-nome.mjs` e `NNb-nome.mjs`, cada uma de pé sozinha, com
abertura, índice e encerramento próprios. A ordem alfabética dos arquivos é a ordem da série. A
parte `b` não depende de estado que a `a` deixou: cada vídeo parte de base nova e cria o que precisa.
Renomear o vídeo único para `NNa` quando ele se divide. A série colada usa concat sem reencode
(`conferencia.md`).

## Formato do arquivo

```js
import { capas } from '../comum.mjs'

export const VIDEO_INFO = {
  titulo: 'Pessoas',                       // título da capa; <br> quebra a linha, no máximo 2
  subtitulo: 'Cadastrar, buscar e ler a ficha.',
  encerramento: 'Próximo vídeo: Atendimento.',
  login: { modo: 'senha', email: 'admin@example.com', senha: '...' }, // como o vídeo começa; só dado simulado
}

export const PARTES = [                    // os PASSOS: índice e capas
  { titulo: 'A lista', topicos: ['Abrir a lista', 'Saldo'] },
  { titulo: 'Cadastrar', topicos: ['Nome', 'Salvar'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [                   // cenas, na ordem
  { abertura: true, falas: [
    { texto: 'Neste vídeo: cadastrar e buscar pessoas.', acao: async (h) => { await h.capaAbertura() } },
    { texto: 'Pessoa é quem trabalha para você.', acao: async () => {} },
  ] },
  { falas: [{ texto: 'Dois passos: a lista e cadastrar.', acao: async (h) => { await h.indice() } }] },
  capaDoPasso(0),
  { capitulo: 'Abrir a lista', falas: [
    { texto: 'Toque em Pessoas.',
      fala: 'Toque em Pessoas.',          // opcional: só quando a voz lê diferente
      acao: async (h) => { await h.semCapa(); await h.aba('Pessoas') } },
  ] },
  // ...
  { falas: [{ texto: 'Pronto! Já sabe cuidar das pessoas.', acao: async (h) => { await h.capaEncerramento() } }] },
]
```

- `capitulo` é o tópico e vira a etiqueta da legenda ("PASSO · TÓPICO").
- O id de cada fala é `cNNfM` (cena NN, fala M): nome do MP3 e chave em `duracoes.json`. Texto
  falado mudou, MP3 velho: regerar (`armadilhas.md`).
- `h` é o objeto de ações do `gravar.mjs`: mover, clicar, digitar, campo, botão, aba, rolar,
  esperar, `esc`, trocar de usuário, as capas e `h.page`, o `page` do Playwright, para o resto.
  `h.mover`, `h.clicar` e `h.digitar` aceitam `{ parcial: true }`, que libera alvo grande de propósito
  (quadro, lista). `h.ateOFimDaFala(margem = 0.9)` segura o estado até o fim da voz; no ensaio seco não espera.
  Os nomes exatos estão no `gravar.mjs` do projeto: ler lá, não adivinhar.
- Seletores do Quasar que funcionam: `.q-field__label`, `.q-btn span.block`, `.q-menu .q-item`,
  `.q-dialog`, `.q-drawer .q-item`, `.q-tab`, `tbody tr` filtrado por texto.
- Lista virtual só tem as linhas perto da tela: rolar aos poucos até a linha existir, depois mirar.
- O primeiro vídeo (ou parte `a`) fixa o padrão de tom e ritmo: os outros copiam dele. Por isso a onda 0.
