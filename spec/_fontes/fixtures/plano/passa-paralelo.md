# Feature: Pedido com limite
<!-- espera: 5 tarefas, 3 ondas, onda 1 com 3 (limite 3) -->
<!-- espera: onda 1: T-001 T-002 T-003 -->
<!-- espera: onda 2: T-004 -->
<!-- espera: onda 3: T-005 -->

> status: rascunho

## Histórias

### US-001 — Criar pedido

#### AC-001 — Contrato aceita o pedido

- **Dado** um pedido válido
- **Quando** o pedido é criado
- **Então** o contrato é aceito

#### AC-002 — Limite por janela

- **Dado** 100 pedidos na janela
- **Quando** chega o 101º
- **Então** a resposta é 429

#### AC-003 — Aviso na tela

- **Dado** o limite atingido
- **Quando** a tela abre
- **Então** o aviso aparece

#### AC-004 — Relatório do pedido

- **Dado** um pedido criado
- **Quando** o relatório é aberto
- **Então** o pedido aparece

## Grafo de execução

```plano
limite: 3
justificativa: 3 é a capacidade de revisão da onda; 3 tarefas independentes e 2 presas ao contrato
parada: onda vermelha para a fila; contrato muda e replaneja; 2 tentativas por tarefa

### T-001 — Congelar contrato [pendente]
- refs: AC-001
- depende: -
- escreve: src/types/pedido.ts
- possui: ContratoPedido
- le: -
- contexto: src/types/pedido.ts
- prova: npx tsc --noEmit sai 0
- verifica: npx tsc --noEmit
- executor: mecanico

### T-002 — Implementar limite [pendente]
- refs: AC-002
- depende: -
- escreve: src/pedidos/limite.ts
- possui: -
- le: -
- contexto: src/pedidos/limite.ts
- prova: o 101º pedido da janela recebe 429
- verifica: npm test -- limite
- executor: pleno
- decidir: a janela do limite e onde guardar o contador

### T-003 — Implementar aviso [pendente]
- refs: AC-003
- depende: -
- escreve: src/ui/aviso.ts
- possui: -
- le: -
- contexto: src/ui/aviso.ts
- prova: a tela mostra o aviso com o limite atingido
- verifica: npm test -- aviso
- executor: mecanico

### T-004 — Criar pedido [pendente]
- refs: AC-001, AC-004
- depende: T-001
- escreve: src/pedidos/criar.ts, src/pedidos/criar.test.ts
- possui: -
- le: ContratoPedido
- contexto: src/types/pedido.ts, src/pedidos/criar.ts
- prova: o pedido criado aparece no relatório
- verifica: npm test -- criar
- executor: pleno
- decidir: a validação do pedido contra o contrato novo

### T-005 — Relatório [pendente]
- refs: AC-004
- depende: T-004
- escreve: src/pedidos/relatorio.ts
- possui: -
- le: -
- contexto: src/pedidos/relatorio.ts
- prova: o relatório lista o pedido criado
- verifica: npm test -- relatorio
- motivo_depende: o relatório só prova depois que T-004 cria o dado
- executor: mecanico
```
