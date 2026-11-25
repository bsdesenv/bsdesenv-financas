# Feature: Tarefa sem arquivo
<!-- espera: escreve nao pode ser - -->

> status: rascunho

## Histórias

#### AC-001 — A

## Grafo de execução

```plano
limite: 1
justificativa: uma tarefa só, mas ela não declara arquivo
parada: parar
motivo_serial: só existe uma tarefa

### T-001 — A [pendente]
- refs: AC-001
- depende: -
- escreve: -
- possui: -
- le: -
- contexto: -
- prova: A funciona
- verifica: npm test -- a
- executor: mecanico
```

---
