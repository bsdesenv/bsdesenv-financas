# Fechar o mês de uma vez — lote "Não aconteceu" no fechamento

- **Data:** 26/11/2026
- **Status:** aprovado em 26/11/2026; implementado na 3.5.0
- **Feature:** `spec/features/fechar-mes-de-uma-vez.md`
- **Profundidade:** SPECIFY + TASKS + IMPLEMENT (`src/App.html`, `src/Estilos.html`, `testes/e2e.mjs`, `docs/USAR.md`, `docs/ARQUITETURA.md`)

## 1. Problema

O usuário disse: "quando finaliza o mês, ir categoria por categoria liberar é complicado; deveria ficar nas pendências do mês, com a possibilidade de verificar todas ou encerrar todas".

## 2. O que o app faz hoje

| # | Fato | Onde |
|---|---|---|
| F1 | No fechamento, plano **com gasto** não é pendência: a sobra realizada usa o que foi gasto (`recebida − jaSaiu`). Não precisa liberar nada. | `resumo()` `src/App.html:155`; `fechar-mes` `:3350-3361` |
| F2 | Pendência = conta fixa que falta pagar, plano variável **sem nenhum lançamento**, meta Guardar ou renda que falta receber. | `src/App.html:137-155` |
| F3 | A folha "Fechar <mês>" lista as pendências. Cada uma tem **Foi pago**, **Não aconteceu** e **Depois**. O botão Fechar só habilita com a lista vazia. | `abrirFechamento` `src/App.html:3290-3319` |
| F4 | O único lote é **Confirmar todas as automáticas**, só para contas com débito automático. Com 6 pendências manuais, são 6 toques antes de fechar. | `src/App.html:3309-3310`, `:3340-3346` |
| F5 | A frase da folha diz "Cada pendência é um plano que não foi lançado nem encerrado". Ela não explica que plano com gasto já fecha sozinho, e daí vem a impressão de que é preciso liberar categoria por categoria. | `src/App.html:3297` |
| F6 | No mês corrente, os últimos 7 dias já mostram **Revisar sobras**, que leva a **Liberar todos** (3.4.0). | `cartaoHeroi`, `abrirDetalheReserva` |

## 3. Referências

- **NN/g, bulk actions:** dar uma ação "todos", deixar claro o que ela afetou e oferecer desfazer. → [nngroup.com/videos/bulk-actions-design-guidelines](https://www.nngroup.com/videos/bulk-actions-design-guidelines/)
- **Desfazer em vez de confirmar**, para ação reversível e frequente. → [blog.logrocket.com/ux-design/ux-reversible-actions-framework](https://blog.logrocket.com/ux-design/ux-reversible-actions-framework/)
- **Actual Budget, "End of month cleanup":** um botão só, no fim do mês, resolve o que sobrou. → [actualbudget.org/docs/experimental/monthly-cleanup](https://actualbudget.org/docs/experimental/monthly-cleanup)

## 4. Proposta

### 4.1 Lote "Não aconteceu" na folha de fechamento

Ao lado de "Confirmar todas as automáticas", entra um segundo botão. Ele marca **Não aconteceu** em todas as pendências visíveis que não são de débito automático.

- Sem automáticas na lista, o rótulo é **Não aconteceu em todas (N)**.
- Com automáticas, o rótulo é **Não aconteceu nas demais (N)**, porque conta automática presume-se paga e tem o seu próprio lote.
- Só aparece com 2 alvos ou mais. Com um só, o botão da própria linha basta.
- Um aviso com **Desfazer** devolve todas. Não há confirmação: num mês que já acabou, "Não aconteceu" não muda a sobra realizada, só diz que não falta lançar nada.
- O que foi adiado com **Depois** fica fora do lote.

### 4.2 Frase da folha

A frase "Cada pendência é um plano que não foi lançado nem encerrado. Diga o que aconteceu com ele." passa a ser:

> Aqui ficam as contas que faltam pagar e os planos sem nenhum lançamento. Plano com gasto já fecha no que você gastou.

```
┌──────────────────────────────────────┐
│ Fechar outubro de 2026            ✕  │
│ Aqui ficam as contas que faltam      │
│ pagar e os planos sem nenhum         │
│ lançamento. Plano com gasto já fecha │
│ no que você gastou.                  │
│ [✓ Confirmar todas as automáticas (2)]│
│ [  Não aconteceu nas demais (4)     ]│
│ ┌──────────────────────────────────┐ │
│ │ L  Lazer       previsto R$ 200   │ │
│ │ [Foi pago][Não aconteceu][Depois]│ │
│ └──────────────────────────────────┘ │
│ Sobra realizada R$ 812  [Fechar out.]│
└──────────────────────────────────────┘
```

Fechar um mês com 2 automáticas e 4 manuais leva **3 toques**: automáticas, demais e Fechar. Hoje são 7.

## 5. Descartado

| Ideia | Por quê |
|---|---|
| Fechar o mês corrente antes de acabar | Ainda pode haver lançamento no último dia. No mês corrente, Revisar sobras já leva a Liberar todos (F6). |
| Botão Fechar que dá o resto como "não aconteceu" | Efeito escondido num botão de fechar. Dois passos explícitos custam um toque a mais. |
| Pôr na lista de pendências os planos com gasto | Eles não mudam nada no fechamento (F1). Pô-los lá criaria o trabalho de que o usuário reclama. |
| Lote "Foi pago em todas" | Lançaria o previsto de contas manuais sem conferir o valor. As automáticas já têm o seu. |

## 6. SPECIFY

- **O que muda:** na folha de fechamento, um botão marca "Não aconteceu" em todas as pendências que não são automáticas, com um Desfazer. A frase da folha explica que plano com gasto já fecha no que foi gasto.
- **Fora de escopo:** o fechamento do mês corrente; a regra das pendências (`resumo()`); a sobra realizada; a marca `encerrada:`; o lote das automáticas; servidor e dados (R-004 preservada).
- **Como se prova:**
  1. e2e: num mês passado com 3 pendências manuais, "Não aconteceu em todas (3)" esvazia a lista, habilita Fechar e não muda a sobra realizada. O Desfazer devolve as 3.
  2. e2e: com 2 automáticas e 2 manuais, a folha mostra "Confirmar todas as automáticas (2)" e "Não aconteceu nas demais (2)". O segundo deixa só as automáticas.
  3. e2e: pendência adiada com Depois não entra na conta do lote.
  4. e2e: com uma pendência só, o lote não aparece.
  5. A frase nova está na folha.
- **O que muda na `spec/`:** nada em `produto.md`, `regras.md` nem no glossário. A feature fica em `spec/features/fechar-mes-de-uma-vez.md`. Em `docs/USAR.md` (seção "Fechar o mês", `:190-202`), uma frase sobre o lote e sobre plano com gasto.

## 7. Suposições

- **ASM-009:** o lote não pede confirmação, porque o Desfazer de 10 s basta e, num mês passado, o "Não aconteceu" não muda a sobra realizada.
- **ASM-010:** conta com débito automático fica fora do lote "Não aconteceu", porque se presume paga.
- **ASM-011:** pendência adiada com Depois fica fora do lote.

## 8. Execução

O grafo está em `spec/features/fechar-mes-de-uma-vez.md`. Depois do e2e verde, a versão sai como 3.5.0.

## 9. Rollback

Só muda o front: `git revert` do commit. Nenhum dado muda de formato.
