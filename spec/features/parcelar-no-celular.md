# Feature: Parcelar no celular

> status: implementada
> Origem: `docs/plans/271126-parcelar-no-celular.md`

## Contexto

No **Novo lançamento** do celular, tocar em **Em quantas vezes** abria o teclado do sistema por cima do teclado de dígitos do app. O painel de parcelas ficava dentro do corpo que encolhe, com 44 px de altura quando o teclado do sistema abria; **O valor é**, **Primeira parcela em** e a prévia quase não apareciam.

## Fora de escopo

- A regra das parcelas, o mês da primeira parcela, o cartão e o formato de dados.
- A tela do computador, que continua com o campo de digitar e o painel no corpo.

---

## Histórias

### US-014 — Escolher as parcelas no celular sem teclado do sistema

Como quem lança uma compra parcelada pelo celular, quero escolher a quantidade e as outras opções numa tela que caiba inteira, para não brigar com dois teclados e uma rolagem mínima.

#### AC-040 — A quantidade é uma lista

- **Dado** o Novo lançamento no celular com um valor e uma categoria
- **Quando** toco em **Parcelar**
- **Então** **Em quantas vezes** é uma lista de 2× a 48×, já em 2×
- **E** o teclado do sistema não abre

#### AC-041 — O painel toma o lugar do teclado de dígitos

- **Dado** o painel Parcelar aberto no celular
- **Então** o teclado de dígitos some e o painel aparece no lugar dele, inteiro, sem rolagem interna
- **E** o rodapé mostra **Salvar N×**, preso embaixo

#### AC-042 — Tela baixa

- **Dado** um celular de 320×640
- **Quando** abro o painel Parcelar
- **Então** o painel inteiro cabe na tela e a descrição sai de cena
- **E** não há rolagem lateral nem rolagem interna no painel

#### AC-043 — O computador não muda

- **Dado** o Novo lançamento no computador
- **Quando** abro o painel Parcelar
- **Então** **Em quantas vezes** continua um campo de digitar
- **E** o painel continua dentro do corpo, com as mesmas opções e a mesma prévia

---

## Notas técnicas

- Só o front muda: `abrirNovo()` em `src/App.html`, regras em `src/Estilos.html`.
- No celular, `#nv-n` nasce como `select` com as opções de 2 a 48 e o painel nasce dentro de `.nv-teclado-area`. A classe `parcelando` na folha esconde o teclado de dígitos e deixa a área do painel dimensionar pelo conteúdo.
- Em `max-height: 700px` o `.folha-corpo` some enquanto parcela; em `max-height: 560px`, as categorias também.
- O botão do rodapé no celular mostra só **Salvar N×** para caber em 320 px; o total fica na prévia e no valor grande.
- R-004 preservada: nenhum dado ou servidor muda.

**Contrato da tela (`ContratoParcelarToque`)**

- Folha do Novo no celular: `class="folha ... nv-toque"` e, com o painel aberto, também `parcelando`.
- `#nv-n` é `SELECT` com opções `2×` a `48×`; o valor inicial é `2`.
- `#nv-parc` vive dentro de `.nv-teclado-area`; com `parcelando`, `.teclado` não é renderizado visível.
- Rodapé: o botão primário mostra `Salvar N×`; a prévia (`#nv-previa`) mostra o valor de cada parcela, o período e o total.
- Em `max-height: 700px`, `.folha-corpo` tem altura zero; em `max-height: 560px`, `.nv-cats-area` também.

---

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-015 | O padrão 2× no celular é aceitável porque a prévia e o botão mostram o número e o total antes de salvar | confirmada | Decisão do plano de 27/11/2026 |
| ASM-016 | Esconder a descrição em telas baixas enquanto parcela não perde dado: o campo continua no estado e volta ao desligar **Parcelar** | confirmada | Decisão do plano de 27/11/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

---

## Grafo de execução

```plano
limite: 2
justificativa: 3 tarefas; src/App.html e src/Estilos.html têm um dono só, e o teste e a documentação correm ao lado

### T-022 — Painel Parcelar no celular sem teclado nativo [concluida]
- refs: US-014, AC-040, AC-041, AC-042, AC-043
- depende: -
- escreve: src/App.html, src/Estilos.html
- possui: ContratoParcelarToque
- le: -
- contexto: docs/plans/271126-parcelar-no-celular.md
- prova: a 390×844 e a 320×640 o painel aparece inteiro, com a quantidade em lista, sem teclado do sistema e sem rolagem interna
- verifica: CHROME_PATH=/usr/bin/google-chrome E2E_SO="parcelas" node testes/e2e.mjs
- executor: mecanico

### T-023 — Casos e2e do painel Parcelar no celular [concluida]
- refs: US-014, AC-040, AC-041, AC-042, AC-043
- depende: T-022
- escreve: testes/e2e.mjs
- possui: -
- le: ContratoParcelarToque
- contexto: spec/features/parcelar-no-celular.md
- prova: os cenários de parcelas e de compra no cartão passam no celular e no PC
- verifica: CHROME_PATH=/usr/bin/google-chrome E2E_SO="parcelas" node testes/e2e.mjs
- executor: mecanico

### T-024 — USAR.md e ARQUITETURA.md com o painel no celular [concluida]
- refs: AC-040
- depende: -
- escreve: docs/USAR.md, docs/ARQUITETURA.md
- possui: -
- le: -
- contexto: docs/plans/271126-parcelar-no-celular.md
- prova: a seção Parcelar ensina que no celular a quantidade é escolhida numa lista e o painel toma o lugar do teclado
- verifica: sh spec/_fontes/verificar-documentacao.sh
- executor: mecanico
```
