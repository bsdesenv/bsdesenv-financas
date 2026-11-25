# Plano detalhado — Verdade financeira e clareza de decisão (v3)

**Status:** em execução. Decisões tomadas em 25/11/2026 (seção 15). Publicadas em 25/11/2026, com tag e Release no GitHub: **2.8.0** (seção 6), **2.8.1** (seção 7) e **3.0.0** (seção 8). Em andamento: **3.1.0** (seção 9), depois a Fase 3 (seção 10, sem a 10.4).
**Base analisada:** bsdesenv-financas 2.6.2 (novembro de 2026, commit `de8b639`; os números de linha valem para ele). A 2.7.0 (commit `54f748c`, 24/11/2026: instalador e atualização em um clique) saiu durante a revisão sem mexer nos cálculos, e os achados reproduzem nela; as versões deste plano começam na 2.8.0.
**Objetivo:** aumentar a confiança nos números e reduzir o esforço de decisão, sem trocar a arquitetura de dados (Google Sheets + Apps Script), sem perder a privacidade e sem transformar a home em um relatório.

**Direção:** primeiro fazer cada número significar uma coisa só e mudar de forma previsível; depois reorganizar a home por perguntas e fechar os meses; por último adicionar as primitivas de planejamento que faltam (vencimentos, recorrências, parcelas, importação e transporte de sobra).

**Regra de ouro do número principal:** ele cai na mesma medida quando a pessoa gasta, não muda quando ela paga uma conta já prevista, guarda dentro da meta ou recebe uma renda que já estava prevista, e nunca sobe por causa de um gasto.

### Histórico de revisões

| Revisão | Data | Mudanças |
|---|---|---|
| 1 | nov. 2026 | Versão inicial. |
| 2 | 24/11/2026 | Achados reproduzidos no app (Chrome sem janela, dados de exemplo, data fixa em 18/11/2026) e referências conferidas na web. Entram três bugs P0 que a revisão 1 não tinha (renda parcial, campo de valor do painel, estorno), o modelo do "Disponível" por grupo de categoria, o glossário com um nome por fórmula, o fechamento do mês, cartão e parcelas, a validação sem telemetria e as correções de referências cruzadas e de linhas de código. |
| 3 | 24/11/2026 | Parecer técnico final (seção seguinte): P0 reconferidos; modelo corrigido em casos de borda; histórico das regras já revertidas (4.7); quatro bugs novos; viabilidade no Apps Script; "Quitar" sem regravar o plano; prazos e ordem revistos; versões renumeradas para 2.8.x, porque a 2.7.0 saiu com o instalador. |
| 3.1 | 25/11/2026 | Conferência da revisão 3: a origem deliberada dos itens 3.1 e 3.2 (regras da 2.2.0 e da 2.5.4, casos 405 e 596 do E2E) entra no diagnóstico; "Copiar de" deixa de contar como bug, porque o `docs/USAR.md:87` descreve o comportamento; saída sem código para o vale (4.7); reprodução do estorno e medida da home corrigidas. |
| 4 | 25/11/2026 | O dono delegou as decisões da seção 15. Decididas e registradas ali, com a reversão (15.2). A principal: o herói adota a alternativa da seção 4.7, que reserva o que falta de todos os planos, inclusive os variáveis, como pede o caso 454 do E2E. A 2.8.0 foi implementada no mesmo dia, no branch `melhorias-v3-2.8.0`, e publicada (merge no `main`, tag `v2.8.0`). Testes na publicação: 87/87 de unidade e servidor, 42/42 E2E. |
| 5 | 25/11/2026 | 2.8.1 implementada (seção 7): avisos fora da folha, "Repetir até dezembro" com confirmação e Desfazer, troca de grupo protegida, categoria de economia com id estável, importação com prévia e confirmação digitada, Desfazer em pilha com Ctrl+Z e os itens de acessibilidade. Testes: 92/92 de unidade e servidor; E2E com os cenários da 2.8.0 e da 2.8.1. |
| 6 | 25/11/2026 | 3.0.0 implementada e publicada (seção 8): Início por perguntas (disponível, o que falta pagar, plano do mês, onde foi e últimos), fechamento do mês com a sobra realizada em `config` (`fechado:AAAA-MM`), seletor de mês com o endereço acompanhando a navegação, Planejar com retorno, dados de exemplo e o passo "Seu mês" no primeiro acesso, cores pela ordem, DM Sans embutida e tamanhos em `rem`. O backup passa a levar os meses fechados e a categoria de economia, e o aviso da 2.8.0 só aparece para quem usou uma versão anterior neste aparelho. Altura do Início a 390 px: de 3.981 para 3.099 px. Testes: 96/96 de unidade e servidor; 68/68 E2E. |

### Parecer técnico (revisão 3)

**Veredito:** aprovado com ressalvas. Os achados P0 (3.1 a 3.6) se confirmam no código e na interface; só a altura da home estava errada. O modelo resolve os bugs 3.1 e 3.2 e cabe no Apps Script sem dependência nova, mas a fórmula da revisão 2 errava com estornos, renda negativa e resgate lançado em Guardar, e o modelo inverte decisões já registradas no projeto. A 2.8.0 só deve começar depois de o dono decidir de novo a seção 15.

**Principais mudanças:** fórmulas corrigidas nos casos de borda (4.3); histórico das regras revertidas na 2.0.2, na 2.2.0 e na 2.5.4 e do caso 454 do E2E (4.7); "Quitar" como marcação em `config`, sem regravar o plano (15); três bugs novos, reproduzidos (3.5, 3.12 e 6.7), e um comportamento documentado que confunde (8.4); compatibilidade com v1 e v2, colunas, datas e backup (6.2, 6.8, 9.1 e 9.6); 2.8.0 em 2–3 semanas e 3.1.0 em 5–7, com a 2.8.1 junto do uso real (16); versões do plano renumeradas (a 2.7.0 publicada é o instalador), com os terceiros e a cópia de link revistos à luz dela (7.4 e 8.3).

**Riscos residuais:** o vai e volta da regra (4.7); contas de valor variável cadastradas em Variáveis, que ficam sem reserva (o próprio E2E põe "Luz" lá); "Quitar" esquecido (R$ 219,23 dos R$ 639,23 de contas a pagar nos dados de exemplo); três pontos não conferidos em produção: copiar no iframe do Apps Script, CSP por meta tag e texto "aaaa-mm" virando data no Sheets.

**Decisões do dono:** delegadas e tomadas em 25/11/2026; ver a seção 15.

**Não-objetivos desta fase:**

- Não integrar Open Finance nem conectar contas bancárias.
- Não adicionar IA, gamificação, streaks ou notificações push.
- Não trocar a fonte da verdade: a planilha continua sendo o banco de dados.
- Não fazer um redesign visual completo; preservar a identidade e os componentes atuais.
- Não adicionar dependências de front-end (ferramentas de teste como dependência de desenvolvimento são permitidas).
- Não coletar métricas de uso fora da planilha da própria pessoa.

---

## 1. Contexto

A versão 2.6 modernizou a apresentação e trouxe uma base incomum para um projeto pessoal:

- dados no Drive, permissão `@OnlyCurrentDoc`, sem servidor de terceiros;
- sincronização por operações pequenas, revisão, fila local, retry e realinhamento;
- desfazer em ações importantes;
- testes de servidor e suíte E2E;
- acessibilidade acima da média (Lighthouse 100, foco preso, alvos de 44 px, números tabulares, redução de movimento).

A análise do código, a reprodução dos fluxos no app e os benchmarks de finanças mostram que o próximo ganho não está em mais cartões ou gráficos. Está em:

1. **verdade financeira:** o "Disponível" sobe quando a pessoa gasta dentro do plano e fica negativo quando entra parte do salário; meses passados misturam plano e realizado e são rotulados de "realizada"; o mesmo valor tem nomes diferentes; um campo de valor grava R$ 21.793.176,15 quando a pessoa digita "217,93 176,15";
2. **clareza de decisão:** a home responde a várias perguntas ao mesmo tempo e repete números;
3. **primitivas de planejamento:** "a vencer" não tem vencimento; não existem recorrência, parcelas, fechamento do mês nem transporte de sobra;
4. **confiança operacional:** ações destrutivas sem rede de segurança, Desfazer que some em 6,5 s, importação sem relatório de rejeições e furos pontuais de acessibilidade.

---

## 2. Princípios de pesquisa aplicados

