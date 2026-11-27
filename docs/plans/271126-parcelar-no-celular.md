# Parcelar no celular: sem teclado do sistema e sem rolagem mínima

- **Data:** 27/11/2026
- **Status:** implementado em 27/11/2026
- **Feature:** `spec/features/parcelar-no-celular.md`
- **Profundidade:** SPECIFY + TASKS + IMPLEMENT (`src/App.html`, `src/Estilos.html`, `testes/e2e.mjs`, `docs/USAR.md`, `docs/ARQUITETURA.md`)

## 1. Problema

O usuário relatou: "temos um teclado montado em tela, mas quando clico para lançar a quantidade de parcela abre o do Android e as outras opções de parcelamento ficam em uma rolagem minúscula e tudo bagunçado".

## 2. O que o app faz hoje

| # | Fato | Onde |
|---|---|---|
| F1 | No celular, **Em quantas vezes** é um `input` numérico. O toque abre o teclado do sistema, que cobre a folha e convive com o teclado de dígitos do app. | `abrirNovo()` em `src/App.html` |
| F2 | O painel de parcelas fica dentro de `.folha-corpo`, o item que encolhe para o teclado de dígitos e o rodapé caberem. O painel tem 285 px; o corpo fica com 169 px em 390×844 e 44 px com o teclado do sistema aberto. | `.nv-toque .folha-corpo`, `.nv-teclado-area` em `src/Estilos.html` |
| F3 | A prévia e as opções **O valor é** e **Primeira parcela em** ficam abaixo do campo, dentro dessa rolagem de 44 px, e quase não aparecem. | mesmo painel |
| F4 | No computador o campo de digitar funciona e o painel cabe no corpo; o problema é só no ponteiro grosso. | `abrirNovo()` |

## 3. Referências

- **NN/g, bottom sheets:** conteúdo secundário pode substituir o teclado, desde que a ação principal continue visível. → [nngroup.com/articles/bottom-sheet](https://www.nngroup.com/articles/bottom-sheet/)
- **Android, input types:** `inputmode="numeric"` abre o teclado do sistema; para uma lista fechada de 2 a 48, o seletor nativo evita o teclado e o erro de digitação. → [developer.android.com/develop/ui/views/touch-and-input/keyboard-input](https://developer.android.com/develop/ui/views/touch-and-input/keyboard-input)

## 4. Proposta

### 4.1 Quantidade como lista, não como digitação

No celular, **Em quantas vezes** vira um `select` de 2× a 48×, já em 2×. Nada de `input`: o teclado do sistema não tem motivo para aparecer. No computador, o campo de digitar continua.

### 4.2 O painel toma o lugar do teclado de dígitos

Com **Parcelar** ativo, a folha ganha `parcelando`: o teclado de dígitos sai de cena e o painel de parcelas ocupa a mesma área, logo acima do rodapé. O painel fica compacto — quantidade, **O valor é**, **Primeira parcela em** e a prévia —, sem caixa própria e sem rolagem interna.

Em telas baixas, a descrição sai de cena enquanto o painel está aberto (o valor continua no estado e volta ao fechar **Parcelar**). Em telas muito baixas, as categorias também saem. O rodapé fica preso e mostra **Salvar N×**; o total continua na prévia e no valor grande.

### 4.3 Medidas depois da mudança

| Tela | Painel | Teclado de dígitos | Rolagem interna | Descrição |
|---|---|---|---|---|
| 390×844 | 179 px, inteiro | oculto | não | visível |
| 390×640 | 173 px, inteiro | oculto | não | oculta |
| 320×640 | 192 px, inteiro | oculto | não | oculta |

Sem rolagem lateral em nenhuma das telas. A folha encolhe para o conteúdo quando o teclado de dígitos sai; o rodapé continua no lugar.

## 5. Descartado

| Ideia | Por quê |
|---|---|
| Folha separada só de parcelamento | Mais um toque e uma pilha de folhas para uma escolha que cabe na mesma tela. |
| Usar o teclado de dígitos para digitar as parcelas | O mesmo teclado teria dois alvos (valor e quantidade), e o valor ficaria sem edição enquanto o modo estivesse ativo. |
| Passo a passo com − e + | Para chegar a 24 seriam muitos toques; a lista resolve em um. |
| Esconder sempre a descrição no celular | Em telas altas a descrição cabe e continua útil para nomear a compra ("Geladeira (1/3)"). |

## 6. SPECIFY

- **O que muda:** no celular, o painel Parcelar abre no lugar do teclado de dígitos, a quantidade é uma lista de 2 a 48 e nada abre o teclado do sistema. A descrição e as categorias cedem espaço em telas baixas.
- **Fora de escopo:** a regra das parcelas, o mês da primeira parcela, o cartão, o servidor e o formato de dados. A tela do computador continua igual.
- **Como se prova:**
  1. e2e: em 390×844, depois de Parcelar, `#nv-n` é `SELECT`, o teclado de dígitos está oculto e o painel inteiro está na tela, sem rolagem interna.
  2. e2e: em 320×640, o painel inteiro cabe, a descrição some e não há rolagem lateral.
  3. e2e: os cenários de parcelas no computador e de compra no cartão (celular e PC) continuam passando.
- **O que muda na `spec/`:** nada em `produto.md`, `regras.md` ou glossário. A feature fica em `spec/features/parcelar-no-celular.md`. `docs/USAR.md` (seção Parcelar) e `docs/ARQUITETURA.md` (Parcelas) ganham a diferença do celular.

## 7. Suposições

- **ASM-015:** o padrão 2× no celular é aceitável porque a prévia e o botão mostram o número e o total antes de salvar.
- **ASM-016:** esconder a descrição em telas baixas enquanto parcela não perde dado: o campo continua no estado e volta ao desligar **Parcelar**.

## 8. Execução

O grafo está em `spec/features/parcelar-no-celular.md`.

## 9. Rollback

Só muda o front: `git revert` do commit. Nenhum dado muda de formato.
