# Instalar

O resultado é um endereço (termina em `/exec`) que você abre no computador e no celular. Os dados ficam numa planilha do seu Google Drive. Leva uns 10 minutos na primeira vez, tudo no navegador.

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
| `Código.gs` (já existe: apague o que tem) | [`src/Codigo.gs`](../src/Codigo.gs) |
| **+ › HTML**, nome `Index` | [`src/Index.html`](../src/Index.html) |
| **+ › HTML**, nome `Estilos` | [`src/Estilos.html`](../src/Estilos.html) |
| **+ › HTML**, nome `App` | [`src/App.html`](../src/App.html) |

Os nomes precisam ser exatamente `Index`, `Estilos` e `App`, com maiúscula e sem `.html` (o editor acrescenta sozinho). Salve com `Ctrl+S`.

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

- **No celular:** abra o mesmo endereço e use **Adicionar à tela inicial** (Chrome: menu ⋮; Safari: Compartilhar).
- **Atalho para lançar direto:** acrescente `?novo=1` ao endereço para abrir já na tela de lançamento. Com `?novo=mercado`, ela abre com a categoria de id `mercado` escolhida.

## Atualizar o código depois

Cole os arquivos novos por cima dos antigos, salve e faça **Implantar › Gerenciar implantações › ✏️ (editar) › Versão: Nova versão › Implantar**.

O endereço continua o mesmo e os dados não são tocados. **Nova implantação** criaria um endereço novo; use **Gerenciar implantações**.

## Problemas comuns

**Tela branca ou "função não encontrada".** Algum arquivo HTML está com nome diferente de `Index`, `Estilos` ou `App`.

**"Não consegui abrir a planilha".** No editor do Apps Script, rode a função `carregar` uma vez pelo botão *Executar*. Isso dispara a autorização que ficou pendente.

**Editei a planilha à mão.** Pode editar. O app percebe a mudança quando você volta para a aba dele, e cada gravação do app parte do que está na planilha naquele momento.

**Quero voltar a uma versão antiga dos dados.** No Google Sheets: **Arquivo › Histórico de versões**. Em **Ajustes › Baixar backup** o app também gera um JSON completo.
