# Instalar

O resultado é um endereço (termina em `/exec`) que você abre no computador e no celular. Os dados ficam numa planilha do seu Google Drive. Leva uns 10 minutos na primeira vez, tudo no navegador.

Faça a instalação **no computador**. Depois é só abrir o endereço no celular.

## Antes de começar

Você precisa de:

- **Uma conta Google pessoal** (Gmail). Contas de empresa ou de escola costumam bloquear scripts pessoais.
- **Acesso a este repositório no GitHub.** Ele não é público: quem mantém o projeto envia um convite para a sua conta do GitHub. Crie uma conta gratuita em <https://github.com/signup>, se ainda não tiver, aceite o convite que chega por e-mail e entre na sua conta antes de abrir os links deste guia. Sem estar logado, o GitHub mostra "Page not found".

### Como copiar um arquivo do GitHub

Os passos abaixo pedem para "colar o conteúdo" de alguns arquivos. Para copiar sem perder nenhum pedaço:

1. Clique no nome do arquivo (por exemplo, [`src/App.html`](../src/App.html)).
2. No canto superior direito do código, clique no botão **Copy raw file** (ícone de duas folhas sobrepostas).
3. Cole no editor do Apps Script com `Ctrl+V`.

Não selecione o texto com o mouse: o `App.html` é longo, e faltar uma linha no final faz o app não abrir.

Se preferir baixar tudo de uma vez: na página inicial do repositório, botão verde **Code › Download ZIP**. Descompacte e abra os arquivos da pasta `src` no Bloco de Notas para copiar.

## 1. Criar a planilha

1. Abra <https://sheets.new>.
2. Dê um nome no topo, por exemplo **Finanças**.

Não precisa digitar nada nela: as abas são criadas no primeiro acesso.

## 2. Abrir o editor de código

Na mesma planilha: **Extensões › Apps Script**. Abre uma aba nova com um arquivo `Código.gs`.

## 3. Colar os arquivos

Os arquivos estão na pasta [`src/`](../src) deste repositório. No editor:

| No editor do Apps Script | Conteúdo a colar |
|---|---|
| `Código.gs` (já existe: apague o que tem, inclusive o `function myFunction`) | [`src/Codigo.gs`](../src/Codigo.gs) |
| **+ › HTML**, nome `Index` | [`src/Index.html`](../src/Index.html) |
| **+ › HTML**, nome `Estilos` | [`src/Estilos.html`](../src/Estilos.html) |
| **+ › HTML**, nome `App` | [`src/App.html`](../src/App.html) |

O **+** fica ao lado da palavra *Arquivos*, na coluna da esquerda do editor. Os nomes precisam ser exatamente `Index`, `Estilos` e `App`, com maiúscula e sem `.html` (o editor acrescenta sozinho). Cada arquivo novo já vem com algumas linhas de exemplo: apague tudo antes de colar. Salve com `Ctrl+S`.

**Opcional, mas recomendado:** em **Configurações do projeto** (engrenagem), marque *Mostrar o arquivo de manifesto "appsscript.json" no editor* e cole nele o [`src/appsscript.json`](../src/appsscript.json). Isso fixa o fuso horário e a permissão mínima.

## 4. Publicar

1. **Implantar › Nova implantação**.
2. Na engrenagem ao lado de *Selecione o tipo*, escolha **App da Web**.
3. Preencha:
   - **Executar como:** Eu
   - **Quem pode acessar:** Somente eu
4. **Implantar**.

> Use sempre **Somente eu**. Com "Qualquer pessoa", quem tivesse o endereço veria e alteraria seus dados.

## 5. Autorizar

Na primeira vez o Google pede permissão:

1. **Autorizar acesso** e escolha sua conta.
2. Aparece *"O Google não verificou este app"*. Clique em **Avançado › Acessar (não seguro)**. O aviso é padrão para scripts pessoais: o código é o que você colou.
3. **Permitir.** A permissão é só para esta planilha.

