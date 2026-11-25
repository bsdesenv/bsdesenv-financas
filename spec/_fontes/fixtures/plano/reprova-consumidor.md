# Feature: Consumidor antes do dono
<!-- espera: le ContratoX antes do dono T-001 -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 2
justificativa: duas tarefas independentes, mas uma lê contrato da outra
parada: parar

### T-001 — Dono [pendente]
- refs: AC-001
- depende: -
- escreve: src/x.ts
- possui: ContratoX
- le: -
- contexto: -
- prova: o contrato existe
- verifica: npm test -- x
- executor: mecanico

### T-002 — Consumidor [pendente]
- refs: AC-002
- depende: -
- escreve: src/y.ts
- possui: -
- le: ContratoX
- contexto: src/x.ts
- prova: o consumidor usa o contrato
- verifica: npm test -- y
- executor: mecanico
```
