# Feature: Ajustes organizados e categorias em lista de leitura

> status: implementada
> Plano: [docs/plans/261126-ajustes-categorias.md](../../docs/plans/261126-ajustes-categorias.md)

## Contexto

Na v3.2.0 a seção Categorias de Ajustes mostra, em toda linha, setas, campo de nome, seletor de grupo, contagem e lixeira, quebrados em duas linhas no celular. A tela fica poluída, o motivo de não poder apagar só aparece no `title` e as demais seções de Ajustes ficam soterradas.

## Fora de escopo

- Servidor, formato das abas e regras de categoria (sobra, economia, troca renda↔gasto): nada de dado muda.
- Arrastar entre grupos: trocar de grupo continua sendo pela edição.
- Cartões, Seus dados, Atualizações e Diagnósticos mudam só de lugar, não de conteúdo.

---

## Histórias

### US-001 — Ver as categorias sem poluição

Como dono do controle, quero ver as categorias numa lista limpa, para achar e entender cada uma de relance.

#### AC-001 — Uma linha por categoria

- **Dado** Ajustes › Categorias aberto
- **Quando** a lista aparece
- **Então** cada categoria é uma linha só, com bolinha da cor dela, nome, quantidade de lançamentos e seta
- **E** não há campo de texto, seletor nem lixeira na lista

#### AC-002 — Selos de papel especial

- **Dado** a categoria de economia e a categoria da sobra
- **Quando** a lista aparece
- **Então** elas mostram o selo "Economia" e "Sobra"

#### AC-003 — Grupos com contagem

- **Dado** categorias em Fixos, Variáveis e Rendas
- **Quando** a lista aparece
- **Então** cada grupo tem cabeçalho com o nome e a quantidade de categorias

### US-002 — Editar uma categoria

Como dono do controle, quero tocar numa categoria e editá-la num painel, para mudar nome e grupo sem errar o toque.

#### AC-004 — Painel de edição

- **Dado** a lista de categorias
- **Quando** toco numa categoria
- **Então** abre um painel com o nome editável, o grupo em botões lado a lado e "Apagar categoria"

#### AC-005 — Motivo de não apagar visível

- **Dado** uma categoria com lançamentos, de economia ou da sobra
- **Quando** abro o painel dela
- **Então** "Apagar categoria" fica desativado e o motivo aparece em texto abaixo

#### AC-006 — Regras de grupo mantidas

- **Dado** uma categoria com lançamentos em Fixos
- **Quando** escolho Rendas no painel
- **Então** a troca é recusada com o mesmo aviso de hoje e o botão volta para Fixos

### US-003 — Criar categoria no grupo certo

#### AC-007 — Nova no grupo

- **Dado** a lista de categorias
- **Quando** toco "+ Nova em Variáveis"
- **Então** abre o painel de criação com Variáveis já escolhido
- **E** ao confirmar, a categoria aparece no fim de Variáveis

### US-004 — Ordenar sem setas permanentes

#### AC-008 — Modo Ordenar

- **Dado** a lista de categorias
- **Quando** toco "Ordenar"
- **Então** cada linha mostra subir, descer e uma alça de arrastar, e o botão vira "Concluir"

#### AC-009 — Arrastar pela alça

- **Dado** o modo Ordenar
- **Quando** arrasto uma categoria pela alça dentro do grupo e solto
- **Então** ela fica na nova posição e a ordem vale nas outras telas

#### AC-010 — Esc cancela o arraste

- **Dado** um arraste em andamento
- **Quando** aperto Esc
- **Então** a categoria volta à posição original

### US-005 — Ajustes em índice

#### AC-011 — Celular

- **Dado** Ajustes aberto numa tela estreita
- **Quando** a tela aparece
- **Então** vejo o índice (Geral, Categorias, Cartões, Seus dados, Atualizações, Diagnósticos) e cada item abre a sua seção com botão de voltar

#### AC-012 — PC

- **Dado** Ajustes aberto numa tela larga
- **Quando** a tela aparece
- **Então** o índice fica à esquerda e a seção escolhida à direita, começando em Geral

### US-006 — Extrato compacto no celular

#### AC-013 — Filtros numa linha

- **Dado** o Extrato aberto num celular de 360 a 412 px
- **Quando** a tela aparece
- **Então** Tudo, Saídas, Rendas e o seletor Categoria ficam numa linha só, sem rolagem lateral
- **E** Importar extrato é o botão com ícone ao lado da busca

### US-007 — Voltar do aparelho em Ajustes

#### AC-014 — Voltar leva ao índice

- **Dado** uma seção de Ajustes aberta no celular
- **Quando** uso o voltar do navegador
- **Então** volto ao índice de Ajustes, e um segundo voltar sai de Ajustes

---

## Notas técnicas

- `src/App.html`: `telaAjustes` (índice + seção), folha `folhaCategoria` via `abrirFolha`, modo Ordenar em `S`, arraste por Pointer Events só na alça; handlers `cat-*` reaproveitados.
- `src/Estilos.html`: troca `.linha-ajuste` por estilos novos; `touch-action: none` só na alça.
- `testes/e2e.mjs`: fluxos dos AC acima.

## Suposições

- ASM-004: a ordem gravada continua sendo o campo `ordem` da categoria; arrastar grava só as categorias cuja `ordem` mudou.
- ASM-005: a seção aberta de Ajustes não precisa sobreviver ao recarregar a página.

## Tarefas

- [x] T-001 — Lista de leitura e folha de edição/criação (AC-001…AC-007)
- [x] T-002 — Modo Ordenar com alça e botões (AC-008…AC-010)
- [x] T-003 — Índice de Ajustes no celular e duas colunas no PC (AC-011, AC-012)
- [x] T-004 — e2e, docs, `spec/produto.md`, portão, versão 3.3.0
- [x] T-005 — Extrato em uma linha e voltar do aparelho em Ajustes (AC-013, AC-014)
