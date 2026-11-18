# Atualizar da versão 1 para a 2

A versão 2 lê **as mesmas quatro abas, com as mesmas colunas** da versão 1 (`lancamentos`, `categorias`, `orcamento`, `config`). Atualizar é trocar o código: não há migração, e os lançamentos que você já fez continuam valendo.

## O que continua igual

- Todos os lançamentos, categorias e valores de orçamento, exatamente onde estão.
- Os meses que já passaram fecham com a mesma regra de antes: vale o que foi lançado e, numa categoria sem lançamento, o valor do orçamento.
- O endereço do app, se você atualizar pela implantação existente (passo 4).

## O que muda

- O **titular** vira o **nome do controle** (dá para trocar em Ajustes).
- O **orçamento** passa a se chamar **plano**. A regra das contas é a mesma da versão 1 em todos os meses: vale o que foi lançado e, numa categoria sem lançamento, o plano (previsto).
- Editar a planilha à mão passa a ser seguro: o app grava operações sobre o que está na planilha e percebe as edições.

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
