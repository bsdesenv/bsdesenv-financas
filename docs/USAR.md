# Como usar

Um guia curto do dia a dia. Se ainda não instalou, comece por [INSTALAR.md](INSTALAR.md).

## A ideia em uma frase

Primeiro guardar, depois gastar: você diz quanto **planeja** gastar em cada categoria e quanto quer **guardar** no mês. O app **lança** o que gasta e recebe e mostra o **disponível para gastar** até o fim do mês: **renda − o que já saiu − os planos das categorias sem lançamento**. Cada categoria, de gasto ou de renda, conta pelo que foi lançado; se ainda não teve lançamento, vale o plano. A partir do primeiro lançamento o plano daquela categoria sai da conta, e cada novo lançamento muda o disponível na hora. As sugestões (média dos últimos meses) nunca entram nas contas: só viram plano quando você as usa. É uma conta conservadora, sem média inventada.

## Primeiro acesso

O app pede um nome (por exemplo "Finanças da casa") e um modelo de categorias:

| Modelo | Para quem |
|---|---|
| **Essencial** | casa, mercado, transporte, saúde, lazer, Guardar e o básico de rendas |
| **Família** | o essencial, mais escola, plano de saúde, filhos, pets e Guardar |
| **Autônomo** | o essencial, mais impostos, ferramentas de trabalho, rendas de serviço e Guardar |
| **Do zero** | "Guardar", "Gastos" e "Renda"; você cria o resto depois |

Todos os modelos já vêm com a categoria **Guardar**, um fixo especial. Em todos eles, o app reserva primeiro a meta de Guardar e os planos das categorias que ainda não têm lançamento; o resto é o disponível para gastar. Se você importar um backup antigo sem essa categoria, o cartão **Meta de economia** oferece criá-la.

Dá para mudar tudo depois em **Ajustes › Categorias**: renomear, reordenar, criar e apagar.

## Os três tipos de categoria

- **Fixos:** contas que vêm todo mês com valor parecido (aluguel, internet, escola).
- **Variáveis:** o que muda conforme o uso (mercado, transporte, restaurante).
- **Rendas:** o que entra (salário, serviços, outras rendas).

Isso importa porque o app trata cada grupo de um jeito: no **disponível**, só ficam reservados os planos das categorias que ainda não tiveram lançamento; depois do primeiro lançamento, vale o realizado. As variáveis também ganham alerta de ritmo.

## Guardar

A categoria **Guardar** é um fixo especial, com o id `guardar`. O app a reconhece pelo id mesmo que você mude o nome; se ela não existir, vale a primeira categoria de gasto cujo nome comece com "Guardar". O plano mensal dela é a sua **meta de economia**, e cada lançamento nela é uma **transferência** feita.

Ela não entra na barra de gastos, nos avisos de "passou do plano" nem em "Sem plano" (guardar mais do que a meta é bom). Entra no total de saídas, na sobra e no disponível. O cartão "A vencer" não mostra Guardar: a transferência é confirmada no cartão **Meta de economia**.

## Lançar um gasto ou uma renda

No computador, a barra do topo é um **lançamento rápido** de gasto: escreva algo como `32,90 mercado padaria` e pressione `Enter`. O app grava na hora, com a data de hoje, mostra o aviso com **Desfazer** e limpa o campo. Se não reconhecer a categoria, abre o formulário completo já preenchido com o texto. A tecla `N` foca esse campo.

Para escolher categoria, data ou conferir antes de salvar, use o **Novo lançamento** no topo do computador (também `Ctrl+K`) ou o **+** no celular. No celular, `N` abre o formulário completo.

1. Digite o valor como no app do banco: `6430` vira **R$ 64,30**.
2. Escolha a categoria. As que você mais usa aparecem primeiro.
3. A data já vem como hoje. A descrição é opcional.

No computador, o formulário completo também aceita tudo numa linha, como `32,90 mercado padaria`, no campo de valor.

O comportamento do teclado vale para **todos os campos de valor** do app (plano, meta, edição e célula da planilha): digite só os números e a máscara coloca a vírgula e os milhares. `129000` vira **1.290,00**; não precisa digitar vírgula.

