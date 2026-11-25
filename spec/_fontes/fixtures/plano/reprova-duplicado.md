# Feature: Campo duplicado
<!-- espera: campo duplicado: escreve -->

> status: rascunho

## Histórias

#### AC-001 — A

## Grafo de execução

```plano
limite: 2
justificativa: o campo duplicado esconde o primeiro valor
parada: parar
motivo_serial: fixture isola o campo duplicado

### T-001 — A [pendente]
- refs: AC-001
- depende: -
- escreve: src/a.ts
- escreve: src/b.ts
- possui: -
- le: -
- contexto: -
- prova: A funciona
- verifica: npm test -- a
- executor: mecanico
```
