# Liberar a sobra de um plano — UX/UI com foco no celular

- **Data:** 26/11/2026
- **Status:** aprovado em 26/11/2026; implementado na 3.4.0
- **Feature:** `spec/features/liberar-sobra.md` (criada depois que a direção for aprovada, com o grafo de execução)
- **Profundidade:** SPECIFY + PLAN + TASKS + IMPLEMENT (mais de 3 arquivos: `src/App.html`, `src/Estilos.html`, `testes/e2e.mjs`, `docs/USAR.md`, `docs/ARQUITETURA.md`, `spec/glossario.md`)

## 1. Problema

O usuário perguntou se, quando uma despesa fecha abaixo do plano, o valor passa a ser o que de fato se gastou. A resposta é sim: o real é sempre o lançado, e a sobra é liberada no fechamento ou quando a categoria é encerrada no mês. Mas ele **não achou a ação** e achou o fluxo confuso.

## 2. O que o estudo do app mostrou (celular, 390 px)

| # | Achado | Onde |
|---|---|---|
| A1 | A ação só existe dentro da folha da categoria. Nenhuma tela lista "onde sobrou" com a ação ao lado. | `src/App.html:3069-3074` |
| A2 | **Defeito:** a folha "Como o disponível é calculado" diz "toque nela e use Encerrar no mês", mas os itens são `div` sem clique. A promessa não se cumpre. | `src/App.html:3401-3413`, `:3428-3435` |
| A3 | Quatro nomes para a mesma ação: **Quitar** (fixa), **Encerrar no mês** (variável), **Não vem / Não vem mais** (renda), **Não aconteceu** (fechamento). | `:1512`, `:1518`, `:3070`, `:3305-3311` |
| A4 | A folha da categoria abre com foco no campo Valor (`data-autofoco`). No Android o teclado pode subir e cobrir o resumo onde está o botão. | `:3054`, `:2141-2142` |
| A5 | O cartão "Plano do mês" já mostra "Restam R$ X" por categoria, mas sem nenhuma pista de que dá para liberar. | `:1524-1561`, `notaCategoria` `:1203-1236` |
| A6 | Não há lembrete no fim do mês. O momento natural de liberar ("este mês não gasto mais em Lazer") chega sem aviso, e o fechamento só existe depois que o mês acaba. | `cartaoHeroi` `:1380-1460` |
| A7 | O app não usa gesto de deslizar nem pressão longa em lugar nenhum. O único arraste é a alça de ordenar em Ajustes. | `src/Estilos.html:610-615`, `src/App.html:4564` |
| A8 | Já existe o padrão certo: o aviso com **Desfazer** (10 s, pilha de 10), acima da barra inferior. | `src/App.html:4053-4080`, `src/Estilos.html:747-763` |

## 3. Referências pesquisadas

