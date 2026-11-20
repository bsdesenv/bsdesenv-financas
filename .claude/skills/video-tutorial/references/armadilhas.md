# Armadilhas

Já aconteceram. Olhar aqui antes de investigar uma ação que falha ou um vídeo que sai estranho.

## Gravação

| Problema | Causa | Solução |
|---|---|---|
| Cortes secos, "tela verde" na troca de passo | Comando síncrono (`execFileSync`, `execSync`: shell, artisan, consulta ao banco) dentro de uma ação: o Node trava, o gravador perde quadros e a montagem emenda o buraco | Nada síncrono dentro da ação. Só chamada assíncrona (`execFile` com Promise); a síncrona só no topo do roteiro, antes de gravar. A preparação mora no cenário |
| Capa parecia um corte | Fundo colorido de tela inteira | Capa branca; cor só nos detalhes |
| Voz adiantada da imagem | Posicionar a voz pelo relógio da gravação | Medir na imagem quando cada legenda aparece (`legendas.py`) |
| Voz termina antes de a tela mudar | Acelerar só a "sobra" depois da fala | Acelerar o trecho inteiro da ação até caber na fala |
| PDF aparece preto | O visualizador de PDF do navegador não desenha a tempo | Converter a 1ª página com `pdftoppm` e mostrar a imagem |
| Relatório abre em janela nova e some | O link ou formulário usa alvo novo | Capturar a resposta, refazer a requisição para ter o PDF, fechar a janela extra |
| Vídeo errado depois de abrir janela extra | Cada página grava um arquivo | Pegar o vídeo da página principal, `page.video().path()` |
| Arquivo final com erro de decodificação | Montagem interrompida ou concorrente | Conferir com `ffmpeg -v error -i <mp4> -f null -` e remontar sozinho |
| Imagem borrada e quadros perdidos | O ffmpeg do Playwright limita bitrate e threads | O `ferramentas.mjs`, importado antes do `playwright`; versão do Playwright fixa |
| Fala nova, voz velha | O gerador só cria os MP3 que faltam | Apagar o MP3 da fala (id `cNNfM`) e rodar `gerar-falas.mjs` e `montar.mjs` |

## Seletores (Quasar)

| Problema | Solução |
|---|---|
| Campo achado atrás do diálogo | Com diálogo aberto, procurar só dentro de `.q-dialog`; o `h.campo` já faz isso |
| "Limpar" achou o ícone de limpar do campo | Procurar o botão pelo texto do `span.block` do `q-btn`, `exact: true` |
| Campo de data pegou um checkbox | Aceitar só input que não é `checkbox` nem `radio` |
| Rádio sem rótulo | Localizar pelo bloco ou título e pegar o 1º ou 2º `.q-radio` |
| Botão que só tem ícone | Localizar pelo `aria-label` ou pelo nome do ícone Material (`close`, `visibility`) |
| `getByText` achou o texto da legenda ou da capa | Legenda por CSS (atributos); esvaziar a capa ao sair |
| Opção do select ainda não carregou | Esperar a opção ficar visível |
| Botão desabilitado | Ler o motivo na tela: é regra de negócio, não seletor |
| Linha da lista não existe | Lista virtual: rolar aos poucos até a linha aparecer, depois mirar |
| Elemento achado mas o clique cai noutro | Toast, barra fixa ou botão flutuante por cima: esperar sumir, rolar ou fechar antes |

## App e ambiente

| Problema | Solução |
|---|---|
| App manda o navegador para a tela "instalar" (PWA) | Emular `navigator.standalone` no navegador da gravação (`INSTALADO` do `config.mjs`), nunca no app |
| Service worker interfere na gravação | Bloqueado no contexto (`serviceWorkers: 'block'`); no servidor de desenvolvimento ele pode nem existir, e o que só aparece num build não sai no vídeo |
| Versão e "DEV" aparecem no pé da tela | Esconder por CSS injetado só na gravação, no roteiro; o app não muda |
| Gravar na porta errada do front | Um servidor só, o do projeto: outra porta é outro estado e não prova nada |
| 500 sem cabeçalho de CORS chega à tela como "erro de rede" | O erro real está na resposta da API: ler o log do backend, não o da tela |
| Limitador de requisições dá 500 na base de vídeo | Cache e limitador no mesmo banco isolado: cache em memória na gravação (`CACHE_STORE=array` no Laravel) |
| Chamadas em paralelo se pisam | Só com vagas > 1, e cada corrida com a sua base pelo cabeçalho `X-Video-Base` |
| E-mail real disparado | E-mail em `log` na base ligada, parte do contrato do cenário |
| Ação com efeito de fora (envio, pagamento, ligação) | Abrir, preencher e cancelar, e dizer na fala |
| A máquina reiniciou no meio | O `trap` pode não ter rodado: `cenario.sh estado`, e `desligar` se estiver ligado, antes de qualquer outra coisa |

## Narração

| Problema | Solução |
|---|---|
| Voz soletra sigla | Escrever como se pronuncia só no texto falado (`fala` ou `PRONUNCIA` do config) |
| Voz lê "+", "%" ou número de forma estranha | Por extenso na fala: "quarenta por cento" |
| Pronúncia boa para uma palavra, ruim em outra | `PRONUNCIA` com fronteira de palavra (`\b`), só onde a voz errar; confirmar de ouvido no primeiro vídeo |

## Pastas e git

- Cada vídeo grava em `falas/<nome>/`, `video/<nome>/` e `saida/<nome>.mp4` (com `PERFIS`,
  `saida/<perfil>/NN-<assunto>.mp4`): é o que permite
  gravar dois ao mesmo tempo sem colisão.
- Nada se apaga. A gravação nova sobrescreve a anterior, e as bases velhas se acumulam em `base/`:
  limpar é decisão manual do usuário. O `produzir.sh` não remove pasta nenhuma.
- Fora do git: `node_modules/`, `base/`, `falas/`, `video/`, `saida/`, `ferramentas/` e
  `__pycache__/`. Vão ao git só os roteiros e os scripts.
