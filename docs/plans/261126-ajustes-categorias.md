# Ajustes: categorias organizadas

Data: 26/11/2026 · Versão alvo: 3.3.0 · Feature: [spec/features/ajustes-categorias.md](../../spec/features/ajustes-categorias.md)

## Problema (print do celular, v3.2.0)

1. Cada categoria ocupa duas linhas quebradas: setas + nome em cima, grupo + contagem + lixeira embaixo. Não se vê onde uma termina.
2. Tudo é editável o tempo todo: 4 controles por linha (subir, descer, campo de nome, seletor de grupo) e a lixeira. Com ~25 categorias são ~125 alvos de toque.
3. O seletor "Fixos" se repete em toda linha de Fixos: informação redundante com o título do grupo.
4. Seta "subir" desativada aparece apagada e parece defeito.
5. A lixeira desativada só explica o motivo no `title` (invisível no celular).
6. O formulário de nova categoria fica no fim da lista, longe de quem rola.
7. A categoria ocupa a tela inteira de Ajustes; Geral, Cartões, Seus dados e Atualizações ficam soterrados.

## Referências

- YNAB: lista limpa; ordenar é um modo à parte ("Reorder"), com alça de três linhas e confirmação. <https://support.ynab.com/en_us/adding-removing-and-customizing-categories-a-guide-HJFO5j909.md>
- Chrome, guia de arrastar e soltar: alça dedicada quando a linha já tem toque; `touch-action: none` só na alça; botões de mover continuam como caminho acessível; Esc devolve a posição. <https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/drag-and-drop>
- Microsoft To Do (Android): modo de ordenar com subir/descer; itens que não se mexem ficam visíveis, não somem. <https://medium.com/android-microsoft/accessible-reordering-for-touch-devices-e7f7a7ef404>
- GNOME: alças e lixeiras sempre visíveis poluem; edição vai para um modo. <https://gitlab.gnome.org/Teams/Design/os-mockups/issues/7>

## Proposta

### 1. Lista de leitura (padrão)

Uma linha por categoria, um único toque: abre a folha de edição.

```
 Fixos · 7                        ⇅ Ordenar
 ┌──────────────────────────────────────────┐
 │ ● Guardar          Economia   1 lanç.  › │
 │ ● Habitação                  11 lanç.  › │
 │ ● Plano de Saúde             12 lanç.  › │
 │ ● Internet                   11 lanç.  › │
 │ + Nova em Fixos                          │
 └──────────────────────────────────────────┘
 Variáveis · 12                            ▾
 Rendas · 3                                ▾
```

- Bolinha com `corCat(id)`: a mesma cor das outras telas, liga Ajustes ao resto do app.
- Selo "Economia" (`ehGuardar`) e "Sobra" (`ehSobra`): explica de antemão por que não se apaga.
- Grupo vira cabeçalho com contagem; Variáveis e Rendas recolhíveis no celular (Fixos aberto).
- "+ Nova em <grupo>" no fim de cada grupo: o grupo já vem escolhido. Some o formulário solto do fim.

### 2. Folha de edição (usa `abrirFolha`)

```
 Habitação                          ✕
 Fixos · 11 lançamentos
 ─────────────────────────────────────
 Nome      [ Habitação              ]
 Grupo     [ Fixos | Variáveis | Rendas ]
 ─────────────────────────────────────
 Apagar categoria   (desativado)
 Tem 11 lançamentos: mova-os antes de apagar.
```

- Grupo em controle segmentado (`.segmentado`, já existe no tema): um toque, sem menu.
- O motivo de não apagar aparece em texto, não só em `title`.
- A mesma folha cria categoria nova ("Nova categoria" no topo, botão "Adicionar").
- Regras atuais ficam como estão: aviso com Desfazer ao trocar grupo, R-sobra, categoria de economia.

### 3. Modo Ordenar

"⇅ Ordenar" no cabeçalho do grupo troca a linha por: nome + subir/descer + alça `≡` à direita. "Concluir" volta à leitura.

- Arraste por Pointer Events só na alça (`touch-action: none` só nela), dentro do próprio grupo. Trocar de grupo continua na folha.
- Subir/descer ficam (teclado e leitor de tela); no primeiro/último item ficam ocultos, não apagados.
- Esc durante o arraste devolve a posição. Grava uma operação `cat` por categoria que mudou de `ordem`, como hoje.

### 4. Tela de Ajustes em índice (opcional, recomendo)

Celular: Ajustes vira índice estilo configurações do sistema, cada item abre a sua tela.

```
 Geral            Casa · Automático   ›
 Categorias       22                  ›
 Cartões          2                   ›
 Seus dados       Backup há 3 dias    ›
 Atualizações     v3.2.0              ›
 Diagnósticos                         ›
```

PC (≥ 900 px): duas colunas, índice à esquerda e a seção aberta à direita. Mantém o `doGet` e o roteamento atual, só muda `telaAjustes`.

## Escopo e arquivos

- `src/App.html`: `telaAjustes` (lista de leitura, índice), folha nova `folhaCategoria`, modo ordenar, handlers `cat-*` existentes reaproveitados.
- `src/Estilos.html`: substitui `.linha-ajuste` por `.linha-cat-aj`, `.alca`, índice de Ajustes.
- `testes/e2e.mjs`: fluxos renomear, trocar grupo, criar, apagar bloqueado, ordenar (botão e arraste), índice no celular e no PC.
- `docs/*.md` que mostram Ajustes: atualizar textos e prints.
- `spec/produto.md`: módulo Ajustes descreve o índice e o modo Ordenar.

Fora: mudança no servidor, no formato das abas ou nas regras de categoria (nada de dado muda).

## Fases

1. Lista de leitura + folha de edição + nova categoria na folha.
2. Modo Ordenar com alça e botões.
3. Índice de Ajustes (celular) e duas colunas (PC).
4. e2e, docs, spec, portão de entrega, 3.3.0.

Executor: fases 1–3 em `pleno` (Claude Sonnet 5.5), CSS e e2e repetitivos em `mecanico` (Claude Haiku 5.5); revisão e publicação comigo (Claude Opus 5.5).
