# Como usar

Um guia curto do dia a dia. Se ainda não instalou, comece por [INSTALAR.md](INSTALAR.md).

## A ideia em uma frase

Você diz quanto **planeja** gastar em cada categoria no mês, **lança** o que gasta e recebe, e o app mostra quanto ainda pode gastar até o fim do mês sem fechar no vermelho.

## Primeiro acesso

O app pede um nome (por exemplo "Finanças da casa") e um modelo de categorias:

| Modelo | Para quem |
|---|---|
| **Essencial** | casa, mercado, transporte, saúde, lazer e salário |
| **Família** | o essencial, mais escola, plano de saúde, filhos e pets |
| **Autônomo** | o essencial, mais impostos, ferramentas de trabalho e rendas de serviço |
| **Do zero** | só "Gastos" e "Renda"; você cria o resto depois |

Dá para mudar tudo depois em **Ajustes › Categorias**: renomear, reordenar, criar e apagar.

## Os três tipos de categoria

- **Fixos:** contas que vêm todo mês com valor parecido (aluguel, internet, escola).
- **Variáveis:** o que muda conforme o uso (mercado, transporte, restaurante).
- **Rendas:** o que entra (salário, serviços, outras rendas).

Isso importa porque o app trata cada grupo de um jeito: as contas fixas ainda não pagas são reservadas no "livre para gastar", e as variáveis ganham alerta de ritmo.

## Lançar um gasto ou uma renda

Toque no **+** (no computador: tecla `N` ou `Ctrl+K`).

1. Digite o valor como no app do banco: `6430` vira **R$ 64,30**.
2. Escolha a categoria. As que você mais usa aparecem primeiro.
3. A data já vem como hoje. A descrição é opcional.

No computador dá para escrever tudo numa linha, como `32,90 mercado padaria`.

Errou? Logo depois de salvar aparece **Desfazer**. Para corrigir depois, toque no lançamento no **Extrato**.

## As telas

### Início

- **Livre para gastar até o fim do mês:** quanto ainda dá para gastar sem fechar no vermelho, e quanto isso dá por dia.
  A conta é: renda do mês − o que já foi gasto − contas fixas que ainda vão vencer (as que têm plano e nenhum lançamento).
- **Barra de ritmo:** quanto do plano de gastos você já usou, comparado com quanto do mês já passou. Se no dia 10 você já gastou 60% do plano, a barra avisa. Só entram as categorias que têm plano; o que foi gasto em categorias sem plano aparece como "Sem plano", à parte.
- **Números do mês:** renda, gasto até hoje, **previsto a lançar** (planos de categorias que ainda não tiveram lançamento) e a **sobra do mês**.
- **A vencer este mês:** contas fixas com plano e sem lançamento ainda. O botão **Confirmar** lança o valor do plano com a data de hoje.
- **Avisos:** categorias que passaram do plano ou que estão gastando rápido demais.

### Extrato

Todos os lançamentos, agrupados por dia, com busca (no computador: tecla `/`) e filtros. Toque num lançamento para editar ou apagar.

### Mês

Cada categoria com o que foi gasto, o plano e o ritmo. É aqui que você **planeja**:

- **Copiar de** (nome do mês anterior)**:** repete o plano do mês passado.
- **Usar as médias:** grava como plano a média dos últimos 3 meses. Só acontece se você tocar no botão.

O app nunca inventa previsão: categoria sem plano conta só o que foi lançado. A média aparece como sugestão no campo, e apagar o campo tira o previsto das contas.

### Planilha (melhor no computador)

O ano inteiro numa tabela: categorias nas linhas, meses nas colunas.

- As cores mostram onde cada categoria fugiu da própria média.
- Clique numa célula para ver os lançamentos dela e lançar direto ali. Use as setas do teclado para andar e `Enter` para abrir.
- Em todos os meses vale a mesma regra da versão 1: a célula mostra o que foi lançado. Numa categoria sem lançamento, vale o plano, marcado como previsto (tracejado). Os totais e a sobra somam exatamente o que aparece nas células.
- Para tirar um previsto da soma, apague o plano daquele mês.

### Ajustes

Nome do controle, tema (automático, claro ou escuro), categorias e a seção **Seus dados**.

## Seus dados e backup

Tudo fica na planilha do seu Google Drive. O botão **Abrir a planilha** em Ajustes leva até ela.

- **Baixar backup (JSON):** um arquivo com tudo. Vale fazer uma vez por mês e guardar no computador ou no Drive.
- **Exportar CSV:** os lançamentos num arquivo que abre no Excel ou no Google Sheets.
- **Importar backup:** traz de volta um arquivo baixado. Ele pergunta se é para **juntar** com o que já existe ou **substituir tudo**.
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
