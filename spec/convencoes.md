# Convenções: como se escreve código aqui

> COMO codar. O que é proibido está em `regras.md`; o que o sistema é está em `produto.md`.
> Ao criar arquivo novo, procurar o equivalente que já existe e usar como template.

---

## Reuso antes de criar

O projeto tem pouca camada de utilitários compartilhados porque é pequeno, mas ainda assim:

- `src/Codigo.gs` já contém funções de leitura/gravação do modelo (`lerModelo_`, `gravarModelo_`), conversão (`paraCliente_`) e aplicação de operações (`aplicarOp_`).
- `src/App.html` contém os utilitários de front (formatação de moeda, datas, estado da UI).
- `src/Estilos.html` é a única fonte de estilo; não crie CSS inline sem motivo.

**Nunca duplicar:** formatação de moeda/data, validação de ID (`RE_ID`), leitura de config (`lerConfig_`), aplicação de operação.

**Templates de referência:**

- Nova função de API do servidor: `src/Codigo.gs`, padrão `function nomeDoMetodo() { ... }`.
- Nova tela: `src/App.html`, seguindo a estrutura de seção + roteador interno.
- Novo teste de domínio: `testes/dominio.test.mjs`.
- Nova feature com grafo: `spec/_fontes/feature.md`.

---

## Frontend

O front é uma SPA escrita em JavaScript vanilla, servida pelo `HtmlService`. O `Index.html` é o ponto de entrada; `App.html` contém a lógica; `Estilos.html` contém o CSS.

- O HTML usa templates `<template id="...">` e o JS os clona.
- O roteador interno troca seções por `data-route`; não há roteador de URL real.
- Folha aberta no celular trava a rolagem do fundo: enquanto a folha está aberta, `html.com-folha` fica no `<html>` (com `overflow: hidden` até 1023,98 px). Quem abre folha no celular não põe rolagem própria no fundo.
- Impressão: `@media print` em `src/Estilos.html` deixa o Mês em cores claras e esconde menus, avisos, folha e botões. Não há PDF próprio.
- Estado global vive em um objeto curto; persistência vai para o servidor via `google.script.run`.
- Tratamento de erro mostra mensagem na tela; erros de rede/rede do Apps Script devem ser retentados uma vez e, se persistirem, exibidos.

**Regra do framework primeiro:** este projeto não usa framework de componentes. Antes de adicionar uma biblioteca externa, confirme que não dá para fazer com o que já existe e documente o porquê.

---

## Backend

- Funções expostas ao front são declaradas no escopo global de `src/Codigo.gs` (ex.: `carregar`, `sincronizar`).
- Funções privadas terminam com `_` (ex.: `lerModelo_`).
- Constantes globais usam `UPPER_SNAKE_CASE` (ex.: `CABECALHOS`, `MAX_OPS`).
- A validação de formato (tipo, tamanho) vem antes da validação de negócio (revisão desatualizada, categoria inexistente).
- Respostas para o front são JSON stringificado quando necessário; erros lançam `Error` e o front trata.

Formatação:

- Aspas simples em strings e propriedades quando o projeto já as usa.
- Indentação de 2 espaços no `.gs` e no `.html` inline.
- Nomes de função em `camelCase` português (`carregarLancamentos`).
- Id de cartão: `k` + 10 caracteres `[a-z0-9]` (`novoIdCartao`). Id de lançamento de cartão: `k<cartao>_<id>` (`idNoCartao`, lido por `cartaoDoId`). Sem coluna nova (R-004).
- Nomes novos da 3.2.0 seguem `fatura*`, `mesDaFatura`, `idNoCartao`, `cartaoDoId`, `lancamentosDoCartao`, `limiteUsado`, `sinaisDaPlanilha`, `novoIdCartao`, `abrirCadastroCartao`, `abrirFatura`, `blocoFaturas`, `htmlCartoesCredito`, `abrirDiagnosticos`, `textoDiagnostico`. O prefixo `cartao*` já é de UI.
- Modo `node testes/e2e.mjs --capturas` grava PNG de 320, 390 e 1440 px (claro e escuro) em `testes/saida/capturas`.
- No `e2e.mjs`, toda página aberta dentro de um `caso` fecha ao fim dele, com o contexto próprio. Página que atravessa casos (`cel`, `pc`) abre com `{ manter: true }`. Página esquecida aberta deixa os cenários seguintes lentos e instáveis. A falha mostra a linha (`e2e.mjs:N`).
- Foco visível em todo controle. Campo sem borda dentro de uma caixa (lançamento rápido) desenha o anel na caixa, com `:has(input:focus-visible)`, no padrão do `.chip-cartao`.

---

## Comentários

Idioma, tamanho e o que merece comentário: a regra de negócio e a decisão não óbvia, nunca o óbvio.

Um comentário descreve o estado do código quando foi escrito, não é garantia atual. Antes de usar uma premissa vinda de comentário para decidir um gate, conferir no código.

**Sete critérios, verificados por `sh spec/_fontes/verificar-comentarios.sh`.**

| Sai | Fica |
|---|---|
| Docblock de função acima de **8 linhas de prosa** | O porquê da função existir e o ponteiro para `docs/ARQUITETURA.md` |
| Título `##`, tabela markdown, lista de seções | Prosa corrida, curta |
| Histórico: *"até tal data era assim"* | O porquê do código de **agora** |
| Id de tarefa ou de lacuna no comentário | Nada — o id sobrevive ao arquivo, o plano se acha por busca |
| Comentário vazio como separador | Nada |
| Comentário de linha acima de 3 linhas | A frase que explica a linha abaixo |
| Docblock que repete a assinatura | Nada — os tipos já estão na documentação |