1. **Uma pergunta principal por tela.** Dashboards devem responder decisões, não exibir dados. A home deve começar por "posso gastar?", depois "o que falta pagar?", depois "onde foi?".
   Referências: [NN/g, dashboards](https://www.nngroup.com/articles/dashboards-preattentive/), [NN/g, complex applications](https://www.nngroup.com/articles/complex-application-design/), [CFPB, toolkit](https://files-prod.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_financial-empowerment_toolkit.pdf).
2. **Separar realizado, planejado e projetado.** O usuário precisa saber o que já aconteceu, o que está reservado e o que é estimativa. Misturar os três em um total "realizada" destrói confiança.
   Referências: [Alenazi & Sas, 2024](https://eprints.lancs.ac.uk/id/eprint/222780/3/Creating_and_Managing_Transactions_and_Budgets-PURE.pdf), [BCS HCI, 2023](https://dl.acm.org/doi/10.14236/ewic/BCSHCI2023.1).
3. **Separar o que não é gastável.** O guia de design comportamental da FinHealth recomenda reservar o dinheiro de contas e da poupança e mostrar à parte o que fica livre para as decisões do dia a dia; o exemplo citado separa um saldo "Sheltered" (contas e poupança) de um "Free to Spend". No mercado, o "Leftover" do PocketGuard é a renda menos contas, orçamentos e metas; o "Free to Spend" do Copilot é o que ainda dá para gastar sem estourar o orçamento do mês. Para este app: contas fixas e Guardar são compromissos e saem do número; os planos das categorias variáveis são limites e aparecem como "nos planos", não como dinheiro sumido.
   Referências: [FinHealth, 2023, p. 12–13](https://finhealthnetwork.org/wp-content/uploads/2023/12/BE-Guide-Tools-to-Manage-Spending-2023.pdf), [PocketGuard, Leftover](https://pocketguard.com/help/leftover/), [Copilot, painel](https://intercom.help/copilotmoney/en/articles/6045480-dashboard-tab-overview).
4. **Cuidado com a precisão e com o "quanto resta".** O mesmo guia relata três evidências; pede mais pesquisa sobre a primeira ("more research is needed", p. 12), e as outras duas vêm de estudos isolados:
   - mostrar exatamente quanto resta no orçamento levou pessoas a gastar mais do que quem estimava o próprio saldo (Ghosh & Huang, 2020);
   - feedback de situação ("você está na faixa segura") manteve o gasto mais constante do que feedback por período ("você gastou US$ 50 nesta semana") (Huang & Ghosh, 2018);
   - feedback menos preciso (faixas) e lembrar que a sobra pode ser transportada reduziram o efeito.

   Aplicação: no herói, valores arredondados ao real e situação em palavras ("No ritmo", "Acima do ritmo em Mercado"); nada de "até R$ X por dia" com centavos; centavos só no realizado e na composição. O "ritmo semanal" proposto na revisão 1 vai contra a segunda evidência e sai do plano. Na p. 19, o guia diz que destacar quanto resta para gastar pode dar licença para gastar mais, e cita uma home que mostra a sobra do mês ("Money Left Over"): é o argumento da alternativa da seção 15.
   Referência: [FinHealth, 2023, p. 12, 19–20](https://finhealthnetwork.org/wp-content/uploads/2023/12/BE-Guide-Tools-to-Manage-Spending-2023.pdf).
5. **Entrada manual é o produto.** Sem sincronização bancária, cada toque importa. Rótulos claros, teclado adequado, validação inline sem antecipação e ações rápidas são decisivos. Um único interpretador de valor para todos os campos: o mesmo texto nunca pode virar valores diferentes em telas diferentes.
   Referências: [Baymard, input fields](https://baymard.com/learn/input-fields), [Baymard, inline validation](https://baymard.com/blog/inline-form-validation), [Baymard, touch keyboards](https://baymard.com/labs/touch-keyboard-types).
6. **Confiança aparece nos detalhes.** Transparência de dados, última sincronização, prévia de importação, confirmação de ações destrutivas, backup e limites explícitos.
   Referências: [Monzo](https://monzo.com/blog/2022/11/04/how-we-design-magic-moments-at-monzo), [Markswebb 2024](https://markswebb.com/insights/best-practices-from-mbr-2024).
7. **Acessibilidade é requisito, não polimento.** WCAG 2.2 AA: cor não pode ser o único meio (1.4.1); contraste (1.4.3/1.4.11); texto a 200% (1.4.4, que o zoom do navegador atende, técnica G142 — `rem` é melhoria, não requisito); reflow a 320 px (1.4.10); teclado (2.1.1); tempo ajustável (2.2.1, relevante para avisos com Desfazer que somem sozinhos); foco não obscurecido (2.4.11); alvo mínimo de 24 px (2.5.8); mensagens de status (4.1.3).
   Referências: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Understanding 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [G142](https://www.w3.org/WAI/WCAG22/Techniques/general/G142), [Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Scott O'Hara, toasts](https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html), [USWDS, data viz](https://designsystem.digital.gov/components/data-visualizations/).
8. **Contexto brasileiro.** Três fatos mudam o desenho:
   - cartões responderam por 55,7% do consumo das famílias no 3º trimestre de 2025, e o parcelado sem juros passou de 42% do volume no crédito em 2025 (dados da ABECS citados pela imprensa);
   - salário em duas partes é comum: um vale de cerca de 40% perto do dia 20 e o saldo até o 5º dia útil (prática de mercado, não exigência da CLT);
   - contas recorrentes podem sair por débito automático ou Pix Automático (disponível desde 16/06/2025).

   Referências: [Finsiders/ABECS](https://finsidersbrasil.com.br/estudos-e-relatorios/cartoes-movimentam-r-45-tri-em-2025-alta-de-101-ante-2024-diz-abecs/), [Mercado & Consumo/ABECS](https://mercadoeconsumo.com.br/05/12/2025/economia/cartoes-movimentam-353-do-pib-brasileiro-no-3o-tri-mostra-abecs/), [Serasa, dia 5 e 20](https://www.serasa.com.br/ecred/blog/pagamento-dia-5-e-20-como-funciona), [Pontotel, adiantamento](https://www.pontotel.com.br/adiantamento-salarial/), [Agência Brasil, Pix Automático](https://agenciabrasil.ebc.com.br/economia/noticia/2025-06/banco-central-anuncia-o-pix-automatico).

---

## 3. Diagnóstico priorizado

Salvo indicação, os números desta seção foram reproduzidos no app real com os dados de exemplo (`exemplos/dados-exemplo.json`) e a data fixa em 18/11/2026, como no E2E (método no anexo).

### P0 — Verdade financeira

#### 3.1 O "Disponível" sobe quando a pessoa gasta dentro do plano

- **Evidência:** `celula` (`src/App.html:318`) usa o lançado quando há lançamento e o plano quando não há; `resumo` faz `disponivel = sobra` (`src/App.html:359`). O plano deixa de reservar depois do primeiro lançamento.
- **Reprodução:** plano de R$ 420 em Compras, sem lançamento; disponível R$ 3.550,03. Lançar R$ 378 em Compras: R$ 3.592,03.
- **Impacto:** a resposta para "posso gastar?" sobe quando a pessoa gasta.
- **Origem:** é consequência da regra escolhida na 2.2.0 ("o plano só conta enquanto a categoria não tem lançamento"), que o app explica no herói (`src/App.html:690`) e o E2E fixa (caso 405). Mudar exige a decisão da seção 15 (ver 4.7).

#### 3.2 Receber parte do salário deixa o "Disponível" negativo

- **Evidência:** a renda usa a mesma regra (`src/App.html:334–338`): com lançamento, vale o lançado, não o previsto.
- **Reprodução:** salário previsto de R$ 7.900 ainda sem lançamento; disponível R$ 3.550,03. Lançar o vale de 40% (R$ 3.160): **−R$ 1.189,97**, sob o título "Disponível para gastar".
- **Impacto:** para quem recebe vale e salário, o número principal fica errado, e negativo, durante cerca de duas semanas por mês, justamente depois de entrar dinheiro. A revisão 1 corrigia só as saídas.
- **Origem:** é a regra escolhida na 2.5.4, que desfez no mesmo dia a correção da 2.5.3, e o E2E a fixa (caso 596, "renda parcial: com lançamento vale o recebido, não o plano"). Sem mudar a regra, dividir a renda em duas categorias com plano próprio evita o número negativo (seção 4.7).

#### 3.3 Mês passado mistura plano e realizado e é chamado de "realizada"

- **Evidência:** `sobraReal` é calculado (`src/App.html:368`), mas não aparece em nenhuma tela. Herói do mês passado (`src/App.html:693–701`), KPI "Sobra" (`src/App.html:763`) e gráfico anual (`src/App.html:951` e `964`) usam `sobra`, que inclui planos sem lançamento, e rotulam "valores reais"/"realizada".
- **Documentação divergente:** `docs/ARQUITETURA.md:117` afirma que o app usa `sobraReal` em meses passados.
- **Reprodução (revisão 1):** com um plano de R$ 500 sem lançamento em setembro, a tela mostra R$ 1.392,31 como sobra "com valores reais"; a soma do lançado dá R$ 1.892,31.
- **Ressalva:** nenhum dos dois números é "o verdadeiro" por si. Se o plano era uma conta paga e não lançada, a sobra real é R$ 1.392,31; se a despesa não aconteceu, é R$ 1.892,31. O app não tem como saber. Por isso a correção tem duas partes: rótulo honesto agora (seção 6.3) e fechamento do mês depois (seção 8.2).

#### 3.4 Um número, quatro nomes

| Onde | Rótulo atual | O que é |
|---|---|---|
| Herói | Disponível | `renda − gastos` (gastos = realizado + planos sem lançamento) |
| Herói (linha) | Ainda na conta | `renda − gastoReal` (não é saldo bancário) |
| KPI | Já saiu | `gastoReal` |
| Tela Mês | Gastos do mês | `gastos` (inclui planos sem lançamento) |
| Tela Mês | Sobra do mês | `renda − gastos` |
| Planejar | Sobra planejada | `rendaPlano − planos` |
| Extrato | em gastos | `gastoReal` do filtro |

- **Impacto:** o usuário não consegue construir um modelo mental; a mesma quantia parece mudar de significado entre telas.
- **Correção:** glossário único (seção 5).

#### 3.5 O campo de valor grava o que a pessoa não digitou

- **Evidência:** `mascaraValor` (`src/App.html:64`) roda em todo `input.valor` por um ouvinte global (`src/App.html:2062`): meta (`818`), plano no Planejar (`1080`), edição de lançamento (`1452`), "Lançar aqui" do painel da categoria (`1500`) e plano do painel (`1505`). Ela descarta tudo o que não é dígito e trata os dígitos como centavos.
- **Reprodução:**
  - "1200" num plano vira 12,00, um plano 100× menor;
  - no "Lançar aqui", que anuncia "Aceita vários valores: '217,93 176,15' ou '36*4'" (`src/App.html:1504`), digitar o próprio exemplo gravou **R$ 21.793.176,15** na planilha; "36*4" vira 3,64; "50" vira 0,50;
  - o servidor aceita qualquer valor abaixo de 1 bilhão (`src/Codigo.gs:299`).
- **Sinal:** o teclado numérico do celular não tem "−" (`src/App.html:1308`) e a máscara apaga o "−". Estorno e devolução só podem ser lançados no formulário completo do computador, embora as regras novas dependam de lançamentos negativos.
- **Editar um estorno:** o formulário de edição mostra o valor com o sinal "−" (U+2212) que o app usa na exibição (`num`, `src/App.html:20`), mas `paraNumero` só aceita "-" (linha 44). Reprodução com um estorno de −R$ 50: salvar sem mexer no valor dá "Valor inválido"; redigitar o valor com sinal ("-5000", no formato de centavos da máscara) faz a máscara apagar o sinal e grava **+R$ 50**, uma diferença de R$ 100 no mês.
- **Testes:** o E2E consagra o comportamento (`testes/e2e.mjs:380–381` e `394–395` verificam a máscara); essas verificações têm de mudar junto.
- **Correção:** componente único de valor (seção 6.4).

#### 3.6 Pequenos erros de confiança

| Achado | Evidência | Correção |
|---|---|---|
| Lançamento rápido grava no mês de hoje, mesmo vendo outro mês | `lancarRapido` usa `hoje()` (`src/App.html:446`); vendo setembro, gravou em 18/11 | Seção 6.5 |
| "Planejar mês" no menu lateral abre "Acompanhar" | rótulo em `src/App.html:569`; `ACOES.tela` não muda `S.modoMes` | Renomear para "Mês" (seção 6.6) |
| "A vencer" não tem vencimento | `cartaoAVencer` (`src/App.html:831`) | "Contas a pagar" até existir vencimento (seções 6.6 e 9.1) |
| "Repetir até dezembro" grava vários planos sem confirmação nem Desfazer e sobrescreve os existentes | `src/App.html:1565–1570` | Seção 7.1 |
| Mudar o grupo de uma categoria reclassifica o histórico; de saída para renda, inverte o sinal de tudo (entre Fixos e Variáveis, o realizado não muda) | `MUDAR['cat-grupo']` (`src/App.html:2031`); `salvarCat_` (`src/Codigo.gs:339`) | Seção 7.1 |
| Importação descarta registros inválidos sem contar | `catch` vazios em `importar_` (`src/Codigo.gs:410` e `424`) | Seção 7.1 |
| Médias e sugestões usam o plano de meses sem lançamento, e um plano nunca lançado vira "média" | `media3` usa `valorFechado` (`src/App.html:303–310`); alimenta "Preencher com as médias", "Usar sugestão", "Planejar agora" e as projeções dos avisos | Seção 6.7 |
| Desfazer some em 6,5 s, não pausa com foco e só existe um por vez | `aviso` (`src/App.html:1733–1747`) substitui o aviso anterior | Seção 7.2 |
| "Exportar CSV" na Planilha exporta todos os lançamentos, não a tabela do ano | botão em `src/App.html:1149`; `exportarCSV` (`1762`) | Renomear para "Exportar lançamentos (CSV)" (seção 7.1) |
| O texto "Sobre" não menciona que o navegador busca a fonte no Google Fonts e o ícone no GitHub (o endereço IP vai junto); a 2.7.0 somou o aviso de versão (GitHub ou jsDelivr) e manteve o texto | `src/App.html:1201`; `src/Index.html:10–12`; `ICONE_URL` (`src/Codigo.gs:23`), posto pelo `setFaviconUrl` como link na página | Seção 7.4 |

### P1 — Clareza e decisão

#### 3.7 A home é um relatório, não uma resposta

- **Medição:** a 390 px, com os dados limpos, a home tem 3.320 px de altura (cerca de quatro telas de 844 px) e 11 blocos: herói, quatro KPIs, Meta de economia, Ritmo do plano, A vencer, Variáveis do mês, Últimos lançamentos e Sobra mês a mês. A revisão 2 anotou 3.362 px; refeita nos commits `de8b639` e `54f748c`, a medida dá 3.320 px.
- O herói mostra Renda, Já saiu, Ainda na conta, Planos e Disponível; os quatro KPIs repetem Renda, Já saiu, Planos e Guardado.
- "Meta" repete Guardado; "Ritmo" repete o plano; há dois "Como funciona" e dois "Ajustar".
- **Correção:** nova ordem por perguntas (seção 8.1).

#### 3.8 Cores de categoria repetem as de status e repetem entre si

- A cor da categoria vem de `corDe(id)`, um hash do id módulo 10 (`src/App.html:39`). A paleta (`src/Estilos.html:65–66`) reusa exatamente os tons de status (`src/Estilos.html:13`): `cor-1` = `--ok`, `cor-2` = `--acima`, `cor-5` = `--atencao`; `cor-0` é o `--acento`.
- Colisões nos dados de exemplo: Mercado, Restaurantes e Plano de saúde (índigo, que também é a cor de destaque e a de "Já saiu"), Internet e celular e Transporte (azul), Lazer e Outros (oliva), Moradia e Contas da casa (laranja, o tom de "acima do plano"). No modelo "Essencial" do primeiro acesso, Mercado e Saúde e farmácia saem iguais, assim como Contas da casa e Compras, e Lazer e Outros. Com 10 cores sorteadas por hash, cinco categorias têm cerca de 70% de chance de repetir uma cor.
- "Para onde foi" distingue as categorias só pela cor (`src/App.html:906–909`); o mapa de calor distingue "acima/abaixo" só pela cor.
- **Correção:** seção 8.6.

#### 3.9 Acessibilidade: 100 no Lighthouse, mas com furos reais

| Problema | Evidência | Critério | Versão |
|---|---|---|---|
| "Usar sugestão" fora da ordem do Tab (`tabindex="-1"`), 76×17 px, fonte 11 px | `src/App.html:1081`; `src/Estilos.html:477` | 2.5.8; boa prática de teclado (digitar o valor no campo é alternativa, então não é falha estrita de 2.1.1) | 2.8.1 |
| Barras do gráfico anual a 320 px: 18,2 px de largura, centros a 22,2 px | `src/Estilos.html:415–417` (gap de 4 px) | 2.5.8 (falha também pela exceção de espaçamento, que pede 24 px entre centros) | 2.8.1 |
| Barra inferior fixa pode cobrir o elemento focado | sem `scroll-padding-bottom`/`scroll-margin` | 2.4.11 | 2.8.1 |
| Avisos com Desfazer somem em 6,5 s sem pausar com foco | `src/App.html:1733–1747` | 2.2.1 (risco; o tema é debatido entre especialistas) | 2.8.1 |
| Fundo não fica `inert` com uma folha aberta | `abrirFolha` (`src/App.html:1220`); o fundo depende só de `aria-modal="true"` (linha 1224) | leitores de tela podem navegar no fundo; `inert` tira o fundo da ordem do Tab e da árvore de acessibilidade | 2.8.1 |
| Status de sincronização fora de região viva | `renderSinc` (`src/App.html:600`) | 4.1.3 — anunciar só problemas (sem conexão, recusa, pendências), não cada "Salvando…" | 2.8.1 |
| Campo "Nome do controle" sem `id`/`name` | `src/App.html:1190` | boa prática de formulário | 2.8.1 |
| Categorias e mapa de calor só por cor | gráficos | 1.4.1 | 3.0.0 |
| Tipografia em `px` | `src/Estilos.html` | não é falha de 1.4.4 (o zoom atende); `rem` respeita a fonte padrão escolhida no navegador | 3.0.0 |

#### 3.10 Onboarding não entrega valor; falta saldo inicial

- O primeiro acesso tem dois passos (nome + modelo) e cria categorias; depois a home mostra zeros.
- Não há saldo inicial; quem começa no meio do mês pode ver um "disponível" que ignora o que aconteceu antes.
- **Correção:** modo exemplo, setup opcional e aviso de início no meio do mês (seção 8.5).

### P2 — Produto e escala

#### 3.11 Faltam primitivas de planejamento

| Padrão | Referência de mercado (conferida nesta revisão) | O app hoje |
|---|---|---|
| Separar compromissos do que é gastável | PocketGuard (Leftover desconta contas, orçamentos e metas); FinHealth ("Sheltered" × "Free to Spend") | Mistura: o plano reserva só até o primeiro lançamento |
| Transportar sobra (rollover) | Copilot (por categoria, inclusive o excesso); Monarch | Não |
| Cartão de crédito como conta | YNAB (uma categoria de pagamento por cartão); Mobills (fechamento, vencimento e fatura) | Não |
| Compras parceladas | Mobills (despesa parcelada ligada à fatura) | "36*4" cria quatro lançamentos no mesmo mês |
| Recorrências | Mobills (despesas fixas no cartão) | Só "Repetir até dezembro" para planos |
| Importação de extrato | Bancos brasileiros exportam OFX | Só backup JSON |
| Fechamento do mês | — | Não |

Caminho realista para este projeto: importação CSV/OFX (sem Open Finance), recorrências manuais, parcelas e fechamento do mês.

A tabela da revisão 1 vinha de um site de afiliados e tinha erros; ficaram só os fatos conferidos.

#### 3.12 Cartão de crédito e parcelas

- O app não decide se a compra no cartão entra no mês da compra (competência) ou no mês em que a fatura é paga (caixa). Sem essa decisão, o "Disponível" mistura a compra deste mês com a fatura do próximo.
- "36*4" (`paraNumeros`, `src/App.html:51–62`) grava quatro lançamentos no mesmo mês; não existe parcelar em meses.
- O multiplicador também aceita "x" e "×" (linha 56). Escrito como se diz "10x" no Brasil, "1200x10 compras geladeira" no lançamento rápido gravou dez lançamentos de R$ 1.200 em novembro, R$ 12.000 de uma vez: o Disponível foi de R$ 3.550,03 para −R$ 8.029,97, com só o aviso de Desfazer.
- Com o parcelado sem juros acima de 42% do volume no crédito, fica de fora boa parte do que já está comprometido nos meses seguintes.
- **Correção:** decisão de regime (seção 15) e parcelas na Fase 2 (seção 9.2).

---

## 4. Decisão de produto: o que significa "Disponível"

> **Decisão tomada em 25/11/2026 (seção 15):** o "Disponível para gastar" do mês atual é **renda − já saiu − contas a pagar − falta guardar − ainda nos planos**, isto é, a "sobra prevista" das seções 4.3 a 4.7, com as regras por grupo e as correções de casos de borda da revisão 3. O número que as seções abaixo chamam de "Disponível" (sem descontar os planos variáveis) não é mais o número principal: aparece só como desdobramento da composição. "Sobra prevista" passa a ser o nome do mesmo cálculo em meses futuros. Os motivos estão na seção 15.

### 4.1 Problema

A regra atual ("com lançamento, vale o lançado; sem lançamento, o plano") vale para todas as categorias e produz os dois bugs P0: gastar dentro do plano aumenta o número (3.1) e receber parte da renda o derruba (3.2).

### 4.2 O que a revisão 1 propunha e por que não basta

A revisão 1 propunha `disponivel = renda − Σ max(plano, realizado)` em todas as saídas. A fórmula é boa, mas responde a outra pergunta:

- ela calcula quanto sobra no fim do mês se todos os planos forem cumpridos. Rotulada "Disponível para gastar", trata o plano do mercado como uma conta a pagar e esconde o dinheiro que a pessoa ainda vai gastar no mercado;
- com os dados de exemplo, o herói cairia de R$ 3.550,03 para R$ 1.715,51 (−52%) no dia da atualização;
- "até R$ X por dia" perderia o sentido;
- a renda continuaria na regra antiga, e o bug 3.2 continuaria.

A fórmula da revisão 1 continua no plano, com o nome certo: **sobra prevista**.

### 4.3 Modelo recomendado: regras por grupo

```
Por categoria c no mês: real_c = soma lançada (negativa quando há mais estorno que gasto);
plano_c = plano do mês (nunca negativo).
falta_c = max(0, plano_c − real_c), se plano_c > 0 e a categoria não foi encerrada no mês
          ("Quitar" ou "Não vem mais"); senão, 0.

renda          = Σ (real_c + falta_c)                 categorias de renda (= max(plano_c, real_c) quando há plano)
aReceber       = Σ falta_c                            categorias de renda
jaSaiu         = Σ real_c                             todas as saídas, inclusive Guardar
contasAPagar   = Σ falta_c                            fixos, exceto Guardar
faltaGuardar   = max(0, meta − max(0, guardado))      Guardar, em qualquer grupo de saída (meta = plano; sem meta, 0)
disponivel     = renda − jaSaiu − contasAPagar − faltaGuardar
nosPlanos      = Σ falta_c                            variáveis, exceto Guardar
sobraPrevista  = disponivel − nosPlanos
sobraRealizada = Σ real_c (renda) − jaSaiu
```

Por que por grupo:

- **Fixos e Guardar são compromissos.** Saem do número, como recomenda o guia da FinHealth. A reserva é o que falta do plano, e não "lançou, está pago", porque muitas categorias fixas somam várias contas ("Contas da casa" = água + luz + gás; "Assinaturas"): liberar o restante no primeiro lançamento poria em risco a conta que ainda não chegou. Quando a conta vem mais barata, a ação **Quitar** encerra a categoria no mês: o restante deixa de ser reservado, com Desfazer (como registrar: seção 15).
- **Variáveis têm limites, não reservas.** O restante aparece como "nos planos". Gastar no mercado reduz o Disponível na mesma medida, que é o comportamento esperado.
- **Renda usa o maior valor entre prevista e recebida.** O vale do dia 20 não mexe no número; "a receber" fica visível. Quando a renda não vem inteira, a ação **Não vem mais** encerra a categoria no mês.
- **Sem plano, não há reserva (correção da revisão 3).** A revisão 2 aplicava `max(0, plano − real)` mesmo sem plano e não limitava Guardar: um estorno numa conta fixa sem plano virava "conta a pagar" do mesmo valor, uma correção negativa numa renda sem plano virava "a receber", e um resgate lançado em Guardar virava "falta guardar" e sumia do disponível (três últimas linhas da tabela de leitura). Com Guardar em Variáveis, o texto contava a meta duas vezes. A forma fechada `Σ renda_c − Σ max(plano_c, real_c)` também falha com estorno numa variável sem plano (R$ 1.715,51 em vez de R$ 1.765,51); por isso a sobra prevista é definida pela diferença.

Com os dados de exemplo (novembro, dia 18):

| | Hoje | Revisão 1 | Recomendado |
|---|---|---|---|
| Número do herói | R$ 3.550,03 | R$ 1.715,51 | **R$ 3.750,80** |
| Composição | renda 7.900,00 − já saiu 3.509,97 − planos sem lançamento 840,00 | renda − Σ max(plano, realizado) | renda 7.900,00 − já saiu 3.509,97 − contas a pagar 639,23 |
| Desdobramento | — | — | nos planos R$ 2.035,29 · sobra prevista R$ 1.715,51 |

Leitura. As linhas foram calculadas com os dados de exemplo; nas de Guardar e nas três últimas, acrescentou-se aos dados o que o caso pede (Guardar com meta de R$ 500, uma conta fixa sem plano); as de Quitar foram deduzidas das fórmulas.

| Ação | Disponível | Nos planos | Sobra prevista | Regra atual |
|---|---|---|---|---|
| Gastar R$ 100 no mercado, dentro do plano | −100 | −100 | 0 | −100 |
| Primeiro lançamento em Compras: R$ 378 num plano de R$ 420 | −378 | −378 | 0 | **+42** |
| Gastar R$ 100 numa categoria que já passou do plano | −100 | 0 | −100 | −100 |
| Estorno de R$ 50 no mercado | +50 | +50 | 0 | +50 |
| Pagar uma conta fixa pelo valor do plano | 0 | 0 | 0 | 0 |
| Pagar uma conta fixa R$ 30 abaixo do plano | 0 (+30 ao Quitar) | 0 | 0 (+30 ao Quitar) | +30 |
| Pagar uma conta fixa R$ 30 acima do plano | −30 | 0 | −30 | −30 |
| Receber o vale de 40% de um salário previsto de R$ 7.900 | 0 | 0 | 0 | **−4.740** |
| Receber R$ 200 de renda não prevista | +200 | 0 | +200 | +200 |
| Aumentar em R$ 300 o plano de um variável | 0 | +300 | −300 | −300 sem lançamento; 0 com |
| Guardar exatamente a meta | 0 | 0 | 0 | 0 |
| Guardar R$ 200 além da meta | −200 | 0 | −200 | −200 |
| Estorno de R$ 50 numa conta fixa sem plano | +50 (revisão 2: 0) | 0 | +50 | +50 |
| Resgate de R$ 1.000 lançado como negativo em Guardar (meta de R$ 500) | +1.000 (revisão 2: 0) | 0 | +1.000 | +1.500 |
| Correção de −R$ 100 numa renda sem plano | −100 (revisão 2: 0) | 0 | −100 | −100 |

### 4.4 Apresentação

- **Herói do mês atual:** "Disponível para gastar até 30/11", valor arredondado ao real (R$ 3.751), e logo abaixo "R$ 2.035 nos planos · sobra prevista R$ 1.716". Com renda a receber: chip "R$ X a receber" e a linha "Sem a renda a receber: R$ Y" (`disponivel − aReceber`).
- **Situação em palavras e cor**, no lugar de "Até R$ X por dia": "No ritmo", "Acima do ritmo em Mercado", "Já saiu mais do que a renda menos as contas e a meta" (disponível negativo).
- **Composição com centavos** na folha "Como calculamos".
- **Arredondamento:** cada número do herói é arredondado por conta própria, e a linha não se escreve como conta (100,49 e 50,51 dariam "R$ 100", "R$ 51 nos planos" e "sobra prevista R$ 50"); a conta fecha com centavos em "Como calculamos". Normalizar o zero negativo: no Chrome, −0,40 sem casas decimais sai "-R$ 0".
- **Nome "sobra prevista"**, não "livre para gastar": o dinheiro sem destino aparece como resultado do mês, e não como convite a gastar (princípio 4). É uma hipótese a observar no uso real (seção 12).

### 4.5 Regras por fase do mês

| Fase | Número principal | Rótulo | Secundário |
|---|---|---|---|
| Passado, sem pendências | `sobraRealizada` | "Sobra realizada" | — |
| Passado, com pendências | `sobraRealizada` | "Sobra realizada" + "N pendências (R$ X)" | botão "Fechar o mês" (seção 8.2) |
| Passado, sem nenhum lançamento | `sobraPrevista` | "Sem lançamentos · sobra prevista" | antes do primeiro mês com lançamento, o gráfico anual não desenha barra |
| Atual | `disponivel` | "Disponível para gastar" | nos planos · sobra prevista · a receber |
| Futuro | `sobraPrevista` | "Sobra prevista" | lançado até agora (parcelas, por exemplo) |

### 4.6 Riscos e validação

- **Os números mudam no dia da atualização:** o herói de novembro passa de R$ 3.550,03 para R$ 3.750,80, e o KPI "Sobra do mês" da tela Mês (hoje R$ 3.550,03) vira "Sobra prevista" de R$ 1.715,51. Mitigação: aviso único "O que mudou nos números", changelog e a folha "Como calculamos".
- **"Quitar" esquecido deixa dinheiro reservado:** nos dados de exemplo, R$ 219,23 dos R$ 639,23 de contas a pagar são restos de contas já pagas em parte (Contas da casa R$ 140,64, Assinaturas R$ 59,11, Internet e celular R$ 19,48). "Contas a pagar" mostra o restante de cada conta, com o botão ao lado.
- **Renda a receber que não vem:** "Não vem mais"; depois do fim do mês, o fechamento pergunta (seção 8.2).
- **Validação:** uso real pelas pessoas da casa (seção 12). Se o uso mostrar que o número total incentiva gasto, a alternativa é destacar a sobra prevista no herói; as fórmulas não mudam.

### 4.7 O que já foi tentado

A regra do Disponível mudou cinco vezes entre 18 e 21/11/2026, e o modelo recomendado traz de volta partes de regras revertidas:

| Versão | Regra | Por que saiu | No modelo recomendado |
|---|---|---|---|
| 2.0.0–2.0.1 | maior entre lançado e plano, em todas as categorias | 2.0.2: "a sobra não reagia ao que você lançava ou apagava" (`CHANGELOG.md:166`) | o herói cai a cada gasto; o maior valor fica só na sobra prevista |
| 2.1.0–2.1.3 | reserva do restante de todos os planos iniciados | 2.2.0: "volta à regra da planilha" (`CHANGELOG.md:107–108`) | só fixos e Guardar reservam; variáveis mostram "nos planos" |
| 2.5.3 | renda pelo maior entre plano e recebido | 2.5.4: "lançar uma renda abaixo do plano não mexia em nada" (`CHANGELOG.md:35`); o E2E fixa a regra atual (caso 596) | volta, com "a receber" visível e "Não vem mais" |
| atual (desde a 2.2.0) | plano variável sem lançamento desconta o herói | não saiu: o E2E diz que "só com contas fixas a vencer" daria o valor errado (`testes/e2e.mjs:454–472`, "Luz" em Variáveis) | inverte: o plano variável vai para "nos planos" |

Nenhuma regra atende a tudo: reservar o plano variável e fazer o número cair a cada gasto só convivem contando o mesmo dinheiro duas vezes ou soltando a reserva no primeiro lançamento (o bug 3.1). A recomendação abre mão da reserva dos variáveis; a alternativa (sobra prevista no herói) abre mão de cair a cada gasto, o motivo da reversão da 2.0.2. Por isso a seção 15 pede ao dono que aceite de novo, por escrito, as regras revertidas antes de codar; a tabela de leitura da seção 4.3 vira o contrato do E2E.

**Saída sem código para o vale.** Se o dono mantiver a regra atual, quem recebe vale pode dividir a renda em duas categorias com plano próprio ("Salário — vale" e "Salário — saldo"). Cada lançamento substitui só o plano da sua parte: o herói continua reagindo ao que entra, como a 2.5.4 quis, e não fica negativo depois do vale. Basta documentar em `docs/USAR.md`. Para o item 3.1 não há saída equivalente sem mudar a regra.

---

## 5. Terminologia e rótulos

### 5.1 Glossário canônico (um nome por fórmula)

| Termo | Fórmula | Onde usar |
|---|---|---|
| **Renda do mês** | por categoria, max(prevista, recebida) quando há previsão; sem previsão, a recebida | herói, tela Mês |
| **Recebida** / **A receber** | soma lançada / Σ max(0, prevista − recebida), só nas rendas com previsão e sem "Não vem mais" | herói, composição |
| **Já saiu** | soma lançada nas saídas, inclusive Guardar | composição, Extrato ("em saídas") |
| **Contas a pagar** | Σ max(0, plano − lançado) dos fixos com plano, exceto Guardar e os quitados | composição, cartão "Contas a pagar" |
| **Falta guardar** | max(0, meta − guardado); resgate (guardado negativo) conta como zero | composição, Guardar |
| **Disponível para gastar** | renda − já saiu − contas a pagar − falta guardar; não é o saldo do banco | herói do mês atual |
| **Nos planos** | Σ max(0, plano − lançado) dos variáveis com plano, exceto Guardar | herói, Plano do mês |
| **Sobra prevista** | disponível − nos planos | herói (linha), Mês, Planilha e gráfico anual no mês atual e nos futuros |
| **Sobra realizada** | recebida − já saiu | meses passados |
| **Sobra do plano** | Σ planos de renda − Σ planos de saída, sem olhar o lançado | Mês › Planejar |
| **Pendências** | num mês passado ainda não fechado, o que o plano esperava e não foi lançado nem encerrado: restante de fixos, Guardar e renda; plano de variáveis sem nenhum lançamento | fechamento do mês |

**Mês passado** é a fase do calendário; **mês fechado** é o mês que passou pelo fechamento (seção 8.2).

Termos aposentados: "Ainda na conta", "Restante previsto", "Planos sem lançamento" (no herói), "Ainda previsto", "livre", "Sobra estimada", "Caixa do mês", "Sobra do mês" e "Sobra planejada".

### 5.2 Substituições de texto

| Hoje | Novo |
|---|---|
| "Ainda na conta" / "Restante previsto" | removido; a composição vira renda − já saiu − contas a pagar − falta guardar |
| "Planos sem lançamento" (herói) | "Contas a pagar" (fixos) e "Nos planos" (variáveis) |
| "Gastos do mês" (Mês) | "Já saiu" e "Contas a pagar" |
| "Sobra do mês" (Mês) | "Sobra prevista" (mês atual) / "Sobra realizada" (passado) |
| "Ainda previsto" (Variáveis do mês, `src/App.html:922`; só planos sem lançamento) | "Nos planos", com a fórmula do glossário |
| "livre" (centro do anel do herói, `src/App.html:668`) | removido: é um segundo nome para o disponível |
| "Sobra planejada" (Planejar) | "Sobra do plano" |
| "A vencer este mês" | "Contas a pagar"; "vence dia X" só com vencimento (Fase 2) |
| "Planejar mês" (menu lateral) | "Mês" |
| "Até R$ X por dia nos próximos N dias" | situação ("No ritmo", "Acima do ritmo em …") |
| "em gastos" e o filtro "Gastos" (Extrato, `src/App.html:1016–1019`) | "em saídas" e "Saídas" |
| "Exportar CSV" (Planilha) | "Exportar lançamentos (CSV)" |

### 5.3 "Como calculamos" único

- Um único painel, acessível do herói, de "Plano do mês" e de "Contas a pagar", com:
  - a conta do Disponível em uma frase e linha a linha, com centavos;
  - o desdobramento em "nos planos" e "sobra prevista";
  - a nota "não é o saldo do banco";
  - exemplos com números pequenos ("gastou R$ 100 no mercado: o disponível cai R$ 100; a sobra prevista não muda").
- Remover os textos explicativos longos dos cartões da home; manter um link.

---

## 6. Versão 2.8.0 — Números corretos (Fase 0a, 2–3 semanas)

**Objetivo:** nenhum número principal engana, muda de sentido entre telas ou grava algo diferente do que foi digitado. Nenhuma funcionalidade nova além de "Quitar" e "Não vem mais", que o modelo exige.

#### 6.1 Pré-requisito: domínio testável sem navegador

- [ ] Criar `src/Dominio.html` só com funções puras, sem DOM nem o estado `S`: `paraNumero`, `paraNumeros`, `interpretarLinha`, `fase`, `celula`, `resumo`, `media3`, `sugestaoMeta`. Elas recebem os dados e a data de hoje como parâmetros.
- [ ] Incluir em `src/Index.html` antes do `App` (`<?!= incluir('Dominio'); ?>`).
- [ ] Testar no Node lendo o arquivo, tirando as tags `<script>` e executando em `node:vm`, sem dependência nova; `npm test` passa a rodar também `testes/dominio.test.mjs`. Declarar as funções com `function`: no `vm`, `const` de topo não aparece no objeto de contexto.
- [ ] Manter a memoização do índice por ano (`idxAno`, `src/App.html:273–290`): o Início chama `resumo` 28 vezes por desenho.
- [ ] Calcular em centavos inteiros e converter só na exibição: 21 das 153 somas mensais por categoria dos dados de exemplo têm resíduo de ponto flutuante antes do `arred` (1389,4899999999998, por exemplo), compensado hoje por tolerâncias de 0,004. A planilha continua em reais.
- **Motivo:** a revisão 1 pedia testes de unidade do Disponível na Fase 0, mas só extraía o domínio na Fase 3; hoje o cálculo do cliente só é testado pelo E2E.
- **Critério de aceite:** os casos da seção 11.1 rodam em `npm test`, sem Chrome.

#### 6.2 Novo modelo do Disponível

- [ ] `resumo` devolve `renda`, `recebida`, `aReceber`, `jaSaiu`, `contasAPagar`, `faltaGuardar`, `disponivel`, `nosPlanos`, `sobraPrevista`, `sobraRealizada` e `pendencias`, com as fórmulas da seção 4.3 (reserva só com plano, teto de Guardar); sai `disponivel = sobra` e sai `aindaNaConta`.
- [ ] Herói, composição, KPIs, tela Mês, folha "Como calculamos" e avisos usam os campos novos e o glossário.
- [ ] Ações "Quitar" (fixo com lançamento abaixo do plano) e "Não vem mais" (renda recebida abaixo da prevista): encerram a categoria no mês, com Desfazer. Recomendado (seção 15): marcação `quitado:aaaa-mm:categoria` em `config`, sem regravar o plano.
- [ ] Servidor: `salvarCfg_` (`src/Codigo.gs:384`) aceita chaves validadas por padrão (`quitado:`; depois `categoriaGuardar` e `fechado:`), com remoção; `paraCliente_` (241–268) as envia; o cliente as guarda num mapa próprio (hoje `aplicarOp` grava `cfg` direto em `S.dados`, `src/App.html:196`); o backup as leva, na `versao: 3` (hoje 2, linha 1759). Toda chave nova tem padrão seguro se sumir.
- [ ] Remover "Até R$ X por dia"; herói arredondado ao real; situação em palavras (seção 4.4).
- **Critério de aceite:** a tabela de leitura da seção 4.3 vira teste e passa; receber o vale não muda o Disponível; nenhum gasto positivo aumenta o Disponível; os casos do E2E que fixam a regra antiga são reescritos (seção 11.2).

#### 6.3 Rótulos por fase e meses passados

- [ ] Herói e KPIs de mês passado usam `sobraRealizada`; com pendências, mostram a contagem e o valor (seção 4.5).
- [ ] Gráfico anual (`cartaoAno`, `src/App.html:947`): meses passados com `sobraRealizada` (barra cheia), a partir do primeiro mês com lançamento; mês atual "em andamento" e meses futuros com `sobraPrevista` (contorno); "Melhor", "Pior" e "Média" só de meses passados com dados (hoje a média divide por 12, com projeções, linha 972); acumulado realizado e projeção em linhas separadas.
- [ ] Planilha: rodapé "Sobra" com `sobraRealizada` nos meses passados e `sobraPrevista` no mês atual e nos futuros (`src/App.html:1134–1153`); os totais de Renda e de saídas seguem a mesma regra, senão o rodapé não fecha (hoje somam o valor de cada célula, com plano onde não há lançamento, linhas 1105–1113).
- [ ] Atualizar `docs/ARQUITETURA.md` (seção "Regras de cálculo").
- **Critério de aceite:** nenhuma tela diz "realizada" para um valor que contenha plano; Início, Mês e Planilha mostram o mesmo número para a mesma pergunta.

#### 6.4 Componente único de valor

- [ ] Remover o ouvinte global da máscara (`src/App.html:2062`); um só interpretador (`paraNumeros`) em todos os campos.
- [ ] A entrada em centavos fica só no teclado numérico do formulário "Novo lançamento" no celular.
- [ ] Campos de valor com prefixo "R$", `inputmode="decimal"`, formatação no blur e sem reescrever a cada tecla.
- [ ] Aceitar "1200", "1.200", "12,00", "1.200,50" e "0,01"; onde a dica anunciar, também "217,93 176,15" e "36*4".
- [ ] Multiplicador só com "*": "x" e "×" (`src/App.html:56`) se confundem com o "10x" do parcelamento (seção 3.12); até existir "Parcelar", confirmar todo multiplicador.
- [ ] Sinal: botão "Estorno/devolução" no teclado do celular; nos demais campos, aceitar "-" e "−" (U+2212, o sinal que o app exibe, linhas 19–20); o valor negativo aparece com o rótulo "estorno".
- [ ] Valor fora do normal: pedir confirmação acima de 10× a média de 3 meses da categoria, ou acima de R$ 100.000 sem histórico (limiares a calibrar; seção 15). Conferir o total da linha: em "1200x10" nenhum valor isolado passa do limiar.
- [ ] Atualizar as verificações do E2E que hoje exigem a máscara (`testes/e2e.mjs:380–381` e `394–395`).
- [ ] `name`, `id` e `aria-describedby` em todos os campos.
- **Critério de aceite:** "1200" num plano grava R$ 1.200,00; "217,93 176,15" no painel grava dois lançamentos; abrir e salvar um estorno de −R$ 50 mantém −R$ 50; nenhum campo grava um valor diferente do que mostra.

#### 6.5 Lançamento rápido no mês em exibição

- [ ] Fazer `lancarRapido` (`src/App.html:439`) usar o mês em exibição (`S.ano`/`S.mes`), não `hoje()`.
- [ ] Mostrar no campo um chip "Hoje" ou "Set 2026"; fora do mês atual, gravar sem dia ou perguntar.
- [ ] Virada do mês com o app aberto: a tela fica no mês da abertura (`S.ano`/`S.mes`, `src/App.html:121`) e, no dia 1º, o lançamento rápido apontaria para o mês anterior; ao voltar para a aba (`visibilitychange`, linha 2182), acompanhar a virada se a pessoa estava no mês atual.
- [ ] Adicionar teste E2E: navegar para setembro, lançar rápido, conferir que o lançamento aparece em setembro.
- **Critério de aceite:** é impossível lançar no mês errado sem um aviso explícito.

#### 6.6 Menu "Mês" e "Contas a pagar"

- [ ] Renomear "Planejar mês" (`src/App.html:569`) para "Mês".
- [ ] "A vencer este mês" vira "Contas a pagar", com o restante de cada conta e os botões "Confirmar" e "Quitar"; "vence dia X" só volta com data de vencimento (seção 9.1).
- [ ] `confirmarPrevisto` (`src/App.html:1593`) lança o que falta (plano − lançado), não o plano inteiro, quando já houver pagamento parcial.
- **Critério de aceite:** o rótulo do menu corresponde à tela; nenhum cartão fala em vencimento sem data.

#### 6.7 Médias só com o realizado

- [ ] `media3` passa a usar só o lançado: mês sem lançamento conta zero, a partir do primeiro mês com dados; planos nunca entram na média.
- [ ] A janela usa só meses passados. Hoje, ao planejar dezembro em 18/11, ela inclui novembro pela metade (`src/App.html:305–310`): a sugestão de Mercado sai R$ 980,67 em vez de R$ 1.212,95 (agosto a outubro), 19% menor; a de Transporte, 29% menor.
- **Risco aceito:** uma conta esquecida baixa a média; o fechamento do mês (seção 8.2) resolve na origem.
- **Critério de aceite:** um plano nunca lançado não vira sugestão nem projeção; a sugestão de um mês futuro não usa o mês corrente.

#### 6.8 Documentação e comunicação

- [ ] `docs/ARQUITETURA.md`, `docs/USAR.md` e README com o glossário e exemplos.
- [ ] `CHANGELOG.md`: versão 2.8.0 "Números corretos".
- [ ] Aviso único no app, "O que mudou nos números", com link para "Como calculamos": mostra uma vez o valor antigo, o novo e a diferença, e lista as variáveis com plano, para quem cadastrou contas (luz, água) em Variáveis movê-las para Fixos (seção 4.7).
- [ ] Publicação e reversão: cópia da planilha antes e nova versão na mesma implantação ("Atualizar agora" da 2.7.0 ou à mão, `docs/ATUALIZAR.md`). Reverter é reimplantar a versão anterior, sem migração: a 2.6.2 e a 2.7.0 regravam as chaves desconhecidas de `config` sem perdê-las (`src/Codigo.gs:172–182`, iguais nas duas; conferido no mock com a 2.6.2). Não reverter para a v1: ela regrava todas as abas a partir da cópia do aparelho, inclusive a `config` (`docs/ARQUITETURA.md`, "Sincronização").
- **Critério de aceite:** `npm test` e `npm run test:e2e` verdes; documentação e código contam a mesma história.

---

## 7. Versão 2.8.1 — Rede de segurança e acessibilidade (Fase 0b, ~1 semana)

#### 7.1 Ações em lote, destrutivas e de reclassificação

- [ ] "Repetir até dezembro" (`src/App.html:1565`): listar os meses afetados, avisar quais já têm plano, pedir confirmação e oferecer Desfazer.
- [ ] Mudança de grupo (`MUDAR['cat-grupo']`): entre saída e Renda, bloquear e explicar se houver lançamentos (inverte o sinal do histórico); sem lançamentos, confirmar. Entre Fixos e Variáveis, permitir com aviso: o realizado não muda (`src/App.html:339–352`), só as reservas do mês atual e dos futuros; é assim que uma conta cadastrada em Variáveis passa a ser reservada. Validar também no servidor (`salvarCat_`).
- [ ] Proteger "Guardar" por `config.categoriaGuardar` (id estável): sem mudança para Renda nem exclusão; migrar dados antigos. Se a chave sumir, volta a valer a busca atual (`catGuardar()`, `src/App.html:151–156`).
- [ ] Importação (`src/App.html:1678`): prévia de aceitos/ignorados com motivo, "Baixar backup agora" e confirmação digitada para "Substituir".
- [ ] Servidor (`importar_`): devolver a contagem de ignorados e os primeiros motivos; nada de `catch` vazio. Planos inválidos também somem sem aviso (`src/Codigo.gs:428–432`). "Substituir" mantém a `config` antiga (do arquivo, só `nome` e `tema`, 452–456); as marcas novas também precisam vir do arquivo.
- [ ] Renomear "Exportar CSV" da Planilha para "Exportar lançamentos (CSV)".
- **Critério de aceite:** nenhuma ação em lote ou destrutiva fica sem confirmação ou Desfazer; uma importação com registros inválidos informa o que foi ignorado.

#### 7.2 Desfazer confiável

- [ ] O aviso não some enquanto tem foco ou o ponteiro em cima; tempo mínimo de 10 s.
- [ ] Um novo aviso não apaga o Desfazer anterior: manter uma pilha das últimas ações da sessão e oferecer Ctrl+Z no computador para desfazer a mais recente.
- [ ] Toda ação em lote (copiar plano, preencher com médias, limpar o mês, repetir até dezembro, importar em modo juntar) entra na pilha.
- **Critério de aceite:** com teclado e leitor de tela, dá para desfazer as duas últimas ações.

#### 7.3 Acessibilidade

- [ ] "Usar sugestão" (`src/App.html:1081`): botão alcançável pelo Tab, com alvo de 44 px e foco visível.
- [ ] Alvos ≥ 24×24 px em todos os controles; gráfico anual a 320 px rolável com 28–32 px por mês ou com seis meses por vez.
- [ ] `scroll-padding-bottom: calc(92px + env(safe-area-inset-bottom))` no `html` e `scroll-margin-bottom` nos focáveis (2.4.11).
- [ ] `inert` no `#app` enquanto uma folha estiver aberta, mantendo o foco preso. Folhas (`#camada`) e avisos (`#avisos`) já ficam fora do `#app` (`src/Index.html:25–35`); o atributo funciona nos navegadores atuais desde abril de 2023 (MDN).
- [ ] Região viva para a sincronização só com problemas: sem conexão, recusa e pendências (4.1.3).
- [ ] `id`/`name` no campo "Nome do controle" e nos demais.
- [ ] Testar 200% de zoom e navegação só por teclado.
- **Critério de aceite:** navegação só por teclado conclui "novo lançamento", "planejar" e "ver composição"; axe sem violações sérias; 320 px sem rolagem horizontal da página; 200% sem perda de conteúdo.

#### 7.4 Transparência sobre terceiros

- [ ] Texto "Sobre" exato: os dados financeiros ficam só na planilha; o navegador também busca a fonte no Google Fonts, o ícone no GitHub e, desde a 2.7.0, o aviso de versão nova no GitHub ou no jsDelivr (desligável), e esses serviços veem o endereço IP. O `docs/SEGURANCA.md` da 2.7.0 já diz isso; o texto do app, agora no cartão "Atualizações", ainda diz "nenhum servidor além do Google" (commit `54f748c`, `src/App.html:1882`).
- **Critério de aceite:** nenhum texto do app promete mais privacidade do que entrega.

---

## 8. Versão 3.0.0 — Clareza para decidir (Fase 1, 3–4 semanas)

**Objetivo:** a home responde "posso gastar?", "o que falta pagar?", "como estou nos planos?" e "onde foi?" sem repetir números; meses passados ficam fechados.

#### 8.1 Home por perguntas

Ordem recomendada:

1. **"Posso gastar?"** — herói da seção 4.4.
2. **"O que falta pagar?"** — Contas a pagar (com Confirmar e Quitar) e renda a receber.
3. **"Como estou nos planos?"** — Plano do mês: situação por categoria variável (cor + texto), restante de cada uma e Guardar. Substitui Meta + Ritmo.
4. **"Onde foi?"** — barras horizontais ordenadas, com nome, valor e percentual.
5. **"Últimos lançamentos"** e link para o extrato.
6. Link "Ver o ano" para a Planilha, sem o gráfico anual na home.

- [ ] Remover os quatro KPIs ou trocá-los por informações que não se repetem.
- [ ] Remover os textos explicativos longos; um único "Como calculamos".
- [ ] No celular, divulgação progressiva para histórico e explicações.
- **Critério de aceite:** a 390 px a home cabe em cerca de duas telas (hoje 3.320 px, cerca de quatro); três pessoas, com os dados de exemplo, respondem "quanto posso gastar", "o que falta pagar" e "onde foi" em menos de 10 s cada.

#### 8.2 Fechamento do mês

- [ ] Ao abrir o app num mês novo, ou pelo herói de um mês passado com pendências: "Fechar outubro".
- [ ] A tela lista as pendências (seção 5.1) com três ações: "Foi pago/recebido" (lança na data informada), "Não aconteceu" (encerra a categoria no mês, com a mesma marcação de "Quitar", sem apagar o plano) e "Deixar para depois".
- [ ] Mostra a sobra realizada final e, quando existir (seção 9.5), oferece levar a sobra para o mês seguinte.
- [ ] Marcar o mês como fechado em `config` (`fechado:2026-10`, com a sobra realizada como valor), pela mudança do servidor da seção 6.2 (hoje `salvarCfg_`, `src/Codigo.gs:384`, só aceita `nome` e `tema`).
- [ ] Editar ou apagar lançamento de mês fechado pede confirmação neste aparelho, que regrava a sobra guardada. Outro aparelho com fila antiga, uma aba da versão anterior ou a edição direta na planilha passam pelo servidor sem essa confirmação (`sincronizar`, `src/Codigo.gs:75–114`); se a sobra realizada deixar de bater com a guardada, o mês mostra "alterado depois do fechamento".
- **Critério de aceite:** um mês fechado não tem pendências; toda mudança depois do fechamento é confirmada neste aparelho ou aparece como aviso.

#### 8.3 Seletor de mês/ano e deep links

- [ ] Seletor acessível (grade de 12 meses + ano + "Hoje").
- [ ] Suportar `?tela=mes&ano=2026&mes=11` ao abrir; `lerAtalhosDaUrl` (`src/App.html:2152`) já lê `tela` e `novo` (por `google.script.url.getLocation`) e precisa ler `ano` e `mes`.
- [ ] Manter os parâmetros no endereço com `google.script.history.push(estado, parametros)`; hoje o app passa `null` (linha 1852) e o endereço nunca leva ao mês.
- [ ] "Copiar link deste mês": a 2.7.0 já envia o endereço publicado (`urlApp`, por `ScriptApp.getService().getUrl()`) e já copia texto em "Atualizar à mão…" (`navigator.clipboard`, com `execCommand` de reserva); reusar os dois. O iframe do Apps Script não deixa o script definir o atributo `allow`, e esta revisão não conferiu a cópia em produção; se falhar, mostrar o link para copiar à mão.
- [ ] Na busca do Extrato, mostrar o escopo (mês ou ano inteiro) e permitir alternar.
- **Critério de aceite:** chegar a qualquer mês de qualquer ano em até três interações; o link abre no mês certo.

#### 8.4 Planejar com feedback

- [ ] Salvar plano com retorno inline ("Plano salvo"), sem depender de blur silencioso.
- [ ] Em "Copiar de [mês]" e "Preencher com as médias", mostrar quantas categorias mudam antes de aplicar.
- [ ] "Copiar de [mês]" deixa escolher, na prévia, entre o plano e o lançado daquele mês. Hoje, como descreve o `docs/USAR.md:87`, grava o lançado sempre que houve lançamento (`valorFechado`, `src/App.html:1984`): com um plano de R$ 1.200 em Mercado em outubro, "Copiar de outubro" gravou R$ 1.436,59 em novembro, e quem esperava copiar o plano não percebe a troca.
- [ ] "Ajustar plano" na tela Mês sem duplicar o link de "Ajustar meta".
- Retirado da revisão 1: distinguir "sem plano" de "plano zero". O servidor apaga o plano quando o valor é zero (`src/Codigo.gs:365`; `src/App.html:189`), então "plano zero" não existe nos dados; o ganho não justifica mudar essa regra.
- **Critério de aceite:** toda edição de plano tem retorno positivo ou negativo; nenhum campo fica "salvando" sem sinal.

#### 8.5 Onboarding com valor imediato

- [ ] Oferecer no primeiro acesso "Ver com dados de exemplo" (`exemplos/dados-exemplo.json`), com o banner "Dados de exemplo; nada foi gravado" e "Começar do zero". O modo exemplo precisa bloquear `registrar()` e não usar o cache local da planilha real.
- [ ] Passo opcional de três campos: renda mensal, principais fixos e meta de Guardar.
- [ ] Perguntar sobre início no meio do mês: "Já gastou ou recebeu algo neste mês antes de começar?".
- [ ] Estados vazios com ação ("Adicionar renda", "Criar primeiro plano").
- **Critério de aceite:** uma pessoa nova vê um número útil antes de cadastrar dez lançamentos; o modo exemplo não grava nada na planilha.

#### 8.6 Gráficos e cores

- [ ] "Onde foi" e demais gráficos de categoria com rótulo direto (nome + valor), numa cor só: a cor deixa de carregar informação.
- [ ] Paleta das iniciais (monogramas) sem os tons de status, atribuída pela ordem da categoria e não por hash; o nome fica sempre ao lado.
- [ ] Verde, âmbar e vermelho reservados para situação, sempre com texto.
- [ ] Gráfico anual: "em andamento" no mês atual, contorno para previsto, cheio para realizado; tabela equivalente para leitores de tela.
- [ ] Mapa de calor com sinal além da cor (▲/▼ ou texto).
- **Critério de aceite:** em escala de cinza, todo gráfico continua legível; nenhum estado depende só de cor.

#### 8.7 Tipografia e fontes

- [ ] Converter tamanhos de texto para `rem`.
- [ ] Decidir a fonte (seção 15): pilha de fontes do sistema, sem custo nem terceiros, ou DM Sans embutida em base64 (subconjunto latino), já que o Apps Script não serve arquivos de fonte. Contexto: em 2022 um tribunal de Munique condenou um site por enviar o IP de visitantes ao Google Fonts sem consentimento ([The Register](https://www.theregister.com/2022/01/31/website_fine_google_fonts_gdpr/)).

---

## 9. Versão 3.1.0 — Planejamento de verdade (Fase 2, 5–7 semanas)

**Objetivo:** contas com vencimento, recorrência e parcelas reais; menos digitação.

#### 9.1 Recorrências e vencimentos

- [ ] Aba nova opcional `recorrencias`: `id | categoriaId | descricao | valor | dia | inicio | fim | ativa`, com `inicio` e `fim` como números aaaamm (202611; `fim` opcional), como as abas atuais guardam ano e mês; texto "2026-11" pode virar data no Sheets (não conferido numa planilha real; o mock só imita a conversão de números). Não adicionar colunas às abas existentes: a v1 e a v2 regravam só as colunas que conhecem (`escrever_`, `src/Codigo.gs:164–170`), e a coluna nova fica desalinhada quando um lançamento é apagado.
- [ ] **Relação com o plano:** o plano efetivo de uma categoria no mês é o plano gravado naquele mês, se houver; senão, a soma das recorrências ativas da categoria. Assim nada é contado duas vezes e nenhum plano é gravado em massa. "Só este mês não vem" precisa de uma marcação de pular, como a quitação, porque plano zero não existe (o servidor apaga, `src/Codigo.gs:365`). "Copiar de [mês]", "Preencher com as médias" e "Repetir até dezembro" gravam planos que passam a valer no lugar da recorrência; a prévia (seção 8.4) avisa.
- [ ] "Contas a pagar" ganha data: "vence dia 10", "atrasada", "paga em".
- [ ] Confirmar lança na data do vencimento.
- [ ] Marcar "débito automático/Pix Automático": a conta aparece como "sai sozinha dia 10", sem pedir ação.
- [ ] Editar "só este mês" grava o plano do mês; "deste mês em diante" encerra a recorrência e cria outra.
- [ ] Servidor: validar e aplicar operações `rec`/`rec-` com a mesma revisão.
- Lembretes só dentro do app: sem push e sem escopo de e-mail, mantendo `@OnlyCurrentDoc`.
- **Critério de aceite:** um fixo mensal aparece no mês seguinte sem digitação; confirmar usa a data certa; atraso é visível; nenhum valor aparece duas vezes.

#### 9.2 Parcelas

- [ ] "Parcelar em N vezes" no novo lançamento: cria N lançamentos em meses consecutivos, com descrição "Geladeira (3/10)" e os centavos de arredondamento na primeira parcela.
- [ ] Regime de caixa (decisão da seção 15): a parcela entra no mês em que será paga; sem cadastro de cartão, a pessoa escolhe o mês da primeira parcela (padrão: o próximo).
- [ ] Ligação entre parcelas sem aba nova: id com prefixo comum (`p<grupo>-03`), aceito pelo padrão de id atual (`RE_ID`, `src/Codigo.gs:33`); editar ou apagar "esta e as próximas".
- [ ] Parcelas futuras entram automaticamente na sobra prevista dos meses seguintes.
- [ ] Um valor digitado com "10x" oferece "Parcelar em 10×" em vez de multiplicar (seção 3.12).
- **Critério de aceite:** uma compra em 10× aparece nos dez meses, com Desfazer do conjunto.

#### 9.3 Duplicar e transformar em recorrência

- [ ] Ação "Duplicar" no extrato e na categoria.
- [ ] "Repetir no próximo mês" num lançamento.
- [ ] Transformar lançamento em recorrência, com valor e dia sugeridos.
- [ ] Desfazer em todas.
- **Critério de aceite:** duplicar um lançamento leva menos de três toques; o Desfazer funciona.

#### 9.4 Importação CSV/OFX

- [ ] Tela "Importar extrato": arquivo, mapeamento de colunas (data, descrição, valor), prévia das primeiras linhas, relatório de aceitos/ignorados com motivo, confirmação e backup.
- [ ] Formatos brasileiros: OFX em SGML com `CHARSET:1252` (converter para UTF-8); CSV com `;` e vírgula decimal; datas dd/mm/aaaa; fatura de cartão com sinal invertido (compra positiva).
- [ ] Duplicados: há banco que gera o `FITID` de novo a cada download ou muda o formato entre canais (relatos no KMyMoney). Usar o FITID quando existir e também data + valor + descrição normalizada + número da ocorrência no dia, para não descartar duas compras iguais; quando só uma das chaves bater, a prévia mostra "possível duplicado".
- [ ] Sem coluna nova: o id do lançamento importado leva um hash da conta e do FITID, que cabe no `RE_ID` (`src/Codigo.gs:33`); reimportar substitui pelo id (`salvarLanc_`, 312–317).
- [ ] Segurança: arquivo lido só no navegador, sem `eval`; descrições com escape de HTML (`esc`, `src/App.html:22`) e proteção contra fórmula (`celulaTexto_`, `src/Codigo.gs:494–497`); tamanho limitado e envio em lotes (até 200 operações por vez; o servidor recusa mais de 500, linha 34).
- [ ] Sem dependências; parser simples, testado com arquivos de exemplo fictícios.
- **Critério de aceite:** importar 100 linhas com 5 duplicados mostra 95 aceitos e 5 ignorados com motivo; duas compras iguais no mesmo dia entram as duas; reimportar o mesmo arquivo não duplica nada; nada é gravado antes da confirmação.
- Referências: [gist de leitura de OFX com CHARSET 1252](https://gist.github.com/renatomb/c9dfee9ffa95fb9e1815aa09b02cfa06), [KDE, bug 369448](https://bugs.kde.org/show_bug.cgi?id=369448) (o mesmo banco com FITIDs diferentes por canal), [KMyMoney, 2019](https://mail.kde.org/pipermail/kmymoney-devel/2019-March/022983.html) (FITID único só dentro de um download).

#### 9.5 Transporte de sobra e rollover

- [ ] Antes do rollover por categoria, criar o transporte da sobra do mês. Hoje cada mês começa só com a própria renda: um envelope transportado aumentaria a reserva do mês seguinte sem trazer o dinheiro, e a pessoa pareceria mais pobre.
- [ ] Modelo sugerido: no fechamento (seção 8.2), "Levar R$ X para novembro" cria em novembro uma entrada numa categoria técnica de renda ("Sobra de outubro"), excluída dos totais anuais para não contar a mesma sobra duas vezes. Excluída também da sugestão de meta (`sugestaoMeta`, `src/App.html:777–790`, que soma a renda recebida) e das médias.
- [ ] Só depois: `acumula` por categoria (em `config` ou em aba nova), com prévia do valor.
- **Critério de aceite:** transportar não altera meses passados; a soma do ano não conta a mesma sobra duas vezes.

#### 9.6 Backup e restauração

- [ ] Mostrar "Último backup" em Ajustes.
- [ ] Botão "Baixar backup antes de importar" no fluxo de substituição.
- [ ] Exportar CSV com escopo explícito (lançamentos ou tabela do ano).
- [ ] Formato: `recorrencias` entra no backup versão 3 (seção 6.2), e a importação aceita as versões 1 a 3. Numa versão anterior, um backup 3 perde marcas e recorrências sem aviso (`importar_` ignora o que não conhece, `src/Codigo.gs:400–458`); a documentação avisa.
- **Critério de aceite:** a pessoa consegue restaurar um backup sem ler documentação; exportar e importar um backup 3 devolve a mesma planilha, com marcas e recorrências.

---

## 10. Fase 3 — Escala e qualidade contínua

#### 10.1 Cartão de crédito com fatura

- [ ] Cadastro do cartão (fechamento e vencimento); compras do cartão agrupadas na fatura do mês de pagamento; limite. Depende das parcelas (seção 9.2).

#### 10.2 Integração contínua

- [ ] GitHub Actions com `npm test`, E2E (Chrome do sistema via `CHROME_PATH`), axe e capturas em 320/390/1440.
- [ ] Verificação de 200% de zoom e de navegação só por teclado.

#### 10.3 Operação, privacidade e desempenho

- [ ] Diagnósticos em Ajustes: versão, revisão, fila, última sincronização, operações recusadas.
- [ ] CSP: viabilidade incerta. O `HtmlOutput` ignora meta tags escritas no arquivo e só aceita quatro pelo `addMetaTag`, e o app não controla os cabeçalhos HTTP; uma CSP por meta tag dentro do iframe não foi conferida. Investigar antes de prometer.
- [ ] Medir e documentar o limite de linhas do `sincronizar`, que lê todas as abas a cada lote e regrava por inteiro cada aba que mudou (`src/Codigo.gs:164–170` e 220–238); parcelas e ações em lote vão numa chamada só (lotes de até 200 operações, `src/App.html:220`).
- [ ] Estilo de impressão para o relatório mensal.

#### 10.4 Produto, se houver demanda

- [ ] Metas múltiplas.
- [ ] Rateio de lançamento entre categorias.
- [ ] Modo casal/compartilhado (avaliar permissões e OAuth).
- [ ] Relatório mensal em PDF.

---

## 11. Estratégia de testes

### 11.1 Casos obrigatórios da 2.8.0

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Gasto dentro do plano | mercado com plano de 1.200, lançar 100 | disponível −100; nos planos −100; sobra prevista igual |
| Primeiro lançamento abaixo do plano | compras com plano de 420, lançar 378 | disponível −378; sobra prevista igual |
| Gasto acima do plano | categoria já acima do plano, lançar 100 | disponível −100; sobra prevista −100 |
| Sem plano | plano 0, lançar 300 | disponível −300; sobra prevista −300 |
| Estorno sem plano | conta fixa e variável sem plano, lançar −50 | disponível +50; nenhuma conta a pagar |
| Resgate em Guardar | meta 500, lançar −1.000 em Guardar | disponível +1.000; falta guardar 500 |
| Renda negativa sem plano | lançar −100 numa renda sem previsão | disponível −100; a receber 0 |
| Guardar no grupo Variáveis | meta 500, nada guardado | 500 em falta guardar, nada em nos planos |
| Estorno com plano | mercado, lançar −50 | disponível +50; nos planos +50 |
| Conta fixa paga pelo plano | plano 420, lançar 420 | disponível igual |
| Conta fixa mais barata + Quitar | plano 420, lançar 390, Quitar | igual; ao quitar, +30; o plano continua 420 |
| Quitar com dois aparelhos | A quita; B lança mais 60 na mesma conta | disponível −60; a conta não aparece "acima do plano" |
| Conta fixa mais cara | plano 420, lançar 450 | disponível −30 |
| Vale do salário | prevista 7.900, receber 3.160 | disponível igual; a receber 4.740 |
| Não vem mais | prevista 7.900, recebida 7.500, "Não vem mais" | disponível −400 |
| Guardar abaixo da meta | meta 500, guardado 300 | falta guardar 200 |
| Guardar acima da meta | meta 500, guardado 700 | disponível 200 menor do que com 500 guardados |
| Mês passado com plano sem lançamento | plano 500 sem lançamento | herói usa a sobra realizada e mostra 1 pendência |
| Mês atual | fase atual | nunca "realizada" |
| Campo de valor | "1200" | 1.200,00 |
| Editar estorno | abrir e salvar um lançamento de −50 | continua −50 |
| Vários valores no painel | "217,93 176,15" | dois lançamentos: 217,93 e 176,15 |
| Multiplicação | "36*4"; "1200x10 compras" | quatro lançamentos de 36,00; "x" pede confirmação |
| Valor fora do normal | 10× a média da categoria | pede confirmação |
| Média sem planos | categoria só com plano nos três meses anteriores | sugestão 0 |
| Média de mês futuro | planejar dezembro em 18/11 | usa agosto a outubro |
| Arredondamento | disponível −0,40 | "R$ 0", nunca "−R$ 0" |
| Propriedade | estados aleatórios + um lançamento positivo numa saída | o disponível nunca sobe |
| Lançamento rápido em outro mês | ver setembro, lançar "1,00 mercado" | grava em setembro, com aviso |
| Menu "Mês" | clicar no item | o modo corresponde ao rótulo |
| "Usar sugestão" | Tab | alcançável e acionável |

### 11.2 E2E (Puppeteer)

- [ ] Primeiro acesso com dados de exemplo.
- [ ] Novo lançamento no celular e no computador, inclusive estorno.
- [ ] Editar, apagar e desfazer as duas últimas ações.
- [ ] Planejar, copiar, preencher com médias, limpar.
- [ ] Quitar e Não vem mais.
- [ ] Fechar o mês (3.0.0).
- [ ] Parcelar (3.1.0).
- [ ] Importar backup e ver rejeições.
- [ ] Offline/fila/retry.
- [ ] 320 px e 200% sem overflow.
- [ ] Teclado: skip link, abrir folha, salvar, fechar, navegar na planilha.
- [ ] Reescrever a partir da tabela de leitura (4.3) os casos que fixam a regra ou os rótulos atuais (`testes/e2e.mjs`, linhas 176, 350, 405, 454, 474 e 596) e os da máscara (377 e 391); o 454 só muda depois da decisão da seção 15.
- [ ] Compatibilidade: o `Codigo.gs` da versão anterior, tirado do git e rodado no mesmo mock, preserva as chaves novas de `config`.

### 11.3 Acessibilidade

- [ ] axe sem violações sérias em Início, Extrato, Mês, Planilha, Ajustes, Novo lançamento e Planejar.
- [ ] Contraste AA nos dois temas.
- [ ] Foco não obscurecido pela barra inferior (2.4.11).
- [ ] Alvos ≥ 24 px (2.5.8).
- [ ] Nenhuma informação só por cor (1.4.1).
- [ ] 200% de zoom (1.4.4).
- [ ] 320 px (1.4.10), exceto a tabela anual.
- [ ] Leitores de tela: composição, gráfico anual, avisos e sincronização.

---

## 12. Validação sem telemetria

O app não coleta uso, por desenho. A validação usa o que é possível sem quebrar essa promessa:

1. **Uso real.** As pessoas que usam o app em casa usam a 2.8.0 por duas semanas e anotam, num diário curto, cada vez que um número surpreendeu e por quê. Uma vez por semana, respondem sem ajuda: quanto ainda posso gastar até o fim do mês; quanto falta guardar; o que falta pagar. Observar de propósito os dois comportamentos que já foram revertidos (seção 4.7): lançar uma renda abaixo do previsto e ter um plano variável ainda sem lançamento.
2. **Teste de tarefas com 3 a 5 pessoas**, com os dados de exemplo na prévia local (`npm run preview`, nada é publicado nem gravado), moderado, 20 minutos:
   - "Quanto você pode gastar até o fim do mês?" — sucesso, tempo, confiança de 1 a 7;
   - "Lance um gasto de R$ 32,90 no mercado." — tempo, erros, uso do teclado;
   - "Quanto falta para a meta de Guardar?";
   - "Quanto você gastou em mercado em outubro?";
   - "O que falta pagar este mês?".

   Registrar os erros de interpretação de "Disponível", "nos planos" e "sobra prevista".
3. **Sinais que a própria planilha já tem**, calculados no app quando a pessoa abre "Diagnósticos" (nada sai da planilha): meses passados com pendências, meses com plano, lançamentos sem descrição e operações recusadas.
4. **Checagens objetivas por versão:** testes verdes, axe, 320 px e 200%.

O experimento da revisão 1 (5–8 pessoas, intenção de gasto, retenção, tempo para lançar) saiu: sem telemetria e com poucos usuários, esses números não existem nem teriam poder estatístico, e a correção do bug 3.1 é objetiva.

---

## 13. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Os números mudam na atualização | Aviso "O que mudou nos números", changelog e "Como calculamos" |
| O número total incentiva gasto | Herói arredondado, situação em palavras e sobra prevista ao lado; se o uso mostrar o problema, destacar a sobra prevista |
| "Quitar" esquecido segura dinheiro | Restante de cada conta visível em "Contas a pagar", com o botão ao lado |
| Renda a receber que não vem | "Não vem mais"; o fechamento do mês pergunta |
| A regra vai e volta outra vez | Decisão escrita do dono antes de codar (15); tabela de leitura e E2E como contrato (4.7) |
| Conta de valor variável em Variáveis fica sem reserva | Troca livre entre Fixos e Variáveis (7.1); o aviso da 2.8.0 lista as variáveis com plano (6.8) |
| Abas e chaves novas quebram versões antigas | Só abas novas e chaves de `config`, que a 2.6.2 e a 2.7.0 preservam; nunca colunas nas abas atuais (desalinham); ano e mês como números; teste com o `Codigo.gs` da versão anterior |
| A v1 aberta num aparelho apaga o que a v3 gravou | A v1 regrava todas as abas, inclusive a `config`: não convive com a v2 nem com a v3; reversão só para a versão anterior da v2 (6.8) |
| Importação destrutiva | Prévia, confirmação digitada e backup obrigatório |
| Recorrências e parcelas contadas duas vezes | Regra do plano efetivo e marcação de pular (seção 9.1) e testes |
| Acessibilidade regride | axe, teclado e zoom no CI; checklist por PR |
| Aumento de escopo | 2.8.0 sem funcionalidade nova além de "Quitar" e "Não vem mais"; fases separadas; não-objetivos explícitos |

---

## 14. Referências

**Conferidas na revisão 3 (24/11/2026):**

- Google Apps Script — [google.script.history](https://developers.google.com/apps-script/guides/html/reference/history), [google.script.url](https://developers.google.com/apps-script/guides/html/reference/url), [HtmlOutput](https://developers.google.com/apps-script/reference/html/html-output), [HTML Service: Restrictions](https://developers.google.com/apps-script/guides/html/restrictions)
- [Pedido de recurso: atributo `allow` no iframe do HtmlService](https://gist.github.com/mhawksey/5229abc45a0c39fc7cc4b60b9145f0b7)
- MDN — [inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert)
- OFX — [KDE, bug 369448](https://bugs.kde.org/show_bug.cgi?id=369448), [KMyMoney, 2019](https://mail.kde.org/pipermail/kmymoney-devel/2019-March/022983.html)
- Reconferidas: FinHealth (p. 12, 13, 19 e 20), Finsiders ("mais de 42%") e Mercado & Consumo (55,7%); a mensagem do GnuCash não diz "único por conta".

**Conferidas na revisão 2 (24/11/2026):**

- FinHealth — [Behavioral Design Guide: Tools to Manage Spending](https://finhealthnetwork.org/wp-content/uploads/2023/12/BE-Guide-Tools-to-Manage-Spending-2023.pdf) (p. 12–13 e 19–20; cita Ghosh & Huang, 2020, e Huang & Ghosh, 2018)
- PocketGuard — [Leftover](https://pocketguard.com/help/leftover/)
- Copilot — [Painel (Free to Spend)](https://intercom.help/copilotmoney/en/articles/6045480-dashboard-tab-overview), [Rollovers](https://help.copilot.money/en/articles/3790828-budget-rollovers)
- Monarch — [Rollover Budgets](https://help.monarch.com/hc/en-us/articles/4411119762196-Rollover-Budgets)
- YNAB — [Cartões de crédito](https://support.ynab.com/en_us/getting-started-credit-cards-in-ynab-H1pdorTTWl.md)
- Mobills — [Despesas fixas no cartão](https://mobills.zendesk.com/hc/en-us/articles/360052557934-How-to-manage-fixed-credit-card-expenses), [Como utilizar o Mobills](https://www.mobills.com.br/blog/mobills/como-utilizar-o-mobills/)
- W3C — [Understanding 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [Técnica G142](https://www.w3.org/WAI/WCAG22/Techniques/general/G142)
- Avisos com ação — [Scott O'Hara](https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html), [GitLab Design System](https://gitlab.com/gitlab-org/gitlab-services/design.gitlab.com/-/issues/2771)
- ABECS (via imprensa) — [Finsiders](https://finsidersbrasil.com.br/estudos-e-relatorios/cartoes-movimentam-r-45-tri-em-2025-alta-de-101-ante-2024-diz-abecs/), [Mercado & Consumo](https://mercadoeconsumo.com.br/05/12/2025/economia/cartoes-movimentam-353-do-pib-brasileiro-no-3o-tri-mostra-abecs/)
- Adiantamento salarial — [Serasa](https://www.serasa.com.br/ecred/blog/pagamento-dia-5-e-20-como-funciona), [Pontotel](https://www.pontotel.com.br/adiantamento-salarial/)
- Pix Automático — [Agência Brasil](https://agenciabrasil.ebc.com.br/economia/noticia/2025-06/banco-central-anuncia-o-pix-automatico)
- OFX — [gist com CHARSET 1252](https://gist.github.com/renatomb/c9dfee9ffa95fb9e1815aa09b02cfa06), [GnuCash sobre FITID](https://lists.gnucash.org/pipermail/gnucash-user/2025-December/118906.html)
- Google Fonts e GDPR — [The Register, 2022](https://www.theregister.com/2022/01/31/website_fine_google_fonts_gdpr/)

**Não conferido (revisão 3):** cópia para a área de transferência no iframe do Apps Script; CSP por meta tag; texto "aaaa-mm" virando data no `setValues` (só relatos de fórum); efeito dos parâmetros de `google.script.history.push` na barra de endereço.

**Da revisão 1, não reconferidas:**

- NN/g — [Dashboards](https://www.nngroup.com/articles/dashboards-preattentive/), [Complex applications](https://www.nngroup.com/articles/complex-application-design/), [Empty states](https://www.nngroup.com/articles/empty-state-interface-design/), [Mobile tables](https://www.nngroup.com/articles/mobile-tables/), [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- W3C — [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [WAI Tables](https://www.w3.org/WAI/tutorials/tables/)
- Apple HIG — [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data), [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- Material 3 — [Navigation bar](https://m3.material.io/components/navigation-bar/guidelines)
- CFPB — [Your money, your goals](https://files-prod.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_financial-empowerment_toolkit.pdf)
- Alenazi & Sas — [Creating and Managing Transactions and Budgets](https://eprints.lancs.ac.uk/id/eprint/222780/3/Creating_and_Managing_Transactions_and_Budgets-PURE.pdf)
- BCS HCI — [Evaluating Budgeting Apps](https://dl.acm.org/doi/10.14236/ewic/BCSHCI2023.1)
- Nubank — [How we created Tabs](https://building.nubank.com.br/how-we-created-tabs/)
- Monzo — [Magic moments](https://monzo.com/blog/2022/11/04/how-we-design-magic-moments-at-monzo), [Design Council](https://www.designcouncil.org.uk/our-resources/archive/articles/monzo-designing-good-mental-health-way-we-bank)
- Markswebb — [Best practices 2024](https://markswebb.com/insights/best-practices-from-mbr-2024), [Mobile Banking Rank 2025](https://markswebb.com/research/mobile-banking-rank-2025)
- Baymard — [Input fields](https://baymard.com/learn/input-fields), [Inline validation](https://baymard.com/blog/inline-form-validation), [Touch keyboards](https://baymard.com/labs/touch-keyboard-types)
- USWDS — [Data visualizations](https://designsystem.digital.gov/components/data-visualizations)
- UGA DASH — [Accessible data visualizations](https://dash.uga.edu/create-accessible-content/data-visualizations/)
- UK Analysis Function — [Testing dashboards](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-testing-dashboards-for-design-and-accessibility/)

**Não usadas como fonte:**

- Bilovich et al. — [Impressed by numbers](https://cepr.org/system/files/2022-08/Bilovich_IMPRESSED-BY-NUMBERS_THE-CONSUMER-BIAS-TOWARDS-OVERLY-PRECISE-NUMERICAL-FORECASTS.pdf): o site recusou o acesso automatizado e o conteúdo não foi conferido. O princípio 4 se apoia no guia da FinHealth.
- [YNAB vs Monarch vs Copilot 2026](https://walletgrower.com/compare/ynab-vs-monarch-vs-copilot): site de afiliados, com itens que não conferem com a documentação dos produtos.

---

## 15. Decisões tomadas (25/11/2026)

O dono delegou as decisões ("vou deixar você escolher as melhores decisões") e pediu um caminho de volta caso não goste do resultado (15.2).

### 15.1 Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Regra e ênfase do herói | **Disponível = renda − já saiu − contas a pagar − falta guardar − ainda nos planos.** Composição linha a linha logo abaixo e, no celular, "Já saiu · Reservado · Disponível". | É a única regra que atende às três decisões mais recentes do projeto ao mesmo tempo: reserva o plano variável sem lançamento (caso 454 do E2E: R$ 8.200), nunca sobe quando se gasta (bug 3.1) e não despenca com o vale (bug 3.2). O que a 2.0.2 queria ("o número reage ao que você lança") fica na composição, que muda a cada lançamento, e no aviso de cada lançamento. A FinHealth (p. 19) cita esse formato ("Money Left Over") como alternativa a destacar "quanto resta para gastar". |
| Regras revertidas (4.7) | Renda pelo maior valor entre prevista e recebida volta, com **a receber** visível e **Não vem mais**. A reserva do restante dos planos iniciados volta, com **Encerrar no mês**. | A 2.5.4 e a 2.2.0 resolveram um incômodo criando outro (3.1 e 3.2). As ações de encerrar dão o controle que a regra antiga dava sozinha, sem o número mentir. Os casos 350 e 596 do E2E mudam de propósito; o 454 continua valendo. |
| Contas de valor variável (luz, água) em Variáveis | Nada a fazer: com a regra escolhida, plano variável também é reservado. | A dúvida só existia no modelo da revisão 3. A troca livre entre Fixos e Variáveis (7.1) continua na 2.8.1. |
| Como registrar "Quitar" e "Não vem mais" | Marca na aba `config`: `encerrada:AAAA-MM:<categoria>` = `1`. Vale para fixos ("Quitar"), variáveis ("Encerrar no mês") e renda ("Não vem mais"). | Preserva o plano e a "sobra do plano", não gera falso "acima do plano" e independe da ordem entre aparelhos. A 2.7.1 preserva a chave (testado no mock). |
| Multiplicador | Só "*" multiplica; "x" e "×" deixam de multiplicar, e "1200x10" é recusado com uma dica. Sem confirmação extra para "*". | Remove a colisão com o "10x" do parcelamento; o "valor fora do normal" cobre o resto. |
| Valor fora do normal | Mais de 10× a média de 3 meses da categoria **e** acima de R$ 5.000; sem histórico, acima de R$ 100.000. Sobre o total da linha. | O piso de R$ 5.000 evita pedir confirmação para despesas pequenas mas raras (uma consulta veterinária de R$ 250 numa categoria de R$ 20 por mês). Calibrar no uso. |
| Estorno | Terceira opção do tipo no Novo lançamento: **Gasto · Estorno · Renda**. | Não ocupa altura na folha do celular (um botão separado fazia a folha rolar 39 px, reprovado pelo E2E). |
| Centavos no herói | **Mantidos** no número principal; só a linha "por dia" é arredondada ao real. | O projeto confere valores ao centavo; a evidência sobre precisão é preliminar. Uma mudança de cada vez. |
| Domínio testável | Seção pura dentro do `App.html`, entre marcadores, testada por `testes/dominio.test.mjs`. **Sem arquivo `Dominio.html`.** | Desde a 2.7.0, cada arquivo novo em `src/` é um passo a mais no "Atualizar à mão" e no instalador. |
| Resgate da reserva | Recomendar uma categoria de renda "Resgate da reserva" (documentação); lançamento negativo em Guardar também funciona, com o teto da falta. | Os dois caminhos dão números certos. |
| Regime do cartão e das parcelas | Caixa (Fase 2). | Sem mudança. |
| Fonte | DM Sans embutida (subconjunto latino) na 3.0.0. | Mantém a identidade visual. A revisão de 25/11 achou mais um motivo: com a rede lenta, a folha de estilo do Google Fonts travou a abertura do app no teste por minutos. |
| Numeração | 2.8.0 ("Números corretos") e 2.8.1 ("Rede de segurança e acessibilidade"). | A 2.7.x é do instalador. |

### 15.2 Reversão

- **Código:** cada versão publicada tem tag e Release (`v2.8.0`, `v2.8.1`, `v3.0.0`). Voltar é reimplantar no mesmo endereço o código da versão anterior: "Atualizar agora" (2.7.0) guarda uma cópia do projeto antes de trocar o código, e a versão anterior continua em **Gerenciar implantações**. O desenvolvimento segue no branch `melhorias-v3-2.8.0` (worktree `.claude/worktrees/v2.8.0`).
- **Dados:** nenhuma versão deste plano acrescentou colunas. A 2.8.0 grava chaves `encerrada:` na aba `config`; a 2.8.1, `categoriaGuardar`; a 3.0.0, `fechado:AAAA-MM`. A versão anterior preserva as chaves que não conhece e as ignora (testes de compatibilidade com o código da 2.7.1, da 2.8.0 e da 2.8.1 em `testes/servidor.test.mjs`): depois de voltar, os números seguem a regra daquela versão. A 3.1.0 traz a primeira aba nova (`recorrencias`, seção 9.1), que as versões anteriores não leem nem regravam.
- **Nunca** voltar para a v1: ela regrava todas as abas, inclusive a `config`.

## 16. Ordem de execução

1. **Decisões da seção 15**, por escrito, antes de codar: as de regras revertidas e "Quitar" mudam o que a 2.8.0 constrói.
2. **2.8.0 — Números corretos** (seção 6), começando pelo domínio testável (6.1) e pelas marcas em `config` no servidor (6.2). Sem experimento prévio.
3. Uso real por duas semanas (seção 12), em paralelo com a **2.8.1 — Rede de segurança e acessibilidade** (seção 7), que corrige riscos de perda de dados de hoje e não depende do resultado; ajuste dos rótulos ao fim.
4. **3.0.0 — Clareza para decidir:** home por perguntas, fechamento do mês, cores, seletor, onboarding (seção 8).
5. **3.1.0 — Planejamento de verdade:** recorrências, parcelas, importação, transporte de sobra (seção 9).
6. **Fase 3** contínua (seção 10).

Dependências: as marcas em `config` (6.2) servem a Guardar (7.1), ao fechamento (8.2) e a "pular este mês" (9.1); 9.5 depende de 8.2; 10.1 depende de 9.2. Prazo para uma pessoa com ajuda de IA: cerca de 12 a 16 semanas de calendário até a 3.1.0.

**Definição de pronto da v3:** quem abre o app entende, em menos de 10 segundos, quanto pode gastar, o que falta pagar e quanto vai sobrar; o número principal cai na mesma medida quando se gasta e não muda quando se recebe o vale ou se paga uma conta prevista; meses fechados não mudam sem confirmação ou aviso; nenhuma ação destrutiva acontece sem confirmação ou Desfazer; e o app passa nos testes de acessibilidade, com os furos desta revisão corrigidos.

---

## Anexo — Como os números foram obtidos

- O app real (`src/`) foi aberto no Chrome sem janela com o mesmo arranjo do E2E (`testes/gas-mock.mjs` + `exemplos/dados-exemplo.json`), com a data fixa em 18/11/2026. O Chrome do sistema é passado por `CHROME_PATH`, porque o Chrome do puppeteer não vem instalado.
- Os cenários das seções 3.1, 3.2, 3.5 e 3.6 foram executados pela interface e conferidos na planilha falsa.
- A tabela da seção 4.3 foi calculada com as fórmulas sobre os mesmos dados.
- As medidas de tela (seções 3.7 e 3.9) usaram viewports de 390×844 e 320×640, com os dados limpos.
- Revisão 3: números de linha do commit `de8b639` (2.6.2). O diretório de trabalho mudou durante a revisão, então as reproduções foram refeitas numa cópia desse commit, inclusive as novas (edição de estorno, "1200x10", "Copiar de outubro" com plano de R$ 1.200 injetado, média de dezembro). Os casos de borda da seção 4.3 compararam as fórmulas das revisões 2 e 3; a preservação das chaves de `config` foi conferida com o `Codigo.gs` da 2.6.2 no mock. Depois da publicação da 2.7.0 (commit `54f748c`), os cenários de 3.1, 3.2, 3.5, 3.6 e "1200x10" foram rodados de novo nela, com os mesmos números.
