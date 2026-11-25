# Como usar

Um guia curto do dia a dia. Se ainda não instalou, comece por [INSTALAR.md](INSTALAR.md).

## A ideia em uma frase

Primeiro guardar, depois gastar: você diz quanto **planeja** gastar em cada categoria e quanto quer **guardar** no mês. O app **lança** o que você gasta e recebe, e mostra o **disponível para gastar** até o fim do mês. A conta é: **renda do mês − o que já saiu − o que ainda está reservado**. O reservado são as contas a pagar, o que falta guardar e o que resta dos planos. Gastar dentro de um plano não muda o disponível. Gastar fora dele, sim. As sugestões (média dos últimos meses) nunca entram nas contas: só viram plano quando você as usa. É uma conta conservadora, sem média inventada.

## Primeiro acesso

O app pede um nome (por exemplo "Finanças da casa") e um modelo de categorias:

| Modelo | Para quem |
|---|---|
| **Essencial** | casa, mercado, transporte, saúde, lazer, Guardar e o básico de rendas |
| **Família** | o essencial, mais escola, plano de saúde, filhos, pets e Guardar |
| **Autônomo** | o essencial, mais impostos, ferramentas de trabalho, rendas de serviço e Guardar |
| **Do zero** | "Guardar", "Gastos" e "Renda"; você cria o resto depois |

Todos os modelos já vêm com a categoria **Guardar**, um fixo especial. Em todos eles, o app reserva o que falta para a meta de Guardar, o que falta das contas fixas e o que resta dos planos. O resto é o disponível para gastar. Se você importar um backup antigo sem essa categoria, o cartão **Meta de economia** oferece criá-la.

Dá para mudar tudo depois em **Ajustes › Categorias**: renomear, reordenar, criar e apagar.

## Os três tipos de categoria

- **Fixos:** contas que vêm todo mês com valor parecido (aluguel, internet, escola).
- **Variáveis:** o que muda conforme o uso (mercado, transporte, restaurante).
- **Rendas:** o que entra (salário, serviços, outras rendas).

Isso importa porque o app trata cada grupo de um jeito. Fixos reservam o que ainda falta pagar (**contas a pagar**). Variáveis reservam o que resta do plano (**ainda nos planos**). Rendas entram na **renda do mês**, e a parte que ainda não chegou fica como **a receber**. As variáveis também ganham alerta de ritmo.

## Guardar

A categoria **Guardar** é um fixo especial, com o id `guardar`. O app a reconhece pelo id mesmo que você mude o nome; se ela não existir, vale a primeira categoria de gasto cujo nome comece com "Guardar". O plano mensal dela é a sua **meta de economia**, e cada lançamento nela é uma **transferência** feita.

Ela não entra na barra de gastos, nos avisos de "passou do plano" nem em "Sem plano" (guardar mais do que a meta é bom). Entra no total de saídas, na sobra e no disponível. O cartão **Contas a pagar** não mostra Guardar: a transferência é confirmada no cartão **Meta de economia**.

## Lançar um gasto ou uma renda

No computador, a barra do topo é um **lançamento rápido** de gasto: escreva algo como `32,90 mercado padaria` e pressione `Enter`. O app grava na hora no mês que está na tela (no mês atual, com a data de hoje), mostra o aviso com **Desfazer** e limpa o campo. Se a tela mostra outro mês, ele grava sem dia, e o aviso diz qual é o mês; o próprio campo avisa, ao lado, "em Set 2026", por exemplo. Se não reconhecer a categoria, abre o formulário completo já preenchido com o texto. A tecla `N` foca esse campo.

Para escolher categoria, data ou conferir antes de salvar, use o **Novo lançamento** no topo do computador (também `Ctrl+K`) ou o **+** no celular. No celular, `N` abre o formulário completo.

1. Digite o valor como se escreve: `1200`, `1.200`, `12,00` ou `1.200,50`.
2. Escolha a categoria. As que você mais usa aparecem primeiro.
3. A data já vem como hoje. A descrição é opcional.

No computador, o formulário completo também aceita tudo numa linha, como `32,90 mercado padaria`, no campo de valor.

