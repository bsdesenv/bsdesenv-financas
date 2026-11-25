# Feature: contrato externo em tarefa que depende por motivo
<!-- espera: plano ok: passa-externo-com-motivo.md: 2 tarefas, 2 ondas -->

> status: rascunho

## Histórias

#### AC-001 — A

#### AC-002 — B

## Grafo de execução

```plano
limite: 1
justificativa: B só roda depois da aprovação que A registra, sem arquivo em comum
motivo_serial: B espera a aprovação de A

### T-001 — A [pendente]
- refs: AC-001
- depende: -
- escreve: docs/a.md
- possui: -
- le: -
- contexto: -
- prova: A registrada
- verifica: npm test -- a
- executor: mecanico

### T-002 — B [pendente]
- refs: AC-002
- depende: T-001
- motivo_depende: a aprovação de A vem antes do código de B
- escreve: src/b.ts
- possui: -
- le: @Externo
- contexto: -
- prova: B funciona
- verifica: npm test -- b
- executor: mecanico
```
