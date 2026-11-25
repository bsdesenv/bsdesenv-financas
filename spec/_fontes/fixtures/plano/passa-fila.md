# Feature: Quatro telas independentes
<!-- espera: 4 tarefas, 1 ondas, onda 1 com 4 (limite 2) -->
<!-- espera: onda 1: T-001 T-002 | T-003 T-004 -->

> status: rascunho

## Histórias

#### AC-001 — Tela A
#### AC-002 — Tela B
#### AC-003 — Tela C
#### AC-004 — Tela D

## Grafo de execução

```plano
limite: 2
justificativa: 2 é o que a revisão absorve; 4 telas independentes formam a onda 1 e rodam em dois lotes

### T-001 — Tela A [pendente]
- refs: AC-001
- depende: -
- escreve: src/telas/a.ts
- possui: -
- le: -
- contexto: src/telas/a.ts
- prova: a tela A abre
- verifica: npm test -- tela-a
- executor: mecanico

### T-002 — Tela B [pendente]
- refs: AC-002
- depende: -
- escreve: src/telas/b.ts
- possui: -
- le: -
- contexto: src/telas/b.ts
- prova: a tela B abre
- verifica: npm test -- tela-b
- executor: mecanico

### T-003 — Tela C [pendente]
- refs: AC-003
- depende: -
- escreve: src/telas/c.ts
- possui: -
- le: -
- contexto: src/telas/c.ts
- prova: a tela C abre
- verifica: npm test -- tela-c
- executor: mecanico

### T-004 — Tela D [pendente]
- refs: AC-004
- depende: -
- escreve: src/telas/d.ts
- possui: -
- le: -
- contexto: src/telas/d.ts
- prova: a tela D abre
- verifica: npm test -- tela-d
- executor: mecanico
```
