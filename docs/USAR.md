# Como usar

Um guia curto do dia a dia. Se ainda não instalou, comece por [INSTALAR.md](INSTALAR.md).

## A ideia em uma frase

Primeiro guardar, depois gastar: você diz quanto **planeja** gastar em cada categoria e quanto quer **guardar** no mês. O app reserva a meta de Guardar e os planos, **lança** o que gasta e recebe, e mostra o **disponível para gastar** até o fim do mês — uma conta conservadora, que usa a renda já recebida (ou a prevista, se nada entrou).

## Primeiro acesso

O app pede um nome (por exemplo "Finanças da casa") e um modelo de categorias:

| Modelo | Para quem |
|---|---|
| **Essencial** | casa, mercado, transporte, saúde, lazer, Guardar e o básico de rendas |
| **Família** | o essencial, mais escola, plano de saúde, filhos, pets e Guardar |
| **Autônomo** | o essencial, mais impostos, ferramentas de trabalho, rendas de serviço e Guardar |
| **Do zero** | "Guardar", "Gastos" e "Renda"; você cria o resto depois |

Todos os modelos já vêm com a categoria **Guardar**, um fixo especial. Em todos eles, o app reserva primeiro a meta de Guardar; o resto é o disponível para gastar. Se você importar um backup antigo sem essa categoria, o cartão **Meta de economia** oferece criá-la.

Dá para mudar tudo depois em **Ajustes › Categorias**: renomear, reordenar, criar e apagar.

## Os três tipos de categoria

- **Fixos:** contas que vêm todo mês com valor parecido (aluguel, internet, escola).
- **Variáveis:** o que muda conforme o uso (mercado, transporte, restaurante).
- **Rendas:** o que entra (salário, serviços, outras rendas).

Isso importa porque o app trata cada grupo de um jeito: no **disponível**, os planos ainda não gastos ficam reservados, inclusive os das variáveis parcialmente gastas; as variáveis também ganham alerta de ritmo.

## Guardar

A categoria **Guardar** é um fixo especial, com o id `guardar`. O app a reconhece pelo id mesmo que você mude o nome; se ela não existir, vale a primeira categoria de gasto cujo nome comece com "Guardar". O plano mensal dela é a sua **meta de economia**, e cada lançamento nela é uma **transferência** feita.

Ela não entra na barra de gastos, nos avisos de "passou do plano" nem em "Sem plano" (guardar mais que a meta é bom). Entra no total de saídas, na sobra e no disponível. O cartão "A vencer" não mostra Guardar: a transferência é confirmada no cartão **Meta de economia**.

## Lançar um gasto ou uma renda

Toque no **+** (no computador: tecla `N` ou `Ctrl+K`).

1. Digite o valor como no app do banco: `6430` vira **R$ 64,30**.
2. Escolha a categoria. As que você mais usa aparecem primeiro.
3. A data já vem como hoje. A descrição é opcional.

No computador dá para escrever tudo numa linha, como `32,90 mercado padaria`.

Errou? Logo depois de salvar aparece **Desfazer**. Para corrigir depois, toque no lançamento no **Extrato**.

## As telas

### Início

- **Disponível para gastar até o fim do mês:** quanto dá para gastar depois de guardar e reservar os planos. A conta é: renda já recebida (se nada entrou ainda, a renda prevista) − o que já foi gasto (incluindo as transferências para Guardar) − o que ainda falta lançar dos planos (contas fixas, variáveis e a meta de Guardar que ainda não foi transferida). O texto abaixo do número divide esse valor pelos dias que faltam e, se houver meta, lembra "depois de guardar R$ ...". Se o valor ficar negativo, o texto avisa que os gastos, os planos e a economia já passam da renda disponível.
- **Barra do plano:** só entram as categorias de consumo com plano; Guardar fica de fora. Ela compara o gasto com o plano e com o ritmo do mês: fica em **atenção** quando você está mais de 12 pontos à frente do mês, e em **acima** quando passa do plano. Categorias sem plano aparecem em "Sem plano", com um botão **Planejar**.
- **Sobra projetada:** a nota do herói mostra a sobra do mês como **projeção** e quanto sobraria se você gastasse tudo o que ainda está nos planos. Se houver meta, mostra o valor de Guardar; se parte da renda ainda não entrou, mostra quanto já foi recebido. A nota sempre avisa: apagar um plano não cancela a despesa; só deixa de reservá-la.
- **Números do mês:** renda do mês (**recebida** ou **prevista**), gasto até hoje (só consumo), **guardado** (com a meta, quando existe) e **sobra projetada**.
- **Meta de economia:** a meta do mês, o que já foi guardado e o que falta. O campo abaixo da barra grava a meta (também dá para editá-la na tela Mês); **Confirmar** lança a transferência com a data de hoje. O valor já estava reservado no disponível, então confirmar só registra a transferência. Se a categoria Guardar ainda não existe, o cartão mostra uma sugestão de **80% da sua sobra média realizada dos últimos 3 meses fechados** e oferece criar a categoria já com esse valor. A sugestão não é automática: ela só vira meta quando você toca no botão ou grava o valor.
- **Cobertura do plano:** aparece quando há categorias de consumo sem plano. Mostra o valor que está fora da barra e não é reservado no disponível e oferece **Planejar agora**, pela média dos últimos 3 meses (ou pelo valor já lançado, quando não há média). A partir daí, o disponível passa a reservar esses planos.
- **A vencer este mês:** contas fixas com plano e sem lançamento, sem Guardar. O botão **Confirmar** lança o valor do plano com a data de hoje.
- **Avisos:** categorias de consumo que passaram do plano ou que estão gastando rápido demais. Guardar nunca entra como "passou do plano".