## 6. Abrir

Copie o **URL do app da Web** (termina em `/exec`) e abra. No primeiro acesso você escolhe um nome e um modelo de categorias, ou importa um backup.

Guarde esse endereço: é ele que você vai abrir sempre. Se perder, ele aparece de novo em **Implantar › Gerenciar implantações**.

No topo do app aparece uma faixa cinza: *"Este aplicativo foi criado por um usuário do Google Apps Script"*. É normal. O Google mostra essa faixa em todo app feito com Apps Script, e o "usuário" é você.

- **No celular:** abra o mesmo endereço, entre com a mesma conta Google e use **Adicionar à tela inicial** (Chrome: menu ⋮; Safari: Compartilhar). Fica um ícone como o de um aplicativo.
- **Atalho para lançar direto:** acrescente `?novo=1` ao endereço para abrir já na tela de lançamento. Veja os outros atalhos em [USAR.md](USAR.md#atalhos).

**Próximo passo:** [USAR.md](USAR.md) explica as telas e o dia a dia. Para experimentar com dados de mentira antes, veja abaixo.

## Experimentar com dados de exemplo (opcional)

São um ano de dados fictícios, bons para ver as telas cheias.

1. **Antes, guarde o seu estado atual:** no app, **Ajustes › Baixar backup (JSON)**.
2. Abra [`exemplos/dados-exemplo.json`](../exemplos/dados-exemplo.json) no GitHub e clique em **Download raw file** (ícone de seta para baixo, no canto superior direito).
3. No app: **Ajustes › Importar backup**, escolha o arquivo de exemplo e **Substituir tudo**.

Para voltar ao seu estado: **Ajustes › Importar backup**, escolha o arquivo do passo 1 e **Substituir tudo**.

## Atualizar o código depois

Cole os arquivos novos por cima dos antigos, salve e faça **Implantar › Gerenciar implantações › ✏️ (editar) › Versão: Nova versão › Implantar**.

O endereço continua o mesmo e os dados não são tocados. **Nova implantação** criaria um endereço novo; use **Gerenciar implantações**.

## Problemas comuns

**"Não é possível abrir o arquivo neste momento" ou "Desculpe, não foi possível abrir o arquivo".** Acontece quando o navegador está logado em mais de uma conta Google ao mesmo tempo, e o Google escolhe a conta errada. Abra o endereço numa janela anônima e entre só com a conta dona da planilha. Outra opção é usar um perfil do navegador só com essa conta.

**"Este app está bloqueado" ou não aparece a opção "Avançado".** A conta é de empresa ou de escola, e o administrador bloqueia scripts pessoais. Use uma conta Gmail pessoal.

**Tela branca ou "função não encontrada".** Algum arquivo HTML está com nome diferente de `Index`, `Estilos` ou `App`.

**Erro de sintaxe ao salvar, ou o app abre pela metade.** Algum arquivo foi colado incompleto, ou sobrou o código de exemplo do editor. Apague tudo do arquivo e cole de novo usando o botão **Copy raw file** (veja [Como copiar um arquivo do GitHub](#como-copiar-um-arquivo-do-github)).

**"Page not found" no GitHub.** Você não está logado no GitHub, ou ainda não aceitou o convite para o repositório.

**Abri o endereço no celular e pediu para entrar.** Entre com a mesma conta Google da planilha. O acesso é "Somente eu", então outra conta não abre.

**"Não consegui abrir a planilha".** No editor do Apps Script, rode a função `carregar` uma vez pelo botão *Executar*. Isso dispara a autorização que ficou pendente.

**Editei a planilha à mão.** Pode editar. O app percebe a mudança quando você volta para a aba dele, e cada gravação do app parte do que está na planilha naquele momento.

**Quero voltar a uma versão antiga dos dados.** No Google Sheets: **Arquivo › Histórico de versões**. Em **Ajustes › Baixar backup** o app também gera um JSON completo.