Errou? Logo depois de salvar aparece **Desfazer**. Para corrigir depois, toque no lançamento no **Extrato**.

## As telas

### Início

- **Disponível para gastar até o fim do mês:** quanto dá para gastar pela regra da planilha: **lançado; sem lançamento, o plano**. O número grande é o **Disponível**, com a linha `Até R$ ... por dia` nos dias restantes. A composição diferencia **Já saiu** (azul), **Planos sem lançamento** (âmbar, quando houver) e **Disponível** (verde), sempre com rótulos, valores e percentuais — não depende só das cores. A linha-ponte mostra **Renda recebida/prevista** (ou **Renda do mês**, quando parte já entrou) e **Ainda na conta** (ou **Restante previsto**, quando ainda falta renda entrar). “Planos sem lançamento” são categorias com plano e nenhum lançamento ainda; elas são descontadas do disponível como previsto. **Depois do primeiro lançamento, o plano daquela categoria deixa de contar**: só o realizado conta. O plano continua no **Ritmo do plano**, mas não desconta o disponível. A frase curta lembra a regra, e o link **Ver composição** abre a folha **Como o disponível é calculado**, com a conta, as categorias sem lançamento, o plano restante nas categorias com lançamento e as categorias acima do plano, além do botão **Ajustar planos**. No computador, a composição se adapta à largura; no celular, vira uma barra compacta com legenda e valores.
- **Ritmo do plano:** cartão separado do disponível. A barra compara o gasto das categorias de consumo com o plano delas e com o ritmo do mês: fica em **atenção** quando você está mais de 12 pontos à frente do mês, e em **acima** quando passa do plano. Guardar fica de fora. No topo, **Ajustar plano** leva para **Mês › Planejar**. O cartão mostra `Plano de consumo = X% da renda do mês` e a meta de economia com o valor e o percentual da renda; **Ajustar meta** foca o campo da Meta de economia. O plano aqui é **só ritmo**: o plano de uma categoria com lançamento não desconta o disponível; o que conta é o realizado.
- **Números do mês:** os quatro KPIs mantêm rótulos, valores e subs, agora com ícone e um micrográfico. **Renda do mês** (**recebida** ou **prevista**) mostra um sparkline dos últimos 6 meses; **já saiu** (gastos; inclui Guardar quando houver transferência) mostra barras por dia do mês, com hoje destacado; **planos sem lançamento** (o que ainda não tem gasto e entra como previsto) lista as 3 maiores categorias pendentes, ou “Nenhum plano pendente”; e **guardado** (com a meta, quando existe) mostra uma barra de progresso com “faltam R$ ...”, o percentual da meta e, quando há histórico, um sparkline dos últimos 6 meses; sem meta, mostra “defina uma meta”. No celular, os KPIs ficam em 2 colunas; em telas de até 380 px, a Sobra ocupa uma linha inteira para os valores permanecerem legíveis.
- **Variáveis do mês:** só as categorias variáveis. O topo resume **Gasto**, **Plano** e **Ainda previsto** (o plano das variáveis que ainda não têm lançamento). O gráfico **“Para onde foi”** mostra as 5 maiores categorias variáveis do mês + **Demais**, com legenda e percentuais. No computador, a lista mostra todas as categorias e a média dos últimos 3 meses de cada uma; no celular, mostra as 4 primeiras e o link **Ver todas**. Os **Avisos** ficam no rodapé deste cartão; cada aviso tem **Ver lançamentos** para abrir as contas que somaram a categoria. No rodapé, **Lançar** abre o formulário completo e **Ajustar planos** leva para **Mês › Planejar**. A dica lembra: “Toque numa categoria para lançar ou ajustar o plano”.
- **Meta de economia:** a meta do mês, o que já foi guardado e o que falta. Ao lado da meta aparece o percentual da renda (por exemplo, `Meta R$ 2.000,00 · 16,6% da renda`); **Limpar meta** remove o plano de Guardar do mês, com aviso e **Desfazer**. O campo abaixo da barra grava a meta (também dá para editá-la na tela Mês); **Confirmar** lança a transferência com a data de hoje. Enquanto a meta não é lançada, ela entra como plano sem lançamento; depois, entra o realizado e o disponível não muda se o valor for o mesmo. Se a categoria Guardar ainda não existe, o cartão mostra uma sugestão de **80% da sua sobra de consumo dos últimos 3 meses fechados** — a renda recebida menos os gastos de consumo, sem contar as transferências para Guardar — e oferece criar a categoria já com esse valor. A sugestão não é automática: ela só vira meta quando você toca no botão ou grava o valor.
- **Cobertura do plano:** aparece quando há categorias de consumo sem plano. Mostra **“Sem plano: R$ ...”**, o valor que está fora da barra, e oferece **Planejar agora**, pela média dos últimos 3 meses (ou pelo valor já lançado, quando não há média). Como essas categorias já têm lançamento, o plano novo entra no ritmo, mas não desconta o disponível; o que conta é o realizado.
- **A vencer este mês:** contas fixas com plano e sem lançamento, sem Guardar. O botão **Confirmar** lança o valor do plano com a data de hoje.
- **Avisos:** ficam no cartão **Variáveis do mês** e mostram categorias de consumo que passaram do plano ou que estão gastando rápido demais. Guardar nunca entra como "passou do plano". Abra **Ver lançamentos** para ver data, descrição e valor de cada conta daquela categoria no mês; toque numa conta para editá-la.