**O texto longo não se apaga: move.** Vai para `docs/ARQUITETURA.md`, onde `verificar-documentacao.sh` sabe dizer quando envelheceu.

A regra é **transversal**: arquivo que uma tarefa abre sai higienizado, e nenhum arquivo é aberto só para isso.

**Régua nova nasce com fixture nos dois sentidos.** É a regra da trava com teste aplicada aos verificadores estáticos, e o motivo está medido: os dois primeiros nasceram sem fixture e precisaram de **quatro** correções no mesmo dia, todas achadas rodando contra código de produção. Nenhuma chegou a produção, e as quatro custaram uma rodada de investigação cada. `sh spec/_fontes/verificar.test.sh` roda as fixtures de `spec/_fontes/fixtures/`, nomeadas `reprova-*` e `passa-*`.

**Código morto:** nunca apagar direto, e só comentar mediante autorização explícita. Autorizado, comentar o bloco inteiro com um marcador padronizado, e aplicar em toda a cadeia, nunca só um lado.

---

## Antes de adicionar checagem defensiva

Antes de gatear um método ou desabilitar um controle, confirmar que o caminho tem consumidor real e que a checagem pode de fato falhar dado o modelo de dados. Sem consumidor e sem caminho de dado que dispare a negação, documentar a garantia em vez de duplicá-la.

---

## Reescrever algo que já está em produção

Construir o novo em paralelo, sem tocar no atual. Só quando estiver bom, repontar o caminho de entrada e aposentar o antigo numa fase de limpeza. Rollback é não repontar.

---

## Verificação depois de mexer

**Rodar só a camada que o diff tocou.** Diff de front (HTML/JS/CSS) não dispara a suíte do servidor; diff de backend (`src/Codigo.gs`) roda os testes de servidor/dominio; diff de ambas roda ambos.

| Camada | Comando obrigatório |
|---|---|
| Servidor / domínio | `npm test` (filtrado quando possível) |
| Fluxo de tela (e2e) | `npm run test:e2e` |
| Fim de toda tarefa | `sh spec/_fontes/verificar-entrega.sh`: encadeia lint, formatador, inventário e documentação, imprimindo só o que falhar; os testes (`npm test`, `npm run test:e2e`) rodam à parte |

Ao debugar bug reportado, checar o console do navegador **primeiro**, antes de assumir causa.

---

## Documentação: o que muda junto com o código

O projeto mantém documentação pública em `docs/`:

| Arquivo | Para quem | Onde aparece |
|---|---|---|
| `docs/ARQUITETURA.md` | quem desenvolve | só no repositório |
| `docs/USAR.md` | quem usa o sistema | só no repositório (não há ajuda em tela hoje) |
| `docs/INSTALAR.md` | quem instala | só no repositório |
| `docs/SEGURANCA.md` | quem quer entender permissões | só no repositório |
| `docs/ATUALIZAR.md` | quem atualiza de versão | só no repositório |

A `spec/` diz o que o sistema é e o que é proibido; a `docs/ARQUITETURA.md` **explica** como funciona. Em divergência, o código e a spec vencem.

### O gatilho: que mudança obriga qual doc

| Mudou no diff | Obriga, no mesmo commit |
|---|---|
| Tela nova, ou rótulo de botão, campo ou aba | `docs/USAR.md` e `docs/ARQUITETURA.md`, seção correspondente |
| Entidade, serviço ou regra de sincronização nova | `docs/ARQUITETURA.md` |
| Feature marcada `status: implementada` em `spec/features/` | `docs/ARQUITETURA.md` e `docs/USAR.md` |

### `cobre:` — como a doc sabe que envelheceu

Cada arquivo de documentação declara os caminhos de código que documenta. Em `docs/*.md`, a primeira linha contém:

```text
<!-- cobre: <caminho>/**, <caminho>/<arquivo> -->
```

`spec/_fontes/verificar-documentacao.sh` compara a data do último commit em `cobre:` com a data do arquivo de doc. Código mais novo que a doc que o cobre é falha.

A saída com motivo, `Doc-OK`. Mudança que não torna o capítulo falsa (tirar um comentário, apagar função que ele não cita) pode ser escapada com `Doc-OK: <motivo>` na mensagem de commit.

### Regras de escrita

- **Citar caminho e símbolo, nunca linha**: `lerModelo_()`, não `Codigo.gs:66`.
- **Número em prosa só existe na forma que `verificar-documentacao.sh` lê**: `<N> <rótulo>` (ex.: `<N> funções de API`, `<N> telas`).

---

## Quando a tarefa exige teste

Critério objetivo:

- **(a)** a tarefa cria ou altera função que decide a partir dos argumentos, sem tocar em planilha real, rede ou sessão; ou
- **(b)** a tarefa altera lógica de sincronização, formato de operação ou validação de dados.

Tarefa de tela pura (layout, texto, CSS) não exige novo teste automatizado, mas exige `npm run test:e2e` verde se tocar fluxo de navegação.

**Regras dos testes:**

1. Testes de domínio usam dados criados por eles (fixtures em `testes/`); nunca linha preexistente de planilha real.
2. Nunca contagem absoluta de dados.
3. Mocks de planilha (`testes/gas-mock.mjs`, `testes/instalador-mock.mjs`) isolam o teste.

---

## Plano, parecer e destino de arquivo novo

Estilo de plano, os dois artefatos (`docs/plans/` contra `spec/features/`) e a tabela de onde vai cada arquivo novo: **`spec/convencoes-processo.md`**, que é a dona do critério. Lido na fase de plano, não na de código.
