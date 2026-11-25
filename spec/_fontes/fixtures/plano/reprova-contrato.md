# Feature: Dois donos
<!-- espera: contrato ContratoX ja tem dono em T-001 -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 2
justificativa: duas tarefas independentes disputando o mesmo contrato
parada: parar

### T-001 — A [pendente]
- refs: AC-001
- depende: -
- escreve: src/a.ts
- possui: ContratoX
- le: -
- contexto: -
- prova: A funciona
- verifica: npm test -- a
- executor: mecanico

### T-002 — B [pendente]
- refs: AC-002
- depende: -
- escreve: src/b.ts
- possui: ContratoX
- le: -
- contexto: -
- prova: B funciona
- verifica: npm test -- b
- executor: mecanico
```