### Sobra e sobra realizada

A **sobra** é o **Disponível**: renda − gastos, com o plano entrando **só nas categorias sem lançamento**. Depois do primeiro lançamento de uma categoria, o plano dela não entra mais na conta; só o realizado. Por isso o número da tela Mês é o mesmo do Início. A folha **Como o disponível é calculado** mostra:

```
Ainda na conta
− planos sem lançamento
= Disponível
```

E, separado, o **plano restante nas categorias com lançamento** e as categorias **acima do plano**. Esses planos não descontam o disponível; servem para comparar o ritmo. Se quiser mudar um plano, use **Ajustar planos**. Nos meses fechados, quando há dados reais, o app mostra a **sobra realizada** (renda recebida − gastos lançados) e a rotula "realizada"; sem dados reais, mostra "com valores previstos". O gráfico **Sobra mês a mês** usa a mesma regra.

### Extrato

Todos os lançamentos, agrupados por dia, com busca (no computador: tecla `/`) e filtros. Toque num lançamento para editar ou apagar.

### Mês

Cada categoria com o que foi gasto, o plano e o ritmo. É aqui que você **planeja**:

- **Copiar de** (nome do mês anterior)**:** usa os valores do mês passado como plano deste mês — o que foi lançado e, nas categorias sem lançamento, o plano. O aviso mostra quantas categorias e o total; dá para **Desfazer**.
- **Preencher com as médias:** grava como plano a média dos últimos 3 meses em todas as categorias que têm histórico. Só acontece se você tocar no botão, e o aviso mostra o total e oferece **Desfazer**.
- **Usar sugestão:** a média de cada categoria aparece como **texto ao lado do campo**, com um botão **Usar sugestão**. O campo do plano fica vazio (placeholder `0,00`) até você digitar ou tocar em **Usar sugestão**. Para digitar, use só os números: `129000` vira **1.290,00** (a vírgula entra sozinha). A sugestão **não entra nos totais** enquanto não virar plano.
- **Como os planos entram nos cálculos:** no modo Planejar, abra essa explicação quando precisar rever a diferença entre plano, previsto, sugestão e Guardar. Ela fica recolhida por padrão para deixar as categorias e os campos mais próximos.
- **Guardar:** a linha mostra "Guardado", "Previsto R$ ... · nada guardado", "Faltam R$ ..." ou "Nada guardado". O plano dela é a meta; para mudar a meta, edite o plano aqui ou no cartão Meta de economia. Enquanto a transferência não é lançada, a meta entra como plano sem lançamento; depois de confirmar, entra como realizado.
- **Apagar plano:** no painel que abre ao tocar numa categoria, o link **Apagar plano** remove o plano daquele mês, com aviso e **Desfazer**.

