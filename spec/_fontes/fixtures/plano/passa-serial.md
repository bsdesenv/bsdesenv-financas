# Feature: Migração de schema
<!-- espera: 2 tarefas, 2 ondas, onda 1 com 1 (limite 4) -->
<!-- espera: onda 2: T-002 -->

> status: rascunho

## Histórias

#### AC-001 — Coluna criada
#### AC-002 — Migration aplicada

## Grafo de execução

```plano
limite: 4
justificativa: 4 é a capacidade, mas a migração não pode começar antes do schema
parada: onda vermelha para a fila; schema mudou e replaneja
motivo_serial: o schema precisa existir antes da migration, então a onda 1 tem uma tarefa

### T-001 — Congelar schema [pendente]
- refs: AC-001
- depende: -
- escreve: db/schema.sql
- possui: SchemaPedido
- le: -
- contexto: db/schema.sql
- prova: a coluna existe no schema
- verifica: sh db/check-schema.sh
- executor: mecanico

### T-002 — Escrever migration [pendente]
- refs: AC-002
- depende: T-001
- escreve: db/migrations/001-pedido.sql
- possui: -
- le: SchemaPedido
- contexto: db/schema.sql, db/migrations/001-pedido.sql
- prova: a migration aplica e reverte
- verifica: sh db/test-migration.sh
- executor: pleno
- decidir: o backfill da coluna em tabela povoada
```
