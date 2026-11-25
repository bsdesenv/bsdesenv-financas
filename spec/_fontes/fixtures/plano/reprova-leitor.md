# Feature: Executor que só lê
<!-- espera: T-001: executor navegador so le -->
<!-- espera: T-002: executor levantamento so le -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 2
justificativa: duas tarefas entregues a agentes que não escrevem
parada: parar

### T-001 — Roteiro de tela [pendente]
- refs: AC-001
- depende: -
- escreve: src/a.ts
- possui: -
- le: -
- contexto: -
- prova: Roteiro de tela aparece
- verifica: npm test -- a
- executor: navegador

### T-002 — Levantamento [pendente]
- refs: AC-002
- depende: -
- escreve: src/b.ts
- possui: -
- le: -
- contexto: -
- prova: Levantamento aparece
- verifica: npm test -- b
- executor: levantamento
```
