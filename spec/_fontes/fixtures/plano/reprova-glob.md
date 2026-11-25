# Feature: Glob
<!-- espera: escreve com glob: src/*.ts -->

> status: rascunho

## Histórias

#### AC-001 — A

## Grafo de execução

```plano
limite: 2
justificativa: a tarefa declara glob em vez de arquivos exatos
parada: parar
motivo_serial: só existe uma tarefa

### T-001 — A [pendente]
- refs: AC-001
- depende: -
- escreve: src/*.ts
- possui: -
- le: -
- contexto: -
- prova: A funciona
- verifica: npm test -- a
- executor: mecanico
```
