# Feature: Retomada no meio da onda 2
<!-- espera: onda 1: T-001 T-002 -->
<!-- espera: onda 2: T-003 T-004 | T-005 -->
<!-- espera: retomar na onda 2: T-004(em-andamento) T-003 | T-005 -->

> status: em-implementacao

## Histórias

#### AC-001 — Contrato
#### AC-002 — Tela
#### AC-003 — Consumidores

## Grafo de execução

```plano
limite: 2
justificativa: 2 é o que a revisão absorve; três consumidores do contrato formam a onda 2 em dois lotes
parada: onda vermelha para a fila

### T-001 — Contrato [concluida]
- refs: AC-001
- depende: -
- escreve: src/x.ts
- possui: ContratoX
- le: -
- contexto: -
- prova: Contrato aparece
- verifica: npm test -- x
- executor: mecanico

### T-002 — Tela [concluida]
- refs: AC-002
- depende: -
- escreve: src/tela.ts
- possui: -
- le: -
- contexto: -
- prova: Tela aparece
- verifica: npm test -- tela
- executor: sessão

### T-003 — Consumidor A [pendente]
- refs: AC-003
- depende: T-001
- escreve: src/a.ts
- possui: -
- le: ContratoX
- contexto: src/x.ts
- prova: Consumidor A aparece
- verifica: npm test -- a
- executor: pleno
- decidir: o mapeamento do contrato para o consumidor A

### T-004 — Consumidor B [em-andamento]
- refs: AC-003
- depende: T-001
- escreve: src/b.ts
- possui: -
- le: ContratoX
- contexto: src/x.ts
- prova: Consumidor B aparece
- verifica: npm test -- b
- executor: pleno
- decidir: o mapeamento do contrato para o consumidor B

### T-005 — Consumidor C [pendente]
- refs: AC-003
- depende: T-001
- escreve: src/c.ts
- possui: -
- le: ContratoX
- contexto: src/x.ts
- prova: Consumidor C aparece
- verifica: npm test -- c
- executor: pleno
- decidir: o mapeamento do contrato para o consumidor C
```
