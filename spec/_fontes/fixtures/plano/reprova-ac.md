# Feature: AC descoberto
<!-- espera: AC sem tarefa: AC-002 -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 2
justificativa: uma tarefa cobre apenas um dos dois critérios
parada: parar
motivo_serial: só existe uma tarefa

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
```