### Sobra projetada e sobra realizada

No mês atual, a sobra é uma **projeção**: ela usa o que foi lançado e, nas categorias sem lançamento, o plano. Não é dinheiro que já sobrou. Nos meses fechados, quando há dados reais, o app mostra a **sobra realizada** (renda recebida − gastos lançados) e a rotula "realizada"; sem dados reais, mostra "com previsto". O gráfico **Sobra mês a mês**, no fim do Início, segue a mesma regra e marca os meses projetados com contorno.

### Extrato

Todos os lançamentos, agrupados por dia, com busca (no computador: tecla `/`) e filtros. Toque num lançamento para editar ou apagar.

### Mês

Cada categoria com o que foi gasto, o plano e o ritmo. É aqui que você **planeja**:

- **Copiar de** (nome do mês anterior)**:** repete o plano do mês passado.
- **Usar as médias:** grava como plano a média dos últimos 3 meses. Só acontece se você tocar no botão.
- **Guardar:** a linha mostra "Guardado", "A guardar · previsto R$ ...", "Faltam R$ ..." ou "Nada guardado". O plano dela é a meta; para mudar a meta, edite o plano aqui ou no cartão Meta de economia. Guardar entra como compromisso fixo; o disponível já desconta.

O app nunca inventa previsão: categoria sem plano conta só o que foi lançado. A média aparece como sugestão no campo. Apagar um plano não cancela a despesa: só deixa de reservá-la — o app avisa e oferece **Desfazer**.

### Planilha (melhor no computador)

O ano inteiro numa tabela: categorias nas linhas, meses nas colunas.

- As cores mostram onde cada categoria fugiu da própria média.
- Clique numa célula para ver os lançamentos dela e lançar direto ali. Use as setas do teclado para andar e `Enter` para abrir.
- Em todos os meses vale a mesma regra da versão 1: a célula mostra o que foi lançado. Numa categoria sem lançamento, vale o plano, marcado como previsto (tracejado). Os totais e a sobra somam exatamente o que aparece nas células; o rodapé **Total de saídas** inclui Guardar.
- Apagar um plano não cancela a despesa: só deixa de reservá-la. O app avisa e oferece **Desfazer**.

### Ajustes

Nome do controle, tema (automático, claro ou escuro), categorias e a seção **Seus dados**.

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
| `N` ou `Ctrl+K` | novo lançamento |
| `/` | buscar no Extrato |
| setas e `Enter` | andar e abrir células na Planilha |
| `Esc` | fechar o painel aberto |
| endereço do app + `?novo=1` | abre já na tela de lançamento |
| endereço do app + `?novo=mercado` | abre o lançamento com a categoria "Mercado" escolhida |

No `?novo=` vai o **código** da categoria. Ele é o nome que a categoria tinha quando foi criada, em minúsculas, sem acento e com hífen no lugar dos espaços: "Saúde e farmácia" vira `saude-e-farmacia`. Renomear a categoria depois não muda o código. Na dúvida, o código está na coluna `id` da aba `categorias` da planilha. Se o código não bater, o lançamento abre sem categoria escolhida.

Dica: abra o endereço com `?novo=mercado` no celular e use **Adicionar à tela inicial**. Fica um ícone que já abre o lançamento de mercado.
