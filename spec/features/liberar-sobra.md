# Feature: Liberar a sobra de um plano

> status: implementada
> Origem: `docs/plans/261126-liberar-sobra-do-plano.md`

## Contexto

Quando uma despesa fecha abaixo do plano, a sobra continua reservada até a categoria ser encerrada no mês. No celular, ninguém acha essa ação. Ela só existe dentro da folha da categoria, tem quatro nomes diferentes, e a folha "Como o disponível é calculado" manda tocar em itens que não respondem ao toque.

## Fora de escopo

- Gesto de deslizar ou pressão longa.
- Mudança na regra do disponível ou na marca `encerrada:AAAA-MM:<id>`. Dado e servidor não mudam.
- O fechamento do mês, que continua com "Não aconteceu".
- O cartão "Plano do mês", que continua só com "Restam R$ X".
- Renda: "Não vem mais" fica como está.

---

## Histórias

### US-008 — Liberar a sobra onde ela aparece

Como quem acompanha o mês pelo celular, quero liberar o que sobrou de um plano direto na lista de reservas, para que o disponível mostre o que de fato posso gastar.

#### AC-015 — Liberar uma categoria pela composição

- **Dado** o mês atual com Mercado planejado em R$ 300 e R$ 100 lançados
- **Quando** abro "Ver composição" e toco em **Liberar** na linha do Mercado, em "Ainda nos planos"
- **Então** o disponível sobe R$ 200 e o aviso diz que o plano fechou em R$ 100
- **E** o **Desfazer** do aviso devolve o disponível ao valor anterior

#### AC-016 — Liberar todos os planos

- **Dado** duas categorias variáveis com sobra em "Ainda nos planos"
- **Quando** toco em **Liberar todos**
- **Então** o bloco "Ainda nos planos" some, o disponível sobe a soma das sobras, e um único **Desfazer** devolve as duas

#### AC-017 — A linha da composição abre a categoria

- **Dado** a folha "Como o disponível é calculado" aberta
- **Quando** toco no nome de uma categoria, fora do botão Liberar
- **Então** abre a folha daquela categoria

#### AC-018 — Aviso "Revisar sobras" no fim do mês

- **Dado** hoje é 25/11 e há plano reservado
- **Quando** abro o Início
- **Então** o quadro do disponível mostra "Revisar sobras", e o botão abre a composição em "Ainda nos planos"
- **E** em 18/11 o aviso não aparece

#### AC-019 — Um verbo só nas despesas

- **Dado** uma conta fixa ou uma categoria variável com sobra
- **Quando** abro a categoria ou o cartão "O que falta pagar"
- **Então** a ação se chama **Liberar** (na folha, "Liberar R$ X"), e o desfazer se chama **Voltar a reservar**

#### AC-020 — No celular, a folha da categoria não abre o teclado

- **Dado** a tela de 390 px com toque
- **Quando** abro a folha de uma categoria
- **Então** o foco não está no campo Valor

---

## Notas técnicas

- Só o front muda: `src/App.html`, `src/Estilos.html`.
- `encerrarCategoria` (`src/App.html:3362`) continua gravando a marca `encerrada:`. "Liberar todos" grava uma marca por categoria e um único aviso cujo Desfazer apaga todas.
- A folha de composição (`abrirDetalheReserva`, `src/App.html:3376`) passa a pintar por `this.atualizar`, como `abrirCategoria` (`:3198`), porque `render()` (`:1287`) só repinta folhas que expõem `atualizar`.
- R-004 preservada: nenhum formato de dado muda.

**Contrato da tela (`ContratoLiberar`)**

- Linha da composição: `.reserva-linha`, com `button.reserva-abrir[data-f="abrir"][data-cat]` e, nos blocos "Contas a pagar" e "Ainda nos planos", `button[data-f="liberar"][data-cat]` com o texto `Liberar`.
- Bloco "Ainda nos planos": `section#reserva-planos`; `button[data-f="liberar-todos"]` quando há 2 ou mais categorias.
- Herói: `button[data-acao="revisar-sobras"]` com o texto `Revisar sobras`.
- Folha da categoria: `[data-f="encerrar"]` com o texto `Liberar R$ X` nas despesas; `[data-f="reabrir"]` com o texto `Voltar a reservar` nas despesas.

---

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-006 | O aviso aparece quando faltam de 1 a 7 dias para o fim do mês e há reserva em contas ou planos | confirmada | Plano aprovado pelo usuário ("execute", 26/11/2026) |
| ASM-007 | "Liberar todos" não pede confirmação: o Desfazer de 10 s basta | confirmada | Plano aprovado pelo usuário ("execute", 26/11/2026) |
| ASM-008 | Tirar o autofoco só com `pointer: coarse` não atrapalha quem lança pela folha da categoria | confirmada | Plano aprovado pelo usuário ("execute", 26/11/2026) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| QF-001 | Trocar "Quitar" por "Liberar" também no cartão "O que falta pagar"? | respondida | Sim, um verbo só (o usuário aprovou a execução sem objetar, 26/11/2026) |

---

## Grafo de execução

```plano
limite: 2
justificativa: 3 tarefas; o gargalo é o src/App.html, que só uma tarefa escreve; docs correm ao lado

### T-006 — Liberar na composição, verbo único, aviso e autofoco [concluida]
- refs: US-008, AC-015, AC-016, AC-017, AC-018, AC-019, AC-020
- depende: -
- escreve: src/App.html, src/Estilos.html
- possui: ContratoLiberar
- le: -
- contexto: docs/plans/261126-liberar-sobra-do-plano.md
- prova: a 390 px, a composição mostra Liberar em cada linha de "Ainda nos planos" e o herói mostra "Revisar sobras" em 25/11
- verifica: npm test
- executor: mecanico

### T-007 — Casos e2e do Liberar [concluida]
- refs: AC-015, AC-016, AC-017, AC-018, AC-019, AC-020
- depende: T-006
- escreve: testes/e2e.mjs
- possui: -
- le: ContratoLiberar
- contexto: spec/features/liberar-sobra.md
- prova: os casos novos e os de quitar e encerrar passam
- verifica: CHROME_PATH=/usr/bin/google-chrome E2E_SO="Liberar" node testes/e2e.mjs
- executor: mecanico

### T-008 — Docs e glossário com o verbo Liberar [concluida]
- refs: AC-019
- depende: -
- escreve: docs/USAR.md, docs/ARQUITETURA.md, spec/glossario.md
- possui: -
- le: -
- contexto: -
- prova: USAR.md ensina Liberar e o aviso Revisar sobras; o glossário define liberar
- verifica: sh spec/_fontes/verificar-documentacao.sh
- executor: sessao
- decidir: a redação dos trechos de docs
```
