# Feature: Cadeia sem motivo
<!-- espera: onda 1 com uma tarefa sem motivo_serial -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 4
justificativa: a cadeia existe, mas o motivo não foi declarado
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
- depende: T-001
- escreve: src/b.ts
- possui: -
- le: -
- contexto: -
- prova: B funciona
- verifica: npm test -- b
- executor: mecanico
```
