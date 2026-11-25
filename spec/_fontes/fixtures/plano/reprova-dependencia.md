# Feature: Dependência inexistente
<!-- espera: dependencia inexistente: T-999 -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 2
justificativa: duas tarefas, uma aponta para id que não existe
parada: parar
motivo_serial: a tarefa T-002 sozinha na onda 1

### T-001 — A [pendente]
- refs: AC-001
- depende: T-999
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
- escreve: src/b.ts
- possui: -
- le: -
- contexto: -
- prova: B funciona
- verifica: npm test -- b
- executor: mecanico
```
