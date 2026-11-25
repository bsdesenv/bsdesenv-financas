# Feature: Autenticação externa
<!-- espera: onda 1: T-001 T-002 -->

> status: rascunho

## Histórias

#### AC-001 — Sessão carregada
#### AC-002 — Botão desabilitado

## Grafo de execução

```plano
limite: 2
justificativa: duas tarefas independentes; o contrato de autenticação já existe fora do plano
parada: onda vermelha para a fila

### T-001 — Usar sessão externa [pendente]
- refs: AC-001
- depende: -
- escreve: src/auth/use.ts
- possui: -
- le: @ContratoAuth
- contexto: src/auth/use.ts
- prova: a sessão existente é carregada
- verifica: npm test -- sessao
- executor: pleno
- decidir: como reaproveitar a sessão externa sem duplicar o login

### T-002 — Desabilitar botão [pendente]
- refs: AC-002
- depende: -
- escreve: src/ui/botao.ts
- possui: -
- le: -
- contexto: src/ui/botao.ts
- prova: o botão fica desabilitado sem sessão
- verifica: npm test -- botao
- executor: mecanico
```
