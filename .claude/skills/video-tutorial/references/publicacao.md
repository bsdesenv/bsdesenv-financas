# Publicação no YouTube: nomes, playlists, envio e troca de versão

Ler antes de enviar a série. O envio é feito pelo Studio no navegador do container, sem API e
sem chave: a conta já está logada ali, e quem decide publicar é quem administra o canal.

## 1. Manifesto antes do primeiro envio

Uma tabela em `docs/video-tutorial/envio.md`, versionada, conferida com quem pediu antes de enviar o
primeiro vídeo. O envio lê dela, a conferência final compara com ela, e a coluna Situação é o estado
entre sessões: o envio pode esperar dias pelo teto diário (seção 7), e o scratchpad morre com a
sessão.

| Coluna | Conteúdo |
|---|---|
| Código | inicial do perfil + NN (`A01`, `B03`): curto para relatório e prompt |
| Arquivo | o MP4 de `saida/`: `saida/<perfil>/NN-<assunto>.mp4` com `PERFIS` no `config.mjs`, ou `saida/<nome>.mp4` sem ela |
| Título e descrição | exatamente como vão ao ar (seção 2) |
| Situação | `ENVIAR`, `TROCAR <id velho>`, `OK <id>` |

Debaixo da tabela, a ordem final de cada playlist, por código.

## 2. Nomes

**Título:** `<Perfil> NN · <Assunto> | <Produto>`.

- O perfil vem primeiro: é por ele que a pessoa procura, e assim a lista do Studio agrupa.
- NN tem dois dígitos e conta a sequência dentro do perfil, não a série inteira. A ordem
  aparece no título mesmo fora da playlist.
- Assunto com até ~35 caracteres. No celular o título corta perto de 60, e o ` | <Produto>`
  final é o que pode sumir (ele serve à busca, não à leitura).
- Vídeo dividido mantém o número e ganha a parte:
  `<Perfil> 03 · <Assunto> (parte 1 de 2) | <Produto>`. O "de 2" diz quanto falta. O seguinte
  é `04`, sem pular número.
- O título não sai do nome do arquivo: o slug é para a máquina, o título para quem assiste.

**Descrição**, uma frase por papel, sempre no mesmo molde:

```
Tutorial do <Produto> para o perfil <Perfil>, vídeo NN de TT: <o que a pessoa aprende, em uma linha>.
Próximo vídeo: <Perfil> NN · <Assunto>. Os nomes e dados que aparecem na tela são fictícios.
```

- No último vídeo do perfil: `Último vídeo do perfil <Perfil>.` no lugar do "Próximo vídeo".
  Se a playlist do perfil emprestar vídeos de outro perfil (seção 3), a frase diz quais e onde
  estão.
- O aviso de dado fictício fecha toda descrição: o cenário é fictício, e quem assiste precisa
  saber que nenhum nome da tela é cliente real.

## 3. Playlists

- Uma por perfil, `<Produto> · Perfil <Perfil>`, e uma `<Produto> · Todos os vídeos`. Cada
  vídeo entra na do perfil dele e na Todos.
- Vídeo de outro perfil que este também usa entra na playlist deste **no fim**, depois dos
  próprios, na ordem da série de origem. Ele mantém o título do perfil de origem.
