<!-- cobre: src/Codigo.gs, src/App.html -->
# Atualizar

## Da versão 2 em diante

Na 2.7.0 o próprio app avisa quando há versão nova. Uma vez por dia ele consulta o arquivo público de versões no GitHub (só esse arquivo, sem enviar dados) e acende um ponto em **Ajustes**. Dá para desligar a consulta no mesmo cartão.

Em **Ajustes › Atualizações** você tem duas opções:

- **Atualizar agora:** abre o instalador já apontando para o seu projeto. Em um clique ele guarda uma cópia de segurança (uma versão do projeto) e troca o código, mantendo o mesmo endereço. O link leva só o ID do projeto e da implantação, nenhum dado seu. Na primeira vez o Google pede para autorizar o instalador, como em [INSTALAR.md](INSTALAR.md#instalar-com-o-instalador-recomendado).
- **Atualizar à mão…:** abre um passo a passo que copia cada arquivo da versão nova, conferido por SHA-256, para você colar no editor, salvar e publicar uma **Nova versão** na implantação existente. Não pede permissão nova.

As duas valem para quem instalou pelo instalador e para quem instalou à mão (o instalador reconhece o arquivo `Código.gs` do guia manual). O endereço e os dados não mudam. Se a sua versão já for a mais nova, o instalador avisa e não escreve nada.

**Voltar atrás.** Em **Implantar › Gerenciar implantações › ✏️**, escolha a versão anterior e implante. Depois do **Atualizar agora**, o instalador informa o número da cópia de segurança; é a versão que você escolhe ali.

Para atualizar sem o aviso, cole os arquivos novos por cima dos antigos em **Extensões › Apps Script**, salve com `Ctrl+S` e publique em **Implantar › Gerenciar implantações › ✏️ › Versão: Nova versão › Implantar**. Não use *Nova implantação*: ela gera outro endereço.

## Da versão 1 para a 2

A versão 2 lê **as mesmas quatro abas, com as mesmas colunas** da versão 1 (`lancamentos`, `categorias`, `orcamento`, `config`). Atualizar é trocar o código: não há migração, e os lançamentos que você já fez continuam valendo.

## O que continua igual

- Todos os lançamentos, categorias e valores de orçamento, exatamente onde estão.
- Todos os meses continuam calculados a partir das mesmas abas. A regra das contas mudou na 2.8.0 (veja "Da 2.7 para a 2.8").
- O endereço do app, se você atualizar pela implantação existente (passo 4).

## O que muda

- O **titular** vira o **nome do controle** (dá para trocar em Ajustes).
- O **orçamento** passa a se chamar **plano**. Até a 2.7, a regra das contas era a da versão 1: vale o que foi lançado e, numa categoria sem lançamento, o plano. A 2.8.0 mudou essa regra (veja "Da 2.7 para a 2.8").
- Editar a planilha à mão passa a ser seguro: o app grava operações sobre o que está na planilha e percebe as edições.

## Da 2.8 para a 3.0

A 3.0 muda o **Início**, que agora se organiza por perguntas, e traz o **fechamento do mês**, a **escolha do mês** e os **dados de exemplo**. A fonte DM Sans passa a vir com o app.

Nos dados, aparece só uma linha nova por mês fechado, na aba `config` (`fechado:AAAA-MM`, com a sobra realizada). A 2.8 preserva essas linhas se você voltar.

**Voltar para a 2.8.1:** reimplante o código dela no mesmo endereço. Os dados continuam válidos.

## Da 2.7 para a 2.8

A 2.8.0 muda as contas do mês, não os dados. Nenhuma aba nem coluna nova.

- **Disponível:** renda do mês − o que já saiu − o que ainda está reservado (contas a pagar, o que falta guardar e o que resta dos planos). Gastar dentro de um plano não muda o disponível; receber parte de uma renda prevista também não.
- **Meses que já passaram:** mostram a sobra realizada, só com o que foi lançado. Planos que ficaram sem lançamento aparecem à parte.
- **Encerrar uma categoria no mês** ("Quitar", "Encerrar no mês", "Não vem mais") grava uma linha `encerrada:AAAA-MM:categoria` na aba `config`.
- Na primeira abertura, quem já usava o app vê o disponível pela regra antiga e pela nova.

**Voltar para a 2.7.1:** reimplante o código da 2.7.1 no mesmo endereço (ou use a cópia de segurança que o **Atualizar agora** guarda). Os dados continuam válidos: a 2.7.1 preserva as linhas `encerrada:` da aba `config` e simplesmente as ignora, e os números voltam a seguir a regra antiga. Não volte para a versão 1: ela regrava todas as abas.

## Passo a passo

**0. Feche o app em todos os aparelhos** (computador e celular). Uma aba antiga aberta tentaria gravar com o código velho e mostraria erro.

**1. Guarde uma cópia (recomendado).** Na planilha: **Arquivo › Fazer uma cópia**. Em caso de dúvida, é só voltar a ela.

**2. Abra o editor:** na planilha, **Extensões › Apps Script**.

**3. Troque os arquivos:**

| No editor | O que fazer |
|---|---|
| `Código.gs` | apague tudo e cole [`src/Codigo.gs`](../src/Codigo.gs) |
| `Index` | apague tudo e cole [`src/Index.html`](../src/Index.html) |
| `Estilos` (novo) | **+ › HTML**, nome `Estilos`, cole [`src/Estilos.html`](../src/Estilos.html) |
| `App` (novo) | **+ › HTML**, nome `App`, cole [`src/App.html`](../src/App.html) |

Para copiar cada arquivo inteiro, use o botão **Copy raw file** do GitHub (veja [Como copiar um arquivo do GitHub](INSTALAR.md#como-copiar-um-arquivo-do-github)). Salve com `Ctrl+S`. O manifesto [`src/appsscript.json`](../src/appsscript.json) é opcional (veja o passo 3 de [INSTALAR.md](INSTALAR.md)).

**4. Publique uma nova versão no mesmo endereço:** **Implantar › Gerenciar implantações › ✏️ › Versão: Nova versão › Implantar**.

Não use *Nova implantação*: ela gera outro endereço.

**5. Autorize de novo, se o Google pedir.** A versão 2 pede menos permissão ("somente esta planilha"), e o Google pode querer confirmar.

**6. Abra o app.** Seus dados aparecem como estavam. Confira um mês fechado na **Planilha** contra o que você via antes. Se algo der erro, veja os [problemas comuns](INSTALAR.md#problemas-comuns).

As telas novas estão explicadas em [USAR.md](USAR.md).

## Voltar atrás

Em **Implantar › Gerenciar implantações › ✏️**, escolha a versão anterior e implante. Os dados não mudam de formato, então a versão 1 continua lendo tudo, inclusive o que foi lançado pela versão 2.
