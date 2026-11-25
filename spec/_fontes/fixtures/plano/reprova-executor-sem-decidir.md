# Feature: Executor acima do mecânico sem decisão
<!-- espera: T-001: executor pleno sem decidir -->
<!-- espera: T-002: executor sessão sem decidir -->
<!-- espera: T-003: decidir sem decisao -->
<!-- espera: T-004: decidir com placeholder -->
<!-- espera: plano vermelho: 4 falha(s) -->

> status: em-implementacao

## Histórias

### US-001 — Exportar pedidos

#### AC-001 — Exportação em CSV

- **Dado** pedidos na lista
- **Quando** o usuário exporta
- **Então** o arquivo CSV traz os pedidos

## Grafo de execução

```plano
limite: 6
justificativa: 6 tarefas independentes, cada uma num arquivo; a revisão absorve a onda inteira

### T-001 — Botão de exportar [pendente]
- refs: AC-001
- depende: -
- escreve: src/ui/exportar.ts
- possui: -
- le: -
- contexto: -
- prova: o botão aparece na lista
- verifica: npm test -- exportar
- executor: pleno

### T-002 — Rota de exportação [em-andamento]
- refs: AC-001
- depende: -
- escreve: src/rotas/exportar.ts
- possui: -
- le: -
- contexto: -
- prova: a rota responde 200
- verifica: npm test -- rota-exportar
- executor: sessão

### T-003 — Cabeçalho do CSV [pendente]
- refs: AC-001
- depende: -
- escreve: src/csv/cabecalho.ts
- possui: -
- le: -
- contexto: -
- prova: o cabeçalho traz as colunas da lista
- verifica: npm test -- cabecalho
- executor: pleno
- decidir: nada, o diff está no plano

### T-004 — Formato da data [pendente]
- refs: AC-001
- depende: -
- escreve: src/csv/data.ts
- possui: -
- le: -
- contexto: -
- prova: a data sai em ISO 8601
- verifica: npm test -- data
- executor: pleno
- decidir: <o que fica para o pleno>

### T-005 — Encoding do arquivo [concluida]
- refs: AC-001
- depende: -
- escreve: src/csv/encoding.ts
- possui: -
- le: -
- contexto: -
- prova: o arquivo abre com acento no Excel
- verifica: npm test -- encoding
- executor: pleno

### T-006 — Separador por locale [pendente]
- refs: AC-001
- depende: -
- escreve: src/csv/separador.ts
- possui: -
- le: -
- contexto: -
- prova: o separador é ponto e vírgula em pt-BR
- verifica: npm test -- separador
- executor: pleno
- decidir: como detectar o locale sem depender do navegador
```
