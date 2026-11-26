# Feature: Fechar o mês de uma vez

> status: implementada
> Origem: `docs/plans/261126-fechar-mes-de-uma-vez.md`

## Contexto

No fechamento de um mês que já passou, cada pendência pede um toque ("Foi pago", "Não aconteceu" ou "Depois"). O único lote é o das contas automáticas. A frase da folha não diz que plano com gasto já fecha no que foi gasto, e por isso parece que é preciso liberar categoria por categoria.

## Fora de escopo

- Fechar o mês corrente antes de ele acabar.
- A regra das pendências em `resumo()`, a sobra realizada, a marca `encerrada:` e o lote das automáticas.
- Servidor e formato de dados (R-004).

---

## Histórias

### US-009 — Fechar o mês sem responder pendência por pendência

Como quem fecha o mês pelo celular, quero dizer de uma vez que o resto das pendências não aconteceu, para fechar o mês em poucos toques.

#### AC-021 — Não aconteceu em todas

- **Dado** outubro com 3 pendências sem débito automático
- **Quando** abro "Fechar outubro" e toco em **Não aconteceu em todas (3)**
- **Então** a lista fica vazia, o botão Fechar habilita e a sobra realizada não muda
- **E** o **Desfazer** do aviso devolve as 3 pendências

#### AC-022 — As automáticas ficam de fora

- **Dado** 2 contas com débito automático e 2 pendências manuais
- **Quando** abro o fechamento
- **Então** vejo **Confirmar todas as automáticas (2)** e **Não aconteceu nas demais (2)**
- **E** tocar no segundo deixa na lista só as 2 automáticas

#### AC-023 — O que foi adiado fica de fora, e uma pendência só não mostra o lote

- **Dado** 3 pendências manuais, uma delas adiada com **Depois**
- **Quando** olho o lote
- **Então** o botão diz **(2)**, e depois do lote a adiada volta com "Mostrar de novo"
- **E** com uma pendência só, o lote não aparece

#### AC-024 — A folha explica que plano com gasto já fecha

- **Dado** a folha de fechamento aberta
- **Então** a frase diz: "Aqui ficam as contas que faltam pagar e os planos sem nenhum lançamento. Plano com gasto já fecha no que você gastou."

---

## Notas técnicas

- Só o front muda: `abrirFechamento` (`src/App.html:3290`).
- Reuso: o lote copia o padrão de `liberar-todos` em `abrirDetalheReserva` (`src/App.html:3439-3447`), que grava uma marca `encerrada:` por categoria e mostra um aviso só, cujo Desfazer apaga todas. O alvo e o rótulo seguem o `todas-auto` (`:3308-3310`).
- R-004 preservada.

**Contrato da tela (`ContratoFecharLote`)**

- Folha de fechamento: `button[data-f="nao-todas"]` no mesmo `div.acoes` de `[data-f="todas-auto"]`, depois dele. O texto é `Não aconteceu em todas (N)` quando não há automática visível, ou `Não aconteceu nas demais (N)` quando há.
- Alvos: as pendências visíveis (fora das `adiadas`) com `it.renda || !soAutomaticas(it.c.id, ano, mes)`. O botão aparece quando há 2 alvos ou mais.
- Primeiro `p.sub` da folha: `Aqui ficam as contas que faltam pagar e os planos sem nenhum lançamento. Plano com gasto já fecha no que você gastou.`

---

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-009 | O lote não pede confirmação: o Desfazer de 10 s basta, e num mês passado o "Não aconteceu" não muda a sobra realizada | confirmada | Plano aprovado pelo usuário ("execute", 26/11/2026) |
| ASM-010 | Conta com débito automático fica fora do lote "Não aconteceu", porque se presume paga | confirmada | Plano aprovado pelo usuário ("execute", 26/11/2026) |
| ASM-011 | Pendência adiada com Depois fica fora do lote | confirmada | Plano aprovado pelo usuário ("execute", 26/11/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

---

## Grafo de execução

```plano
limite: 2
justificativa: 3 tarefas; o src/App.html tem um dono só; docs correm ao lado

### T-009 — Lote "Não aconteceu" e frase da folha de fechamento [concluida]
- refs: US-009, AC-021, AC-022, AC-023, AC-024
- depende: -
- escreve: src/App.html, src/Estilos.html
- possui: ContratoFecharLote
- le: -
- contexto: docs/plans/261126-fechar-mes-de-uma-vez.md
- prova: a 390 px, a folha de fechamento mostra os dois botões de lote sem estourar a largura, e o Desfazer devolve as pendências
- verifica: npm test
- executor: mecanico

### T-010 — Casos e2e do lote no fechamento [concluida]
- refs: AC-021, AC-022, AC-023, AC-024
- depende: T-009
- escreve: testes/e2e.mjs
- possui: -
- le: ContratoFecharLote
- contexto: spec/features/fechar-mes-de-uma-vez.md
- prova: os casos novos e os de fechamento que já existem passam
- verifica: CHROME_PATH=/usr/bin/google-chrome E2E_SO="fechamento" node testes/e2e.mjs
- executor: mecanico

### T-011 — USAR.md e ARQUITETURA.md com o lote [concluida]
- refs: AC-021
- depende: -
- escreve: docs/USAR.md, docs/ARQUITETURA.md
- possui: -
- le: -
- contexto: docs/plans/261126-fechar-mes-de-uma-vez.md
- prova: a seção "Fechar o mês" ensina o lote e diz que plano com gasto já fecha no gasto
- verifica: sh spec/_fontes/verificar-documentacao.sh
- executor: mecanico
```
