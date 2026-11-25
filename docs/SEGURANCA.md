# Segurança e privacidade

O Finanças é código aberto (MIT) e roda inteiro na sua conta Google. Esta página explica o que cada parte acessa, o que sai do seu Drive e o que você pode desligar.

## O app do dia a dia

- **Permissão só para esta planilha.** O manifesto usa `https://www.googleapis.com/auth/spreadsheets.currentonly`, e o código começa com `@OnlyCurrentDoc`. O script não enxerga outras planilhas nem outros arquivos do Drive.
- **Sem servidor nosso.** Os lançamentos vão do navegador para o Apps Script e daí para a sua planilha. Não há banco de dados, mensalidade ou anúncio.
- **Sem `ALLOWALL`.** Outros sites não conseguem embutir o app numa página.
- **Validação no servidor.** Ids, mês, dia, valor, categoria e lote de operações são conferidos antes de qualquer gravação; texto que começaria com `=`, `+`, `-` ou `@` é gravado como texto para não virar fórmula.
- **Texto escapado no navegador.** Tudo o que vem da planilha ou de arquivos públicos passa por escape antes de entrar no HTML.

## Consulta de versão nova

- **Quem faz:** o seu navegador, uma vez por dia (dá para desligar em **Ajustes › Atualizações**). O resultado fica guardado por 24 h no próprio navegador.
- **O que é lido:** só o arquivo público `versao.json` do repositório `bsdesenv/bsdesenv-financas`, em `raw.githubusercontent.com` (com alternativa no `cdn.jsdelivr.net`). O app não lê o `CHANGELOG.md`: só mostra um link para ele.
- **O que é enviado:** nenhum dado seu. A requisição é um `GET` comum, como abrir uma página pública.
- **O que o GitHub vê:** o endereço IP e o horário do acesso, como em qualquer site. Não vão a planilha, o nome nem os lançamentos.

## Atualização assistida

- **Você decide:** nada é trocado sozinho. O app só mostra o aviso e as opções **Atualizar agora** (pelo instalador) e **Atualizar à mão…** (passo a passo).
- **Conferência por SHA-256:** cada arquivo baixado é comparado com o hash publicado no `versao.json` daquela tag antes de ser oferecido para copiar. Se não bater, o app avisa e não copia.
- **Você cola e publica:** a troca é feita por você no editor do Apps Script e a publicação é uma nova versão na implantação existente. Os dados da planilha não são tocados.
- **Volta atrás:** em **Implantar › Gerenciar implantações › ✏️**, escolha a versão anterior. O formato dos dados é o mesmo.

## Instalador (opcional)

O instalador é um **projeto Apps Script separado**, publicado pela bsdesenv, para quem quer instalar e atualizar com um clique. Ele é opcional: quem não quiser pode instalar e atualizar à mão, mantendo só a permissão da planilha. O app em si continua pedindo apenas `spreadsheets.currentonly`.

- **Roda como você.** A implantação usa `executeAs: USER_ACCESSING`: cada pessoa autoriza na própria conta, e o instalador age em nome dela, não em nome da bsdesenv.
- **Escopos próprios, só os necessários:**
  - `script.projects` — ler e trocar o conteúdo de projetos Apps Script;
  - `script.deployments` — criar e atualizar implantações;
  - `script.external_request` — baixar os arquivos do GitHub;
  - `drive.file` — criar e mexer apenas nos arquivos que ele mesmo criou.
