# Feature: Leitura do que a vizinha escreve
<!-- espera: T-002: le src/a.ts no contexto, e T-001 escreve isso na mesma onda -->

> status: rascunho

## Histórias

#### AC-001 — A
#### AC-002 — B

## Grafo de execução

```plano
limite: 2
justificativa: duas tarefas na mesma onda, uma lendo o arquivo da outra

### T-001 — A [pendente]
- refs: AC-001
- depende: -
- escreve: src/a.ts
- possui: -
- le: -
- contexto: -
- prova: A aparece
- verifica: npm test -- a
- executor: mecanico

### T-002 — B [pendente]
- refs: AC-002
- depende: -
- escreve: src/b.ts
- possui: -
- le: -
- contexto: src/a.ts#formato
- prova: B segue o formato de A
- verifica: npm test -- b
- executor: mecanico
```