- A Todos segue os perfis na ordem em que a série foi gravada e, dentro de cada perfil, o NN.
- Ordem **manual**. Para ordenar, cada vídeo é levado ao fim, na ordem desejada ("Mover para o
  fim" no menu do vídeo, na página da playlist em `www.youtube.com/playlist?list=<id>`). Ao
  terminar a passada, a playlist fica exatamente na ordem dada. Arrastar não é confiável pela
  automação.

### Canal com vários produtos

- Um canal atende vários produtos. O prefixo `<Produto> · ` em toda playlist e o ` | <Produto>` no fim de
  todo título agrupam cada produto na lista do Studio.
- O YouTube não aninha playlist: a `<Produto> · Todos os vídeos` faz o papel da pasta do produto, e cada
  `<Produto> · Perfil <Perfil>` o de subpasta.
- A seção "Várias playlists" da página do canal (Personalização, Layout, até 12 seções) só mostra conteúdo
  público. Com vídeo privado ou não listado, a página do canal não expõe produto nenhum, e quem assiste chega
  pelo link da playlist do perfil dele: a separação entre clientes é o link, não a página.
- Descrição da playlist do perfil: `Tutoriais do <Produto> para o perfil <Perfil>, na ordem de uso.` Se
  a playlist emprestar vídeos de outro perfil, a frase seguinte diz quais. A da Todos: `Série completa de
  tutoriais do <Produto>, com os perfis na ordem: <Perfil>, <Perfil>.` As duas fecham com o aviso de dado
  fictício da descrição de vídeo.
  Onde se edita: na página `playlist?list=<id>`, "Editar playlist", botão "Descrição", o textbox,
  "Concluído" e "Salvar", nessa ordem, e só então recarregar. Não há lápis na descrição, e o Studio de
  playlists respondeu "Ops! Algo deu errado" (11/2026). Conferir por `fetch` do HTML da página com o texto.

### Capa da playlist

- A capa é a miniatura do primeiro vídeo, ou a do vídeo marcado com "Definir como miniatura da playlist" no
  menu dele, na página da playlist.
- Com os vídeos privados, a capa aparece cinza (`no_thumbnail.jpg`), até para o dono.
- Imagem própria na playlist só existe no app Android, em conta verificada: fora da automação.
- Miniatura própria de vídeo exige o telefone do canal verificado (seção 5). Até lá, a capa é o quadro que o
  YouTube escolher do primeiro vídeo.

## 4. Visibilidade e troca de versão

- Todo vídeo sobe **privado**, com "Não é conteúdo para crianças". Público ou não listado é
  decisão de quem administra o canal, nunca do agente.
- Versão nova de um vídeo já publicado: enviar a nova, pô-la nas playlists no lugar da velha
  e tirar a velha das playlists. **Excluir a velha só com o sim de quem pediu**: a exclusão é
  irreversível e leva junto o link e as visualizações.
- Vídeo que já está no ar e só muda de nome ganha título e descrição novos pela página de
  edição (`__ytp.editar`), sem novo envio.

## 5. Envio pelo Studio

Helpers em `modelos/`: `youtube-envio.js` instala `window.__yt` (envio) e `youtube-playlists.js`
instala `window.__ytp` (edição, ordem e leitura de playlist). O arquivo inteiro é a `function` do
`evaluate_script`. Executor: `navegador`, em lotes de até 4 vídeos, porque cada vídeo custa 5
chamadas e o teto dele é de 40 turnos.

Antes do lote: o canal precisa ter o telefone verificado (`youtube.com/verify`), senão o teto
diário de envios corta a série no meio (seção 7). Verificar é de quem administra o canal.

Por vídeo:

1. `navigate_page` para `https://studio.youtube.com/channel/<ID do canal>/videos/upload?d=ud`.
2. `take_snapshot` e achar o uid do botão "Selecionar arquivos".
3. `upload_file` com esse uid e o MP4.
4. `evaluate_script` com o `youtube-envio.js`.
5. `evaluate_script` com `async () => window.__yt.preencher(titulo, descricao, [playlists])`,
   com `waitForStableDom: false`.

Retornos do passo 5:

- `OK <link>`: próximo vídeo.
- `AINDA ENVIANDO`: esperar e chamar `window.__yt.salvar()`.
- `FALHA ...`: parar o lote **sem navegar**. Navegar com o envio aberto descarta o vídeo.

Depois do lote, a conferência: a lista do Studio (título e "Privado") e `__ytp.ler()` em cada
playlist, comparadas com o manifesto.

## 6. Seletores do Studio (interface em pt-BR, conferidos em 11/2026)

| Peça | Seletor ou texto |
|---|---|
| Título e descrição | `#title-textarea #textbox`, `#description-textarea #textbox`; escrever com `execCommand('insertText')`, porque atribuir `innerText` não chega ao Studio |
| Abrir playlists | `ytcp-video-metadata-playlists ytcp-text-dropdown-trigger` |
| Item de playlist | `ytcp-checkbox-group label[id^=checkbox-item]`, marcado pelo `[role=checkbox]` com `aria-checked` |
| Fechar playlists | botão "Concluir" |
| Público infantil | `tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]` |
| Avançar | `#next-button`, três vezes até Visibilidade |
| Privado | `tp-yt-paper-radio-button[name="PRIVATE"]` |
| Envio terminado | `ytcp-video-upload-progress` sem `%` no texto |
| Vídeo criado | `ytcp-video-info a` com `href`; recusa em `.error-short` |
| Salvar | `#done-button`, depois "Fechar" |
| Página de edição | `studio.youtube.com/video/<id>/edit`; salvar em `ytcp-button#save`, que fica `aria-disabled="true"` sem mudança pendente; confirmação no toast "Alterações salvas" |
| Id de playlist | `studio.youtube.com/playlist/<id>/videos`, lido da lista de playlists do Studio |

Com o Studio em outro idioma, trocar os textos usados nos helpers: "Criar", "Enviar vídeos",
"Concluir", "Fechar", "Mover para o fim", "Menu de ações", "Alterações salvas", "Nenhuma playlist disponível".

## 7. Armadilhas

| Sintoma | Causa e saída |
|---|---|
| O link do vídeo fica em "Criando o link...", o seletor de playlist abre com "Nenhuma playlist disponível" e `.error-short` diz "O limite diário de envios foi alcançado" | Canal sem telefone verificado tem teto de envios por dia (travou no 11º vídeo em ~24 h). O vídeo não foi criado: salvar nesse estado fecha o diálogo sem erro e perde o envio. O `preencher` para com `FALHA: envio recusado`. Saída: verificar o telefone do canal ou continuar no dia seguinte. Verificar não libera o teto já estourado: o envio logo depois da verificação também foi recusado, e o lote espera a janela de ~24 h |
| `navegador` para no meio do lote | Teto de turnos: lote menor, e o prompt traz os passos fixos, sem exploração |
| Investigar uma falha pela rede | **Nunca** `get_network_request` em site logado: ele imprime os cabeçalhos, com os cookies da sessão, no contexto. Status por `performance.getEntriesByType('resource')` (`responseStatus`) e o motivo pelo texto da tela |