- **NN/g, contextual swipe:** esconder ação primária atrás de deslizar impede que as pessoas a descubram, e deslizar cria a expectativa de apagar. → [nngroup.com/articles/contextual-swipe](https://www.nngroup.com/articles/contextual-swipe/)
- **NN/g, bottom sheet:** folha com botão de fechar claro, sem empilhar folhas. → [nngroup.com/articles/bottom-sheet](https://www.nngroup.com/articles/bottom-sheet/)
- **Apple HIG, gestos:** gesto é atalho; a ação precisa de um caminho simples e visível, "mesmo que custe um toque a mais". → [developer.apple.com/design/human-interface-guidelines/gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)
- **YNAB:** um aviso "Cover N overspent categories" abre uma lista focada com todas as categorias e a ação ao lado de cada uma. O cartão "Underfunded" na Home faz o mesmo. → [support.ynab.com — Overspending](https://support.ynab.com/en_us/overspending-in-ynab-a-guide-ryWoxEyi), [Underfunded](https://support.ynab.com/en_us/underfunded-a-guide-BJwPhQO09)
- **YNAB e Actual Budget:** a rotina de fim de mês é um passo deliberado de "o que sobrou, para onde vai". → [ynab.com/blog/master-your-monthly-rollovers](https://www.ynab.com/blog/master-your-monthly-rollovers), [actualbudget.org/docs/budgeting](https://actualbudget.org/docs/budgeting/)

O que se tira daí: **a ação fica visível ao lado do valor que ela muda, numa lista focada que um aviso no momento certo abre**. O gesto, se um dia existir, é só atalho.

## 4. Proposta

### 4.1 Um verbo só: **Liberar**

| Hoje | Proposta | Desfazer |
|---|---|---|
| Quitar (libera R$ X) | **Liberar R$ X** | Voltar a reservar |
| Encerrar no mês (libera R$ X) | **Liberar R$ X** | Voltar a reservar |
| Não vem / Não vem mais (tira R$ X) | fica igual (renda é outra ideia) | Reabrir |
| Nota "Encerrada no mês · R$ X de R$ Y" | **"Liberado · fechou em R$ X (plano R$ Y)"** | — |

A explicação, numa linha embaixo do botão, fala a língua da pergunta do usuário: *"O plano fecha no que você gastou: R$ 664,15."*

A marca gravada continua `encerrada:AAAA-MM:<id>`. Não muda dado, nem formato, nem servidor (R-004 preservada).

### 4.2 A lista focada: "Ainda nos planos" com a ação em cada linha

Na folha "Como o disponível é calculado", os blocos **Ainda nos planos** e **Contas a pagar** passam a ter, em cada linha, o botão **Liberar** (alvo de 44 px). A linha inteira abre a folha da categoria, o que corrige A2. O bloco ganha **Liberar todos** no título. Cada ação mostra o aviso com **Desfazer**, e o "Liberar todos" desfaz tudo de uma vez.

```
┌──────────────────────────────────────┐
│ Ainda nos planos         R$ 2.035,29 │
│ Liberar devolve ao disponível o que  │
│ você não vai gastar.  [Liberar todos]│
│ ┌──────────────────────────────────┐ │
│ │ M  Mercado            R$ 535,85  │ │
│ │    gasto 664,15 de 1.200 [Liberar]│ │
│ ├──────────────────────────────────┤ │
│ │ L  Lazer              R$ 186,46  │ │
│ │    gasto 126,04 de 312,50[Liberar]│ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
  ▸ toque: "Lazer: R$ 186,46 liberados.  [Desfazer]"
```

### 4.3 O aviso no momento certo: "Revisar sobras"

No herói do Início, quando faltam **7 dias ou menos** para o fim do mês e ainda há plano reservado, aparece uma linha com botão. É o mesmo padrão do aviso de categorias estouradas do YNAB.

```
┌──────────────────────────────────────┐
│ Disponível para gastar até 30/11     │
│ R$ 1.715,51                          │
│ ▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒░░░░               │
│ ─────────────────────────────────── │
│ ⏳ R$ 2.035 ainda reservados em 7    │
│    planos. Algum já acabou?          │
│              [ Revisar sobras ]      │
└──────────────────────────────────────┘
```

O botão abre a mesma folha do 4.2, já rolada até "Ainda nos planos". Não há tela nova.

### 4.4 Folha da categoria: o botão no lugar certo

- O botão **Liberar R$ X** fica logo abaixo da barra, com a frase da 4.1. Já é a posição de hoje, mudam o rótulo e a frase.
- No celular (`pointer: coarse`), a folha da categoria **não põe o foco no campo Valor** ao abrir, para o teclado não cobrir o resumo. Quem quer lançar toca no campo, que fica a um toque. No PC, o foco continua no Valor.

### 4.5 O que fica como está

- O cartão "Plano do mês" continua mostrando só "Restam R$ X". Pôr botão em cada linha poluiria o cartão mais lido. A linha já abre a folha (4.4), e o aviso da 4.3 cobre o momento de agir.
- O fechamento continua com "Não aconteceu": no mês passado, a pergunta é outra (o plano nem foi lançado).

## 5. Descartado

| Ideia | Por quê |
|---|---|
| Deslizar a linha para liberar | NN/g: esconde a ação, e deslizar sugere "apagar". O app não tem nenhum gesto assim, e criar um só para isso é uma peça a mais no projeto público. |
| Pressão longa | Ninguém descobre, e no navegador conflita com a seleção de texto. |
| Liberar sozinho a partir de uma data | Muda a regra do disponível sem o usuário saber. O fechamento já faz isso de forma explícita. |
| Tela nova "Revisar sobras" | A folha de composição já tem a lista. Reusar custa menos código e é um lugar a menos para aprender. |

## 6. SPECIFY

- **O que muda:** no celular e no PC, a sobra de um plano pode ser liberada direto da lista "Ainda nos planos" e de "Contas a pagar", com um botão visível. Um aviso no herói, nos últimos 7 dias do mês, leva até essa lista. A ação se chama **Liberar** nas despesas. As linhas da composição passam a abrir a categoria.
- **Fora de escopo:** gesto de deslizar; mudança na regra do disponível ou na marca `encerrada:`; o fechamento; o cartão "Plano do mês"; renda ("Não vem mais" fica).
- **Como se prova:**
  1. e2e a 390 px: na composição, "Liberar" em Mercado aumenta o disponível exatamente no valor que faltava, e **Desfazer** volta ao valor anterior.
  2. e2e: "Liberar todos" zera "Ainda nos planos", e um Desfazer devolve tudo.
  3. e2e: tocar na linha (fora do botão) abre a folha da categoria.
  4. e2e com data fixa em 25/11: o aviso "Revisar sobras" aparece. Em 18/11 (data atual do e2e) ele não aparece.
  5. e2e a 390 px: ao abrir a folha da categoria, o foco não fica no campo Valor.
  6. Os casos de quitar e encerrar que já existem (`testes/e2e.mjs:1200+`) passam com o rótulo novo.
- **O que muda na `spec/`:** em `spec/glossario.md`, o termo **liberar** ("encerrar a categoria no mês; o plano fecha no que foi gasto"), ligado a "disponível". Em `docs/USAR.md:149`, `:176` e `:180-184`, e em `docs/ARQUITETURA.md:150` e `:198`, os rótulos novos. `produto.md` e `regras.md` não mudam.

## 7. Suposições e perguntas

- **ASM-1:** 7 dias é o gatilho do aviso. Ele aparece quando `restantes ≤ 7` e `nosPlanos + contasAPagar > 0`, e some quando a reserva zera.
- **ASM-2:** "Liberar todos" não pede confirmação. O Desfazer de 10 s basta, como nas outras ações do app.
- **ASM-3:** tirar o autofoco só com `pointer: coarse` não atrapalha quem lança pela folha da categoria. O botão **+** da barra continua sendo o caminho principal para lançar.
- **Q-1 (para o usuário):** trocar **Quitar** por **Liberar** também no cartão "O que falta pagar"? A recomendação é sim, um verbo só. Mas "Quitar" é a palavra natural para conta, e a confusão relatada foi mais sobre achar a ação do que sobre o nome.

## 8. Execução prevista

| Onda | Tarefa | Executor |
|---|---|---|
| 1 | Linha da composição com Liberar, linha clicável e "Liberar todos" (`abrirDetalheReserva`, CSS da linha) | `pleno` (sonnet). Decidir: layout da linha a 390 px |
| 1 | Rótulos e nota "Liberado" (`:1512`, `:3070-3073`, `notaCategoria`, aviso de `encerrarCategoria`) | `mecanico` (haiku) |
| 2 | Aviso "Revisar sobras" no herói e autofoco condicional | `mecanico` (haiku), a partir do padrão da onda 1 |
| 3 | Casos e2e da seção 6, rodados com `E2E_SO` | `mecanico` (haiku) |
| 4 | `docs/USAR.md`, `docs/ARQUITETURA.md`, `spec/glossario.md`, portão de entrega | principal |

O grafo detalhado vai para `spec/features/liberar-sobra.md`.

## 9. Rollback

Só muda o front: `git revert` do commit da versão. Nenhum dado gravado muda de formato, então versões anteriores continuam lendo as marcas `encerrada:`.