- **Não lê seus dados.** Não usa `SpreadsheetApp`, `DriveApp` nem `Session`. O `drive.file` não dá acesso às suas outras planilhas ou arquivos; ele cria a planilha do Finanças e mantém o projeto vinculado a ela.
- **Link do "Atualizar agora".** O app abre o instalador com só dois IDs no endereço: o do projeto e o da implantação. Nenhum dado da planilha vai no link.
- **Conferência antes de criar.** Antes de criar qualquer coisa, o instalador confere a autorização, a chave da API e os hashes dos arquivos.
- **Falha no meio.** Se a instalação falhar mesmo assim, a planilha que ele criou vai para a lixeira sozinha.
- **Só mexe no Finanças.** Antes de atualizar, lê o projeto e confere se existe um arquivo de servidor com a marca `bsdesenv-financas` e um `VERSAO_APP` válido. Se não for o Finanças, recusa sem alterar nada. Isso vale também para quem instalou à mão.
- **Cópia antes de atualizar.** Uma versão do projeto é guardada antes da troca; o número aparece no fim da atualização para você voltar atrás em **Gerenciar implantações**.
- **Código conferido.** Os arquivos vêm do repositório público, da tag da versão, e são conferidos por SHA-256 antes de qualquer escrita. Arquivos extras que você criou são mantidos.
- **API do Apps Script.** Para o instalador funcionar, a pessoa precisa ligar uma vez a chave "API Google Apps Script" em <https://script.google.com/home/usersettings>. Sem ela, o Google responde com erro de API desligada.
- **Permissão ampla, por limitação do Google.** `script.projects` vale para todos os projetos Apps Script da conta; o Google não oferece um escopo mais estreito. Por isso o instalador é opcional e o código é aberto para conferência.
- **Aviso de app não verificado.** Ao autorizar, o Google mostra "O Google não verificou este app" (**Avançado › Acessar Finanças · instalador**). O app do instalador ainda não passou pela verificação do Google. Na instalação à mão, o desenvolvedor é você; pelo instalador, é a bsdesenv, e o código-fonte está aqui. O app em si também aparece como não verificado na primeira vez, porque o desenvolvedor é a própria pessoa, mas pede só a planilha.
- **Testes de versão.** A propriedade de script `REF_TESTE`, que só o dono do instalador define, troca a tag por outra ref do repositório para testar antes de publicar. Os hashes continuam conferidos.
- **Limite de app não verificado.** Enquanto o app OAuth da bsdesenv não passa pela verificação do Google, o fluxo de app não verificado permite autorizar, mas com um teto de 100 novos usuários no total. Para uso público amplo é preciso verificar o app (domínio, página e política de privacidade). A instalação manual não passa por esse limite.

## Terceiros

| Serviço | Para quê | O que ele vê |
|---|---|---|
| Google (Sheets e Apps Script) | guardar os dados e servir o app | os dados da sua planilha, na sua conta |
| GitHub (`raw.githubusercontent.com`, `cdn.jsdelivr.net`) | arquivos de versão e o ícone do app | o IP e o horário do acesso |

A partir da 3.0.0, a fonte DM Sans vem embutida no próprio app (no `src/Estilos.html`, com a licença em `docs/fontes/DM-Sans-OFL.txt`), e o app não consulta mais o Google Fonts. Antes da 3.0.0, a fonte vinha do Google Fonts, e o navegador enviava a ele o IP e o horário do acesso. A página do instalador, que é um projeto separado, ainda carrega a fonte do Google Fonts.

Não há analytics, rastreadores, cookies de terceiros nem envio de dados para a bsdesenv.

## Como conferir

- O código do app está em [`src/`](../src) e o do instalador em [`instalador/`](../instalador).
- Cada versão publicada tem uma tag (`v2.7.0`…) e os arquivos do `versao.json` trazem o SHA-256 do que foi publicado.
- Para comparar o que está no seu editor com o repositório, use o botão **Copy raw file** do GitHub ou rode `npm test` e `npm run versao -- --conferir` numa cópia local.

## Se algo der errado

- **Dados:** no Google Sheets, **Arquivo › Histórico de versões**; no app, **Ajustes › Baixar backup (JSON)**.
- **Código:** em **Implantar › Gerenciar implantações › ✏️**, escolha a versão anterior e implante. No instalador, use o número da cópia de segurança mostrado no fim da atualização.
- **Permissões:** em <https://myaccount.google.com/permissions>, remova o acesso do instalador ou do app e autorize de novo quando quiser.