No **Novo lançamento**, o seletor de tipo tem **Gasto**, **Estorno** e **Renda**. Use **Renda** para o que entra. Use **Estorno** para devolução ou estorno de um gasto: ele grava o valor como negativo numa categoria de gasto. No computador, também dá para digitar `-50`.

**Campos de valor.** Não há mais máscara de centavos. Digite o valor como se escreve, em qualquer campo do app.

- Vários valores de uma vez, no painel da categoria: `217,93 176,15`.
- Repetir um valor, com asterisco: `36*4` são quatro valores de 36.
- A letra `x` não multiplica. `1200x10` é recusado, porque parece parcelamento.
- A exceção é o teclado numérico do celular, no Novo lançamento: ali os dígitos entram nos centavos. `6430` vira **R$ 64,30**.

**Valor fora do normal.** Se o valor for muito acima do habitual daquela categoria, o app pede confirmação antes de salvar. O botão vira **Confirmar R$ X**.

Errou? Logo depois de salvar aparece **Desfazer**. Para corrigir depois, toque no lançamento no **Extrato**.

## As telas

### Início

Na primeira vez depois da atualização para a 2.8.0, quem já usava o app vê um aviso no topo do Início: **As contas do mês mudaram na versão 2.8.0**. O aviso mostra o disponível pela regra antiga e pela nova. Para fechar, toque em **Entendi**.

- **Disponível para gastar até o fim do mês:** quanto ainda dá para gastar. O número grande é o **Disponível**. Abaixo dele, a linha `Cerca de R$ ... por dia ... além dos planos` mostra o valor por dia nos dias restantes, arredondado. A frase curta lembra a regra. O link **Ver composição** abre a folha **Como o disponível é calculado**, com a conta completa (veja a seção Sobra e sobra realizada) e o botão **Ajustar planos**. A barra de composição separa **Já saiu**, **Reservado** e **Disponível**, com rótulos, valores e percentuais, para não depender só das cores. No computador, a composição se adapta à largura; no celular, vira uma barra compacta com legenda e valores.
- **Ritmo do plano:** cartão separado do disponível. A barra compara o gasto das categorias de consumo com o plano delas e com o ritmo do mês: fica em **atenção** quando você está mais de 12 pontos à frente do mês, e em **acima** quando passa do plano. Guardar fica de fora. No topo, **Ajustar plano** leva para **Mês › Planejar**. O cartão mostra `Plano de consumo = X% da renda do mês` e a meta de economia com o valor e o percentual da renda; **Ajustar meta** foca o campo da Meta de economia. O plano aqui serve para o ritmo. Ele também conta no disponível: o que falta de cada plano fica reservado até o fim do mês, ou até você encerrar a categoria no mês.
- **Números do mês:** os quatro KPIs têm rótulos, valores e textos de apoio, com ícone e um micrográfico. **Renda do mês** (recebida + a receber) mostra um sparkline dos últimos 6 meses; **já saiu** (gastos; inclui Guardar quando houver transferência) mostra barras por dia do mês, com hoje destacado; **Reservado** (contas a pagar, falta guardar e ainda nos planos) lista as 3 maiores reservas do mês, ou “Nada reservado.”; e **guardado** (com a meta, quando existe) mostra uma barra de progresso com “faltam R$ ...”, o percentual da meta e, quando há histórico, um sparkline dos últimos 6 meses; sem meta, mostra “defina uma meta”. No celular, os KPIs ficam em 2 colunas; em telas de até 380 px, a Sobra ocupa uma linha inteira para os valores permanecerem legíveis.
- **Variáveis do mês:** só as categorias variáveis. O topo resume **Gasto**, **Plano** e **Ainda nos planos** (o que resta dos planos das categorias variáveis). O gráfico **“Para onde foi”** mostra as 5 maiores categorias variáveis do mês + **Demais**, com legenda e percentuais. No computador, a lista mostra todas as categorias e a média dos últimos 3 meses de cada uma; no celular, mostra as 4 primeiras e o link **Ver todas**. Os **Avisos** ficam no rodapé deste cartão; cada aviso tem **Ver lançamentos** para abrir as contas que somaram a categoria. No rodapé, **Lançar** abre o formulário completo e **Ajustar planos** leva para **Mês › Planejar**. A dica lembra: “Toque numa categoria para lançar ou ajustar o plano”.
- **Meta de economia:** a meta do mês, o que já foi guardado e o que falta. Ao lado da meta aparece o percentual da renda (por exemplo, `Meta R$ 2.000,00 · 16,6% da renda`); **Limpar meta** remove o plano de Guardar do mês, com aviso e **Desfazer**. O campo abaixo da barra grava a meta (também dá para editá-la na tela Mês); **Confirmar** lança a transferência com a data de hoje. Enquanto a meta não é lançada, o que falta dela fica reservado como **Falta guardar**. Depois de confirmar, o valor passa para o que já foi guardado, e o disponível não muda se for o mesmo valor. Se a categoria Guardar ainda não existe, o cartão mostra uma sugestão de **80% da sua sobra de consumo dos últimos 3 meses fechados** — a renda recebida menos os gastos de consumo, sem contar as transferências para Guardar — e oferece criar a categoria já com esse valor. A sugestão não é automática: ela só vira meta quando você toca no botão ou grava o valor.
- **Cobertura do plano:** aparece quando há categorias de consumo sem plano. Mostra **“Sem plano: R$ ...”**, o valor que está fora da barra, e oferece **Planejar agora**, pela média do que foi lançado nos últimos 3 meses fechados (ou pelo valor já lançado neste mês, quando não há média). Depois de planejar, a categoria reserva o que falta do plano até o fim do mês, ou até você encerrar a categoria no mês.
- **Contas a pagar:** as contas fixas e o que falta de cada uma neste mês. Sem Guardar. O botão **Confirmar** lança o que falta, com a data de hoje. Se a conta já teve pagamento parcial, aparece o botão **Quitar**.
- **Avisos:** ficam no cartão **Variáveis do mês** e mostram categorias de consumo que passaram do plano ou que estão gastando rápido demais. Guardar nunca entra como "passou do plano". Abra **Ver lançamentos** para ver data, descrição e valor de cada conta daquela categoria no mês; toque numa conta para editá-la.