O app nunca inventa previsão: categoria sem plano conta só o que foi lançado. O plano de uma categoria só entra nas contas enquanto ela não tem lançamento; depois do primeiro lançamento, o plano fica só no ritmo e o que conta é o realizado. A média é uma sugestão, não um plano; ela só entra nas contas depois que você usa. Apagar um plano não cancela a despesa; ela só deixa de ser reservada no disponível — o app avisa e oferece **Desfazer**.

### Planilha (melhor no computador)

O ano inteiro numa tabela: categorias nas linhas, meses nas colunas.

- As cores mostram onde cada categoria fugiu da própria média.
- Clique numa célula para ver os lançamentos dela e lançar direto ali. Use as setas do teclado para andar e `Enter` para abrir.
- No celular, deslize horizontalmente dentro da tabela; a coluna de categorias fica fixa e uma dica na tela indica a rolagem. A região também pode receber foco e ser percorrida pelo teclado.
- Em todos os meses vale a mesma regra da versão 1: a célula mostra o que foi lançado. Numa categoria sem lançamento, vale o plano, marcado como previsto (tracejado). Os totais e a sobra somam exatamente o que aparece nas células; o rodapé **Total de saídas** inclui Guardar.
- Apagar um plano não cancela a despesa; ela só deixa de ser reservada no disponível. O app avisa e oferece **Desfazer**.

### Ajustes

Nome do controle, tema (automático, claro ou escuro), categorias e a seção **Seus dados**. A versão do app aparece no rodapé do menu (no computador), no topo de **Ajustes** e na seção **Sobre**.

## Seus dados e backup

Tudo fica na planilha do seu Google Drive. O botão **Abrir a planilha** em Ajustes leva até ela.

- **Baixar backup (JSON):** um arquivo com tudo, inclusive o tema escolhido. Vale fazer uma vez por mês e guardar no computador ou no Drive.
- **Exportar CSV:** os lançamentos num arquivo que abre no Excel ou no Google Sheets.
- **Importar backup:** traz de volta um arquivo baixado. Ele pergunta se é para **juntar** com o que já existe ou **substituir tudo**. Ao substituir, o tema do arquivo é aplicado; ao juntar, o tema atual é mantido.
- O próprio Google guarda versões antigas da planilha em **Arquivo › Histórico de versões**.

## Sem internet

Pode continuar lançando. O app guarda no aparelho, mostra "Sem conexão" e envia sozinho quando a conexão voltar. Até lá, essas alterações existem só naquele aparelho: não limpe os dados do navegador antes de abrir o app com internet de novo.

## Celular e computador ao mesmo tempo

Pode usar os dois. Cada aparelho envia só o que mudou, então um não apaga o que o outro fez. Ao voltar para a aba do app, ele busca as novidades da planilha.

## Atalhos

| Atalho | O que faz |
|---|---|
| `N` | no computador, foca o lançamento rápido; no celular, abre o lançamento completo |
| `Ctrl+K` | abre o lançamento completo |
| `/` | buscar no Extrato |
| setas e `Enter` | andar e abrir células na Planilha |
| `Esc` | fechar o painel aberto |
| endereço do app + `?novo=1` | abre já na tela de lançamento |
| endereço do app + `?novo=mercado` | abre o lançamento com a categoria "Mercado" escolhida |

No `?novo=` vai o **código** da categoria. Ele é o nome que a categoria tinha quando foi criada, em minúsculas, sem acento e com hífen no lugar dos espaços: "Saúde e farmácia" vira `saude-e-farmacia`. Renomear a categoria depois não muda o código. Na dúvida, o código está na coluna `id` da aba `categorias` da planilha. Se o código não bater, o lançamento abre sem categoria escolhida.

Dica: abra o endereço com `?novo=mercado` no celular e use **Adicionar à tela inicial**. Fica um ícone que já abre o lançamento de mercado.
