# Feature: Ciclo
<!-- espera: ciclo envolvendo T-001 -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 2
justificativa: duas tarefas em ciclo de propósito
parada: parar
motivo_serial: o ciclo deixa a onda 1 vazia

### T-001 — A [pendente]
- refs: AC-001
- depende: T-002
- escreve: src/a.ts
- possui: -
- le: -
- contexto: -
- prova: A funciona
- verifica: npm test -- a
- executor: mecanico

### T-002 — B [pendente]
- refs: AC-002
- depende: T-001
- escreve: src/b.ts
- possui: -
- le: -
- contexto: -
- prova: B funciona
- verifica: npm test -- b
- executor: mecanico
```