### Sobra e sobra realizada

A **sobra** é o **Disponível**. Por isso o número da tela Mês é o mesmo do Início. A conta é esta:

```
Renda do mês (recebida + a receber)
− Já saiu
− Contas a pagar
− Falta guardar
− Ainda nos planos
= Disponível
```

- **Renda do mês** é o que já entrou, mais o que falta das rendas previstas (**a receber**). Se você recebe só parte do salário, como o vale do dia 20, o disponível não cai. O resto aparece como **a receber**.
- **Contas a pagar** é o que falta das contas fixas.
- **Falta guardar** é o que falta para a meta de Guardar.
- **Ainda nos planos** é o que resta dos planos das categorias variáveis. Cada plano reserva o que ainda falta dele, até o fim do mês ou até você encerrar a categoria no mês.

Gastar dentro de um plano não muda o disponível: o valor sai de **Ainda nos planos**. Gastar sem plano, ou além do plano, reduz o disponível na mesma medida.

**Quitar, Encerrar no mês e Não vem mais.** Ao tocar numa categoria, o painel mostra uma destas opções, conforme o tipo dela:

- **Quitar (libera R$ X):** conta fixa paga em parte, porque veio mais barata.
- **Encerrar no mês (libera R$ X):** categoria variável. Você não vai gastar mais nela neste mês.
- **Não vem mais (tira R$ X):** renda que não vai entrar toda.

O que faltava deixa de ser reservado, mas o plano continua gravado. **Reabrir no mês** desfaz.

**Meses passados** mostram a **sobra realizada**: o que entrou menos o que saiu, só com o que foi lançado. Planos que ficaram sem lançamento aparecem à parte, no aviso "Não entram N planos sem lançamento", e não entram na sobra. **Meses futuros** mostram a **sobra prevista**, pela mesma conta do disponível. O gráfico **Sobra mês a mês** mostra a sobra realizada dos meses fechados e a prevista em contorno.

### Extrato

Todos os lançamentos, agrupados por dia, com busca (no computador: tecla `/`) e filtros, como o filtro **Saídas**. Toque num lançamento para editar ou apagar.

### Mês

Cada categoria com o que foi gasto, o plano e o ritmo. No topo, para o mês atual, estão **Renda do mês**, **Saídas previstas** e **Disponível**. É aqui que você **planeja**:

