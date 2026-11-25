# Feature: Dependência sem justificativa
<!-- espera: T-002: depende de T-001 sem contrato ou arquivo -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 4
justificativa: há largura para as duas, mas uma foi presa sem motivo
parada: parar
motivo_serial: fixture isola a dependencia sem contrato

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
