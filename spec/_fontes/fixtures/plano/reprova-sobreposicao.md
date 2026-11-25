# Feature: Mesmo arquivo
<!-- espera: T-001 e T-002 escrevem src/a.ts sem dependencia -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 2
justificativa: duas tarefas independentes que escrevem o mesmo arquivo
parada: parar

### T-001 — A [pendente]
- refs: AC-001
- depende: -
- escreve: src/a.ts
- possui: -
- le: -
- contexto: -
- prova: A funciona
- verifica: npm test -- a
- executor: mecanico

### T-002 — B [pendente]
- refs: AC-002
- depende: -
- escreve: src/a.ts
- possui: -
- le: -
- contexto: -
- prova: B funciona
- verifica: npm test -- b
- executor: mecanico
```