- **Copiar de** (nome do mês anterior)**:** usa os valores do mês passado como plano deste mês — o que foi lançado e, nas categorias sem lançamento, o plano. O aviso mostra quantas categorias e o total; dá para **Desfazer**.
- **Preencher com as médias:** grava como plano a média dos últimos 3 meses fechados em todas as categorias que têm histórico, só com o que foi lançado. Só acontece se você tocar no botão, e o aviso mostra o total e oferece **Desfazer**.
- **Usar sugestão:** a média de cada categoria (só com o que foi lançado nos 3 meses fechados antes deste) aparece como **texto ao lado do campo**, com um botão **Usar sugestão**. O campo do plano fica vazio (placeholder `0,00`) até você digitar ou tocar em **Usar sugestão**. Digite como se escreve, por exemplo `1200` ou `12,00`. A sugestão **não entra nos totais** enquanto não virar plano.
- **Como os planos entram nos cálculos:** no modo Planejar, abra essa explicação quando precisar rever a diferença entre plano, previsto, sugestão e Guardar. Ela fica recolhida por padrão para deixar as categorias e os campos mais próximos.
- **Guardar:** a linha mostra "Guardado", "Previsto R$ ... · nada guardado", "Faltam R$ ..." ou "Nada guardado". O plano dela é a meta; para mudar a meta, edite o plano aqui ou no cartão Meta de economia. Enquanto a transferência não é lançada, o que falta dela fica reservado como **Falta guardar**. Depois de confirmar, o valor entra como guardado.
- **Apagar plano:** no painel que abre ao tocar numa categoria, o link **Apagar plano** remove o plano daquele mês, com aviso e **Desfazer**.

O app nunca inventa previsão: categoria sem plano conta só o que foi lançado. O plano de uma categoria reserva o que ainda falta dele até o fim do mês (ou até você encerrar a categoria no mês). Gastar dentro do plano não muda o disponível. A média é uma sugestão, não um plano; ela só entra nas contas depois que você usa. Apagar um plano não cancela a despesa; ela só deixa de ser reservada no disponível — o app avisa e oferece **Desfazer**.

### Planilha (melhor no computador)

O ano inteiro numa tabela: categorias nas linhas, meses nas colunas.

- As cores mostram onde cada categoria fugiu da própria média.
- Clique numa célula para ver os lançamentos dela e lançar direto ali. Use as setas do teclado para andar e `Enter` para abrir.
- No celular, deslize horizontalmente dentro da tabela; a coluna de categorias fica fixa e uma dica na tela indica a rolagem. A região também pode receber foco e ser percorrida pelo teclado.
- A célula mostra o que foi lançado. Numa categoria sem lançamento, vale o plano, marcado como previsto (tracejado). Nos meses fechados, os totais e a sobra somam só o que foi lançado. No mês atual e nos próximos, somam também o que falta de cada plano. O rodapé **Total de saídas** inclui Guardar.
- Apagar um plano não cancela a despesa; ela só deixa de ser reservada no disponível. O app avisa e oferece **Desfazer**.

### Ajustes

Nome do controle, tema (automático, claro ou escuro), categorias, a seção **Atualizações** e a seção **Seus dados**. A versão do app aparece no rodapé do menu (no computador), no topo de **Ajustes** e no cartão **Atualizações**, que avisa quando há versão nova e mostra o passo a passo para atualizar.

## Seus dados e backup

Tudo fica na planilha do seu Google Drive. O botão **Abrir a planilha** em Ajustes leva até ela.

- **Baixar backup (JSON):** um arquivo com tudo, inclusive o tema escolhido e os encerramentos de categorias (formato 3). Vale fazer uma vez por mês e guardar no computador ou no Drive.
- **Exportar lançamentos (CSV):** os lançamentos num arquivo que abre no Excel ou no Google Sheets. O botão fica em Ajustes e na Planilha.
- **Importar backup:** traz de volta um arquivo baixado. Aceita os formatos 1, 2 e 3. Ele pergunta se é para **juntar** com o que já existe ou **substituir tudo**. Ao substituir, o tema do arquivo é aplicado; ao juntar, o tema atual é mantido.
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
