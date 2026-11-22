# Benchmark visual de apps financeiros: padrões para PC e mobile

**Escopo:** comparação de materiais públicos oficiais de YNAB, Monarch, Copilot Money e Actual Budget, além de referências de design systems e acessibilidade. Observações visuais abaixo vêm de screenshots públicos dos guias do Actual, Copilot e Monarch; interações vêm da documentação oficial. Não houve acesso a interfaces privadas. Pesquisa em 22 nov. 2026.

## 1. O que torna saldos, orçamentos, transações e fluxo de caixa fáceis de escanear?

### Takeaway

Os exemplos mais úteis combinam um resumo numérico explícito com comparações simples e um caminho curto até os lançamentos que compõem o total. Para um redesign, priorize valores, período e significado; gráficos e cor devem reforçar a leitura, não substituir os números.

### Cited Findings

- **Observação visual — screenshot da documentação do Actual Budget:** a tela de orçamento põe contas e saldos na lateral e, na área principal, categorias com colunas de orçado, gasto e saldo para meses lado a lado. Grupos recolhíveis ajudam a percorrer uma lista longa. — [The Budget, Actual Budget](https://actualbudget.org/docs/tour/budget) (sem data de publicação indicada; documentação © 2026).
- **Observação visual — screenshot do guia do Copilot:** o resumo de categorias põe “spent so far” e “total budget” em destaque, com um anel como comparação complementar. O artigo explica que as categorias são ordenadas por gasto, que as barras representam ritmo frente ao orçamento e que contornos indicam gastos recorrentes esperados. — [Categories Tab Overview, Copilot](https://help.copilot.money/en/articles/9504513-categories-tab-overview) (29 abr. 2025).
- **Observação visual — screenshot público do Monarch:** a tela de fluxo de caixa mostra totais de receita, despesas e resultado líquido acima de barras por período, com detalhamento ranqueado abaixo. A documentação permite trocar o tipo de gráfico, filtrar e abrir as transações relacionadas ao clicar em barras, fatias ou blocos. — [Using Reports, Monarch](https://help.monarch.com/hc/en-us/articles/21846787088916-Using-Reports) (última atualização 21 set. 2026).
- **Interação documentada — Copilot:** o painel exibe “Free to Spend”, compara uma linha pontilhada de ritmo ideal com uma linha sólida de gasto realizado e mantém uma lista de transações para revisar. — [Dashboard Tab Overview, Copilot](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview) (14 abr. 2026).
- **Interação documentada — Monarch:** o widget mobile de orçamento usa um anel para a porcentagem consumida e mostra o restante; é possível ocultar os valores monetários. — [Using Mobile Widgets, Monarch](https://help.monarch.com/hc/en-us/articles/8611706513684-Using-Mobile-Widgets) (última atualização 20 out. 2026).
- Para gráficos explicativos, o USWDS recomenda tipos familiares como barras e linhas, limitar cada gráfico a uma mensagem central e fornecer dados/tabelas equivalentes; orienta também a não exigir hover para entender o conteúdo. — [Data visualizations, USWDS](https://designsystem.digital.gov/components/data-visualizations/).

### Inferences

- Organize o resumo em perguntas práticas: **quanto está disponível agora**, **como o mês está contra o plano** e **quais entradas/saídas vêm a seguir**. Mantenha saldo de contas, patrimônio líquido e disponibilidade como conceitos diferentes, cada qual com período, escopo e data de atualização.
- Em cada categoria, mostre valor orçado, gasto e restante junto a uma barra de progresso; permita abrir o detalhe e as transações de origem. Agrupe categorias e permita recolher grupos para reduzir ruído sem esconder a navegação.
- Use linhas para tendência temporal, barras simples ou ranqueadas para comparar categorias e barras empilhadas somente quando composição e total forem ambos importantes. Trate anéis como resumo secundário: o valor monetário exato continua visível.
- Não use “positivo”/“negativo” como sinônimo automático de “bom”/“ruim”: um gasto é uma saída, enquanto saldo de dívida, saldo disponível e resultado mensal têm semânticas diferentes. Combine sinal, rótulo e contexto; identifique realizado, orçado e previsto com palavras e estilos distintos.

### Gaps

- Screenshots e guias oficiais são exemplos de produto, não auditorias independentes de usabilidade ou acessibilidade. Não demonstram que uma hierarquia específica seja melhor para todos os perfis.

## 2. O que muda entre desktop e mobile, e como tratar planejamento anual?

### Takeaway

Desktop pode privilegiar comparação simultânea e ações em lote; mobile deve preservar os dados essenciais em uma leitura vertical e interações por toque. Planejamento anual funciona melhor como visão ampla no PC e como navegação focada por mês no telefone.

### Cited Findings

- Monarch documenta três colunas no orçamento web (planejado, realizado e restante); no mobile exibe duas e permite alternar a última entre realizado e restante. — [Creating Your Budget in Monarch](https://help.monarch.com/hc/en-us/articles/360048883631-Creating-Your-Budget-in-Monarch) (última atualização 29 out. 2026).
- O YNAB separa no mobile espaços de plano, gastos/transações, contas e reflexão; a busca de transações cobre várias contas, e as contas podem ser priorizadas em uma lista própria. — [Spaces in (and out of) the YNAB Mobile App](https://support.ynab.com/en_us/spaces-in-the-mobile-app-S1iIZQoqgg?mobile-help=true) (24 set. 2025).
- O Copilot posiciona a ação de criar categoria no rodapé no iOS e no topo no Mac/iPad; também move o acesso a rebalanceamento conforme a plataforma. — [Categories Tab Overview, Copilot](https://help.copilot.money/en/articles/9504513-categories-tab-overview) (29 abr. 2025).
- No Copilot para web, filtros combináveis, ordenação, navegação por teclado e ações em lote ficam disponíveis na lista de transações. Já os guias de cash flow descrevem interação por toque no iPhone/iPad e hover no Mac. — [Copilot Money for Web](https://help.copilot.money/en/articles/11780342-copilot-money-for-web) (20 ago. 2026); [Cash Flow Tab Overview](https://help.copilot.money/en/articles/9682232-cash-flow-tab-overview) (20 fev. 2026).
- A visão anual web do Monarch mostra os 12 meses em grade, com meses anteriores realizados e meses futuros projetados; inclui vistas mensal, anual e por década e é explicitamente limitada ao web. — [Budget Calendar View, Monarch](https://help.monarch.com/hc/en-us/articles/360051885292-Plan-forecast) (última atualização 20 out. 2026).
- O Copilot permite orçamento constante ou diferente por mês e expõe até 12 meses futuros, incluindo recorrências previstas. O YNAB oferece metas anuais que transformam uma despesa irregular em aportes recorrentes até a data definida. — [Editing Budgets by Month, Copilot](https://help.copilot.money/en/articles/6206293-editing-budgets-by-month) (20 ago. 2026); [Getting Started with Targets, YNAB](https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC) (26 set. 2025).

### Inferences

- **PC:** use navegação lateral persistente, tabela com colunas alinhadas, filtros visíveis, busca/ordenação e ações em lote. Mostre dois ou mais meses quando a largura permitir, mantendo totais e período à vista.
- **Mobile:** priorize uma coluna de cartões/linhas, com nome, saldo/valor e estado sempre visíveis; mantenha o resumo de patrimônio separado da lista de contas. Pode-se alternar realizado/restante, mas prefira um controle explícito e acessível a esconder um dado essencial atrás de long-press ou hover. Valores do gráfico devem aparecer também por toque e em resumo textual/tabela.
- Para o plano anual, adapte uma matriz de 12 meses no desktop e uma navegação mês a mês com resumo do ano no mobile. Separe visualmente histórico realizado de meses futuros planejados/previstos e mostre compromissos anuais como contribuição mensal mais data-alvo.
- Não copie termos ou regras de método: YNAB e Actual descrevem orçamento por categorias/envelopes; Monarch documenta orçamento orientado a fluxo de caixa e modos flex/categoria; Copilot permite desativar orçamento e usa o indicador “Free to Spend”. — [YNAB Method](https://www.ynab.com/ynab-method); [Creating Your Budget, Monarch](https://help.monarch.com/hc/en-us/articles/360048883631-Creating-Your-Budget-in-Monarch); [Quick Start Guide, Copilot](https://help.copilot.money/en/articles/11157550-quick-start-guide); [Budgeting, Actual](https://actualbudget.org/docs/budgeting/).

### Gaps

- Os padrões e a disponibilidade de recursos variam entre versões, plataformas e métodos de orçamento; a documentação de um app não garante equivalência em outro. A documentação do Copilot também informa que sua disponibilidade atual é para contas dos EUA, portanto seus exemplos em USD não são referência de localização brasileira.

## 3. Que escolhas de cor, tipografia, espaçamento e BRL funcionam em temas claro/escuro?

### Takeaway

Uma base calma vem de superfícies neutras, hierarquia tipográfica consistente e poucos acentos semânticos. O tema deve mudar por papéis de cor (superfície, texto, borda, ação e estados), com contraste verificado separadamente em claro e escuro.

### Cited Findings

- WCAG 2.2 exige que a cor não seja o único meio de comunicar informação; define contraste mínimo de **4,5:1** para texto normal, **3:1** para texto grande e **3:1** para elementos gráficos/controles necessários à compreensão. — [W3C, WCAG 2.2](https://www.w3.org/TR/WCAG22/) (12 dez. 2024; critérios 1.4.1, 1.4.3 e 1.4.11).
- O Carbon Design System separa paletas categóricas (categorias distintas), sequenciais (magnitude) e de alerta; para gradientes, recomenda evitar múltiplas séries quando dificultam a acessibilidade. — [Color palettes, Carbon](https://www.carbondesignsystem.com/building-blocks/data-visualization/color-palettes/) (sem data de publicação indicada; conteúdo © IBM 2026).
- O Material Design 3 organiza cores em papéis pareados para superfície, texto/ícone, contorno e erro, inclui tema claro/escuro e recomenda tokens; sua escala de espaçamento usa uma base de 8 dp e deve adaptar-se ao contexto e ao dispositivo. A tipografia usa papéis como display, headline, title, body e label. — [Color system](https://m3.material.io/styles/color/system); [Spacing](https://m3.material.io/styles/spacing); [Typography](https://m3.material.io/styles/typography) (sem data de publicação indicada; consultados em 22 nov. 2026).
- `Intl.NumberFormat` formata números conforme localidade e exige código ISO de moeda quando `style: "currency"` é usado. Para BRL, a interface deve usar a localidade `pt-BR` e o código `BRL`, em vez de concatenar `$` ou trocar separadores manualmente. — [MDN, Intl.NumberFormat](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) (página atualizada em 22 mai. 2026).

### Inferences

- Use fundos neutros e um acento de marca; reserve verdes/âmbar/vermelhos para estados relevantes. Em categoria ou transação, acrescente rótulo, sinal, ícone ou padrão: “dentro do ritmo”, “atenção”, “acima do orçamento”, “previsto”. Não pinte todo gasto negativo como alerta.
- Diferencie previsão de realizado também por contorno/tracejado e marcador de data, seguindo os exemplos documentados de linha pontilhada para meta e contorno para recorrência esperada; valide os pares de contraste em ambos os temas.
- Para valores brasileiros, prefira **R$ 1.234,56** e mantenha o símbolo, a vírgula decimal e o agrupamento legíveis. Alinhe valores à direita e use algarismos tabulares para comparar colunas; em telas estreitas, reduza enfeites antes de truncar valor ou categoria.
- Adote escala de espaçamento coerente em múltiplos de 8 px como ponto de partida, com mais respiro entre grupos e menos entre rótulo e valor. Use fonte sem serifa legível, valores principais maiores e uma escala clara para títulos, corpo e rótulos; teste ampliação de texto e espaçamento sem perda de conteúdo.

### Gaps

- As fontes de produto e design consultadas não comprovam contraste WCAG dos apps, nem estabelecem uma única paleta, fonte ou espaçamento ideal para finanças. A aparência deve ser avaliada com dados BRL reais, rótulos longos em português e testes em light/dark e em diferentes larguras.
