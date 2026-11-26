<!-- cobre: src/App.html, src/Estilos.html -->
# Como usar

Um guia curto do dia a dia. Se ainda não instalou, comece por [INSTALAR.md](INSTALAR.md).

## A ideia em uma frase

Primeiro guardar, depois gastar: você diz quanto **planeja** gastar em cada categoria e quanto quer **guardar** no mês. O app **lança** o que você gasta e recebe, e mostra o **disponível para gastar** até o fim do mês. A conta é: **renda do mês − o que já saiu − o que ainda está reservado**. O reservado são as contas a pagar, o que falta guardar e o que resta dos planos. Gastar dentro de um plano não muda o disponível. Gastar fora dele, sim. As sugestões (média dos últimos meses) nunca entram nas contas: só viram plano quando você as usa. É uma conta conservadora, sem média inventada.

## Primeiro acesso

Na primeira tela, toque em **Continuar** para montar o seu controle. Ou toque em **Ver com dados de exemplo** para explorar um controle fictício, com 12 meses de lançamentos. No exemplo, nada é gravado na sua planilha. Uma faixa no topo avisa isso, e o botão **Começar do zero** volta ao primeiro acesso para começar de verdade.

Em **Continuar**, o app pede um nome (por exemplo "Finanças da casa") e um modelo de categorias:

| Modelo | Para quem |
|---|---|
| **Essencial** | casa, mercado, transporte, saúde, lazer, Guardar e o básico de rendas |
| **Família** | o essencial, mais escola, plano de saúde, filhos, pets e Guardar |
| **Autônomo** | o essencial, mais impostos, ferramentas de trabalho, rendas de serviço e Guardar |
| **Do zero** | "Guardar", "Gastos" e "Renda"; você cria o resto depois |

Todos os modelos já vêm com a categoria **Guardar**, um fixo especial. Em todos eles, o app reserva o que falta para a meta de Guardar, o que falta das contas fixas e o que resta dos planos. O resto é o disponível para gastar. Se você importar um backup antigo sem essa categoria, a seção **Plano do mês** oferece criá-la.

Dá para mudar tudo depois em **Ajustes › Categorias**: renomear, reordenar, criar, apagar e trocar o grupo.

Depois do modelo vem o passo opcional **Seu mês**. Ele deixa o mês atual encaminhado: a renda do mês, a moradia (quando o modelo tem), a meta para guardar e um gasto que já aconteceu antes de começar. Tudo é opcional. **Pular** cria as categorias sem valores. Um gasto preenchido entra na categoria **Outros** (ou **Gastos**, no modelo Do zero), com a descrição "Antes de começar o app".

## Os três tipos de categoria

- **Fixos:** contas que vêm todo mês com valor parecido (aluguel, internet, escola).
- **Variáveis:** o que muda conforme o uso (mercado, transporte, restaurante).
- **Rendas:** o que entra (salário, serviços, outras rendas).

Isso importa porque o app trata cada grupo de um jeito. Fixos reservam o que ainda falta pagar (**contas a pagar**). Variáveis reservam o que resta do plano (**ainda nos planos**). Rendas entram na **renda do mês**, e a parte que ainda não chegou fica como **a receber**. As variáveis também ganham alerta de ritmo.

Uma categoria com lançamentos não muda entre renda e gasto. Veja a seção **Ajustes**, mais abaixo.

## Guardar

A categoria **Guardar** é um fixo especial, com o id `guardar`. O plano mensal dela é a sua **meta de economia**, e cada lançamento nela é uma **transferência** feita.

O app lembra qual é a sua categoria de economia, mesmo que você mude o nome dela. Ao abrir, ele anota essa escolha na planilha, uma vez só. Sem essa anotação, ele usa o id `guardar`. Se também não existir, vale a primeira categoria de gasto cujo nome comece com "Guardar".

A categoria de economia não pode ser apagada: o botão fica desabilitado em **Ajustes**. Também não pode virar renda.

Ela não entra na barra de gastos, nos avisos de "passou do plano" nem em "Sem plano" (guardar mais do que a meta é bom). Entra no total de saídas, na sobra e no disponível. Em **O que falta pagar**, Guardar tem um bloco próprio, com o botão **Guardar** para lançar a transferência. A meta fica em **Plano do mês**.

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
- A letra `x` não multiplica. No campo de valor, `1200x10` é recusado com a dica de usar **Parcelar** (veja a seção Parcelar). Na barra de lançamento rápido, `1200x10 geladeira` abre o **Novo lançamento** já parcelado.
- A exceção é o teclado numérico do celular, no Novo lançamento: ali os dígitos entram nos centavos. `6430` vira **R$ 64,30**.

**Valor fora do normal.** Se o valor for muito acima do habitual daquela categoria, o app pede confirmação antes de salvar. O botão vira **Confirmar R$ X**.

Errou? Logo depois de salvar aparece **Desfazer** (veja a seção Avisos e Desfazer). Para corrigir depois, toque no lançamento no **Extrato**.

## Parcelar

No **Novo lançamento** de um gasto, toque em **Parcelar** e escolha:

- **Em quantas vezes:** de 2 a 48.
- **O valor é:** o **total** da compra (o padrão) ou o valor **de cada parcela**.
- **Primeira parcela em:** por padrão, o mês seguinte ao da compra.

A prévia mostra, por exemplo, "10× de R$ 120,00 (a primeira de R$ 120,05), de dez/2026 a set/2027". Quando o total não divide certo, a sobra de centavos vai para a primeira parcela, e a soma das parcelas é sempre o total.

Cada parcela é um lançamento com a descrição "Geladeira (3/10)", no mesmo dia da compra (ou no último dia do mês, se ele não existir). Os meses futuros já mostram o que está lançado, e a sobra prevista de cada um desconta as parcelas.

Um toque em **Desfazer** apaga o conjunto inteiro. Ao editar ou apagar uma parcela no **Extrato**, o app pergunta se a mudança vale **Só nesta** ou **Nesta e nas próximas (n)**. A data muda só na parcela aberta.

## Duplicar e repetir

Na folha **Editar** de um lançamento (toque nele no **Extrato**):

- **Duplicar:** cria uma cópia. Num lançamento do mês atual, a cópia vai para hoje; nos outros, fica na mesma data.
- **Repetir no próximo mês:** cria uma cópia no mês seguinte, no mesmo dia (ou no último dia do mês).
- **Repetir todo mês:** abre o formulário de **Todo mês**, já preenchido com a categoria, a descrição, o valor e o dia desse lançamento (veja a seção seguinte).

Todas têm **Desfazer**. Numa parcela, esses botões não aparecem.

## O que se repete todo mês

Aluguel, internet, salário: o que acontece todo mês pode ser cadastrado uma vez só. Abra a categoria (toque nela na tela **Mês** ou no **Início**) e use o bloco **Todo mês**.

- **Nova conta que se repete** (em renda, **Nova renda que se repete**; em variáveis, **Novo gasto que se repete**): descrição, valor, **dia** do vencimento (opcional), **Débito automático ou Pix Automático** (só em saídas, opcional), **A partir de** e **Até** (opcional). O seletor não oferece meses que já passaram.
- **Plano do mês:** sem plano gravado, o plano da categoria é a soma do que se repete nela. O mês seguinte já nasce pronto, sem digitar. Se você grava um plano naquele mês, **ele vale no lugar da recorrência**. **Apagar plano** volta ao valor que se repete. No **Planejar**, a categoria mostra "↻ todo mês" e o valor como dica do campo.
- **Não vem em {mês}:** a conta não conta só naquele mês. Aparece "não vem em {mês}" e um **Desfazer**.
- **Editar o valor:** se a conta já começou antes do mês na tela, o app pergunta **Só em {mês}** (grava o plano do mês) ou **De {mês} em diante** (a antiga termina no mês anterior e começa uma nova).
- **Encerrar:** a conta termina no mês anterior ao da tela, sem mexer no passado. Se ela ainda nem tinha começado, é apagada. Tem **Desfazer**.
- **Apagar a categoria** apaga também as recorrências dela, e o app avisa antes: toque em **Apagar mesmo**.

**Vencimentos.** Em **O que falta pagar**, cada conta mostra a situação, em texto, e a lista vem ordenada por dia:

| Texto | Quando |
|---|---|
| vence dia 10 | falta pagar, o dia ainda não chegou |
| vence hoje | o dia é hoje |
| atrasada desde dia 5 | o dia passou e falta pagar |
| sai sozinha dia 10 | débito automático, antes do dia |
| debitada dia 10? Confirme | débito automático, depois do dia (nunca vira "atrasada") |
| recebe dia 5 | renda |
| paga dia 10 | a conta já foi coberta por lançamentos |

**Confirmar** lança o que falta no dia do vencimento (limitado ao mês), com a descrição da conta, uma conta por vez. **Desfazer** apaga todos os lançamentos criados. O app mostra lembretes só dentro da tela: não envia notificação nem e-mail.

## Avisos e Desfazer

Depois de salvar, apagar ou ajustar algo, o app mostra um aviso. Quando dá para voltar atrás, o aviso traz **Desfazer**.

- O aviso com **Desfazer** fica 10 segundos na tela. Enquanto o ponteiro do mouse ou o foco do teclado estiver em cima dele, a contagem para.
- Um aviso novo não apaga o **Desfazer** anterior. Dá para desfazer até 10 ações desta sessão.
- No computador, **Ctrl+Z** desfaz a última ação que ainda não foi desfeita. Cada toque desfaz uma ação, da mais recente para a mais antiga. Vale fora de um campo de texto.
- Com uma folha aberta, os avisos aparecem no topo (celular) ou à esquerda do painel (computador). Assim eles não cobrem o botão **Salvar** nem o teclado.

## Escolher o mês

No topo do app, as setas **‹** e **›** andam mês a mês. Quando você está em outro mês, aparece o botão **Hoje**. Toque no nome do mês para abrir a grade:

- A grade mostra os 12 meses. As setas ao lado do ano trocam de ano.
- **Hoje** volta ao mês atual, que fica marcado na grade.
- **Copiar link deste mês** copia um endereço que abre a mesma tela já no mês escolhido.

O endereço do app acompanha o mês que você está vendo. Assim, dá para guardar um favorito no mês que interessa.

## As telas

### Início

O Início responde, de cima para baixo, a perguntas sobre o mês:

- **Disponível:** quanto ainda dá para gastar até o fim do mês. O número grande é o **Disponível**. Abaixo, a linha "Cerca de R$ ... por dia nos próximos N dias, além dos planos" mostra o valor por dia, arredondado. Toque em **Ver composição** para abrir a conta completa, com o botão **Ajustar planos**. A barra separa **Já saiu**, **Reservado** e **Disponível**, com valores e percentuais.
- **O que falta pagar:** três grupos. **Contas** são as contas fixas que faltam neste mês. **Confirmar** lança o que falta, no dia do vencimento quando a conta se repete todo mês (senão, hoje), e **Quitar** aparece quando a conta já teve pagamento parcial. Contas com dia mostram "vence dia 10", "vence hoje" ou "atrasada desde dia 5" (veja **O que se repete todo mês**). **Guardar** mostra o que falta da meta, com o botão **Guardar**. **A receber** são as rendas que ainda não chegaram: **Recebi** lança o que entrou, e **Não vem** tira o que não vai entrar. O total ao lado do título soma contas e Guardar.
- **Plano do mês:** como você está nos planos. Em cima, o **ritmo** diz se o consumo está **No ritmo**, **Acima do ritmo** ou **Acima do plano**. Depois vem a **meta de economia**: o que já foi guardado e o campo **Meta de <mês>**. Digite a meta no campo; a palavra **salvo** aparece quando grava. **Usar sugestão** aparece quando há uma sugestão diferente da meta (80% da sua sobra de consumo dos últimos 3 meses fechados), e **Limpar meta** remove a meta do mês. Sem a categoria Guardar, o bloco oferece criá-la. Em seguida, as categorias variáveis, cada uma com gasto, plano e ritmo. No celular, aparecem só as primeiras; **Ver todas as categorias** leva à tela Mês. Os **avisos** mostram categorias que passaram do plano ou que estão gastando rápido demais. **Ver lançamentos** abre as contas que somaram a categoria. Se há gasto sem plano, o bloco mostra o valor e oferece **Planejar pela média**. No topo do bloco, **Ajustar planos** leva à tela Mês, e **Como funciona** explica os cálculos.
- **Onde foi:** barras com as 6 maiores saídas do mês, com nome, valor e percentual, e **Demais categorias**. Guardar não entra. Toque numa barra para lançar ou ajustar o plano daquela categoria. Num mês que já passou, o título é **Para onde foi o dinheiro**. Num mês futuro, em vez dele aparece **Plano por categoria**, com o plano de cada uma. Num mês futuro que já tem lançamentos (parcelas, por exemplo), o topo diz quanto das saídas já está lançado, e a composição mostra **Já lançado** no lugar de **Já saiu**.
- **Últimos lançamentos:** os 6 mais recentes do mês. **Ver extrato** abre o Extrato.

O link **Ver <ano> na Planilha** fecha a tela e leva ao ano inteiro.

Se o mês ainda não tem plano nem lançamentos, o topo mostra **Seu mês começa aqui**, com os botões **Planejar <mês>** e **Lançar agora**. Num mês que já passou, o topo mostra a sobra realizada e o botão **Fechar <mês>** (veja Fechar o mês). No mês atual, se o mês anterior tem pendências, aparece o aviso **<Mês> tem N pendências**, com o botão **Fechar <mês>**.

Quem já usava o app antes da 2.8.0 vê, uma vez, o aviso **As contas do mês mudaram na versão 2.8.0**. Para fechar, toque em **Entendi**.

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

### Fechar o mês

Um mês que já passou pode ser fechado. Antes, o app mostra as **pendências**: planos que ficaram sem lançamento. Entram aqui uma conta fixa ou uma meta de Guardar que não foi paga, uma renda que não chegou e um plano de categoria variável sem nenhum lançamento.

Em **Fechar <mês>**, cada pendência pede uma resposta:

- **Foi pago** (ou **Foi recebido**, para renda): lança o valor que falta do plano, sem dia.
- **Não aconteceu**: encerra a categoria no mês. O plano continua gravado, mas o que faltava deixa de ser reservado.
- **Depois**: tira a pendência da lista só enquanto a folha estiver aberta. Ao abrir a folha de novo, ela volta. Ela continua sendo pendência: **Depois** não fecha o mês.

O botão **Fechar <mês>** só libera quando não sobra nenhuma pendência. Ao fechar, o mês guarda a **sobra realizada**: o que entrou menos o que saiu. O aviso de fechamento oferece **Desfazer**. No Início, o mês aparece como **Mês fechado**, com esse valor.

Se houver mais de uma conta de débito automático pendente, o botão **Confirmar todas as automáticas (N)** lança todas de uma vez.

### Levar a sobra para o mês seguinte

Quando a sobra realizada é positiva, a folha de fechamento mostra a caixa **Levar R$ X para {mês}**, já marcada. Ao fechar, o app:

- cria a categoria de renda **Sobra do mês anterior**, na primeira vez (ela não pode ser apagada nem virar gasto);
- lança o valor nela, no dia 1 do mês seguinte, com a descrição "Sobra de {mês}".

Assim o dinheiro que sobrou entra na renda do mês seguinte e aumenta o disponível dele. A sobra levada **não conta como renda** nos totais do ano, no gráfico **Sobra mês a mês**, na meta de Guardar nem nas médias, para a mesma sobra não ser contada duas vezes. Fechar o mês de novo atualiza o mesmo lançamento. **Desfazer** apaga o lançamento.

Depois de fechado, mudar um lançamento desse mês pede confirmação. Vale para editar, apagar ou lançar. O primeiro toque avisa que o mês está fechado. O segundo grava, e a sobra registrada é atualizada.

Se a sobra mudar depois do fechamento, por exemplo porque outra pessoa ou outro aparelho alterou o mês, o Início mostra **Alterado depois do fechamento: a sobra era R$ ...**. O botão **Fechar de novo** grava a sobra nova.

### Extrato

Todos os lançamentos, agrupados por dia, com busca (no computador: tecla `/`) e filtros, como o filtro **Saídas**. Toque num lançamento para editar, duplicar ou apagar. O botão **Importar extrato** traz lançamentos de um arquivo do banco (veja **Importar extrato**).

Com texto na busca, escolha entre **Neste mês** e **Em <ano>**, que procura no ano inteiro. A opção do ano já vem marcada.

### Mês

Cada categoria com o que foi gasto, o plano e o ritmo. No topo, para o mês atual, estão **Renda do mês**, **Saídas previstas** e **Disponível**. É aqui que você **planeja**:

- **Copiar de** (nome do mês anterior): mostra duas opções. **Copiar o plano de <mês>** usa os planos do mês passado. **Copiar o lançado em <mês>** usa o que foi lançado nele; onde não houve lançamento, vale o plano. O aviso mostra quantas categorias e o total, e dá para **Desfazer**.
- **Preencher com as médias:** grava como plano a média dos últimos 3 meses fechados de cada categoria com histórico, só com o que foi lançado. O botão mostra antes quantas categorias e o total, e pede um segundo toque: **Preencher 3 categorias (R$ 1.200,00)? Toque de novo**. Depois de gravar, o aviso oferece **Desfazer**.
- **Repetir até dezembro:** no painel da categoria, digite o valor do plano e toque em **Repetir até dezembro**. O plano vale do mês que está na tela até dezembro. Se algum desses meses já tem um plano diferente, o primeiro toque só avisa, com "Substituir N planos? Toque de novo", e diz quais meses vão mudar. O segundo toque grava. Depois, o aviso oferece **Desfazer**.
- **Contas que se repetem:** a categoria cujo plano vem de **Todo mês** mostra o campo vazio, com o valor como dica e a marca "↻ todo mês". Digitar grava o plano só daquele mês, e **Apagar plano** volta ao valor que se repete. **Copiar de**, **Preencher com as médias** e **Repetir até dezembro** avisam quantas categorias que se repetem passam a usar o valor copiado.
- **Usar sugestão:** a média de cada categoria (só com o que foi lançado nos 3 meses fechados antes deste) aparece como **texto ao lado do campo**, com um botão **Usar sugestão**. O campo do plano fica vazio (placeholder `0,00`) até você digitar ou tocar em **Usar sugestão**. Digite como se escreve, por exemplo `1200` ou `12,00`. A sugestão **não entra nos totais** enquanto não virar plano.
- **Limpar o mês:** apaga os planos deste mês. O primeiro toque mostra quantos planos saem e o total; o segundo toque apaga. Isso não cancela as despesas lançadas: elas só deixam de ser reservadas no disponível.
- **Salvo:** quando você grava um plano, a palavra **salvo** aparece ao lado do campo por alguns segundos.
- **Como os planos entram nos cálculos:** no modo Planejar, abra essa explicação quando precisar rever a diferença entre plano, previsto, sugestão e Guardar. Ela fica recolhida por padrão para deixar as categorias e os campos mais próximos.
- **Guardar:** a linha mostra "Guardado", "Previsto R$ ... · nada guardado", "Faltam R$ ..." ou "Nada guardado". O plano dela é a meta; para mudar a meta, edite o plano aqui ou a meta de economia em **Plano do mês**, no Início. Enquanto a transferência não é lançada, o que falta dela fica reservado como **Falta guardar**. Depois de confirmar, o valor entra como guardado.
- **Apagar plano:** no painel que abre ao tocar numa categoria, o link **Apagar plano** remove o plano daquele mês, com aviso e **Desfazer**.

O app nunca inventa previsão: categoria sem plano conta só o que foi lançado. O plano de uma categoria reserva o que ainda falta dele até o fim do mês (ou até você encerrar a categoria no mês). Gastar dentro do plano não muda o disponível. A média é uma sugestão, não um plano; ela só entra nas contas depois que você usa. Apagar um plano não cancela a despesa; ela só deixa de ser reservada no disponível — o app avisa e oferece **Desfazer**.

### Planilha (melhor no computador)

O ano inteiro numa tabela: categorias nas linhas, meses nas colunas. No topo, o gráfico **Sobra mês a mês** mostra a sobra realizada de cada mês fechado e a prevista, em contorno. Ele fica aqui, e não no Início.

- As cores mostram onde cada categoria fugiu da própria média. No mapa de calor, ▲ e ▼ também aparecem, para a leitura não depender só da cor: ▲ é acima da média, ▼ abaixo.
- Clique numa célula para ver os lançamentos dela e lançar direto ali. Use as setas do teclado para andar e `Enter` para abrir.
- No celular, deslize horizontalmente dentro da tabela; a coluna de categorias fica fixa e uma dica na tela indica a rolagem. A região também pode receber foco e ser percorrida pelo teclado.
- A célula mostra o que foi lançado. Numa categoria sem lançamento, vale o plano, marcado como previsto (tracejado). Nos meses fechados, os totais e a sobra somam só o que foi lançado. No mês atual e nos próximos, somam também o que falta de cada plano. O rodapé **Total de saídas** inclui Guardar.
- Apagar um plano não cancela a despesa; ela só deixa de ser reservada no disponível. O app avisa e oferece **Desfazer**.

### Ajustes

Nome do controle, tema (automático, claro ou escuro), categorias, **Cartões de crédito**, a seção **Atualizações**, a seção **Seus dados** e **Diagnósticos**. A versão do app aparece no rodapé do menu (no computador), no topo de **Ajustes** e no cartão **Atualizações**, que avisa quando há versão nova e mostra o passo a passo para atualizar.

A cor de cada categoria segue a posição dela na lista, então ela muda quando você reordena. O texto usa a fonte DM Sans, que já vem com o app.

Em **Ajustes › Categorias**:

- **Trocar o grupo:** entre **Fixos** e **Variáveis**, a troca é livre, e o aviso traz **Desfazer**.
- **Renda e gasto:** uma categoria com lançamentos não muda entre renda e gasto. Isso inverteria o sinal do que já foi lançado. O app avisa e sugere criar outra categoria.
- **Categoria de economia:** o botão de apagar fica desabilitado, e ela não pode virar renda.
- **Sobra do mês anterior:** a categoria criada ao levar a sobra para o mês seguinte também não pode ser apagada nem deixar de ser renda.

O navegador busca o ícone no GitHub. A fonte já vem com o app, então não há consulta ao Google Fonts. Se o aviso de versão estiver ligado, ele também consulta o arquivo de versões no GitHub ou no jsDelivr. O texto de Ajustes diz isso. Esses serviços veem o endereço IP de quem usa, mas nenhum dado da planilha é enviado.

## Importar extrato

Traz lançamentos de um arquivo do banco, sem digitar. Fica em **Ajustes** (ao lado de **Importar backup**) e no **Extrato**. O arquivo é lido no próprio navegador e não sai do seu aparelho.

1. Escolha o arquivo: **OFX**, **QFX**, **CSV** ou **TXT**, até 2 MB. Passando de 2.000 linhas, só as primeiras são lidas, e o app avisa.
2. No **CSV**, o app mostra as primeiras linhas e tenta adivinhar as colunas. Confira **data**, **descrição** e **valor**, e marque se a primeira linha é cabeçalho. Aceita `;`, vírgula e tabulação, datas como 25/11/2026 e valores como `1.234,56`.
3. Marque **Fatura de cartão** se o arquivo é de um cartão: nele as compras vêm positivas, e o app inverte o sinal. No extrato de conta, o débito é negativo e vira gasto.
4. Escolha a **categoria padrão** (uma para saídas, outra para rendas). Cada linha vem com a categoria sugerida pelo seu histórico, e dá para trocar.
5. Revise a prévia e importe. Só entram as linhas marcadas.

Cada linha mostra a situação:

| Situação | O que acontece |
|---|---|
| nova | vem marcada |
| parece repetida | já existe lançamento com a mesma data, valor e descrição; vem desmarcada, e você decide |
| já importada | foi importada antes deste mesmo arquivo; fica de fora |
| repetida no arquivo | o mesmo registro aparece duas vezes no arquivo; fica de fora |
| inválida | sem data ou sem valor; fica de fora, com o motivo |

Importar o mesmo arquivo duas vezes não duplica nada. Duas compras iguais no mesmo dia, com a mesma descrição, contam como duas. **Baixar backup antes** guarda uma cópia antes de gravar. Ao importar, **Desfazer** apaga todos os lançamentos do arquivo. Se alguma linha cai num mês já fechado, o app avisa e atualiza o fechamento.

## Cartão de crédito

Compra no cartão entra no mês em que a fatura é **paga**, não no dia da compra.

- **Cadastrar:** em **Ajustes › Cartões de crédito**, toque em **Novo cartão** e informe o nome, o dia do **fechamento**, o dia do **vencimento** e, se quiser, o **limite**. Com limite, a fatura mostra quanto ainda está disponível, ou quanto passou dele.
- **Lançar uma compra:** no **Novo lançamento** de um gasto, escolha **Pago com** o cartão. A categoria é a de sempre.
- **Parcelas:** **Parcelar** no cartão divide a compra em uma parcela por fatura mensal seguinte.
- **Ver a fatura:** no **Mês**, o bloco **Cartões de crédito** mostra cada fatura com o vencimento e o total. Toque nela para ver as compras.
- **Arquivar:** esconde o cartão do seletor de **Pago com**, e a fatura continua no Mês. Um cartão com lançamentos não se apaga; arquive-o.

O que é e o que não é:

- Cada compra é um lançamento comum. A fatura é só um agrupamento: o total aparece, mas nunca é somado de novo.
- A compra cai no mês em que a fatura é paga, no dia do vencimento. A data real da compra não fica guardada.
- Compra feita até o dia do fechamento entra na fatura que fecha naquele dia; depois dele, na seguinte. Se o vencimento vem depois do fechamento, a fatura é paga no mesmo mês; se não, no mês seguinte. Dia 31 em mês curto vale o último dia do mês.

## Diagnósticos

Em **Ajustes › Diagnósticos**, toque em **Ver diagnósticos**. A folha mostra a versão, a revisão, a fila de envio, a última sincronização, a **duração do último envio**, as operações recusadas e os sinais da planilha (só contagens, como lançamentos sem descrição e meses com pendências). Tocar num mês com pendências abre esse mês na tela Mês.

**Copiar diagnóstico** leva só contagens e datas, sem nomes, descrições ou valores. A duração do último envio é o número para medir a sincronização no seu aparelho.

## Imprimir o mês

No **Mês**, o botão **Imprimir este mês** abre a impressão do navegador, onde também dá para salvar como PDF. A impressão sai em cores claras, sem menus nem botões.

## Seus dados e backup

Tudo fica na planilha do seu Google Drive. O botão **Abrir a planilha** em Ajustes leva até ela.

- **Baixar backup (JSON):** um arquivo com tudo, inclusive o tema, os encerramentos de categorias, os meses fechados, as recorrências, os "não vem" e a categoria da sobra (formato 3). Vale fazer uma vez por mês e guardar no computador ou no Drive. Ajustes mostra "Último backup" com a data e a hora, guardadas só neste aparelho.
- **CSV dos lançamentos:** todos os lançamentos, de todos os anos, num arquivo que abre no Excel ou no Google Sheets. O botão fica em Ajustes e na Planilha.
- **CSV da tabela de {ano}:** a tabela do ano (categorias nas linhas, meses nas colunas, com os totais, saídas, renda e sobra). A sobra levada de um mês para o outro não entra na renda dessa tabela.
- **Importar backup:** traz de volta um arquivo baixado. Aceita os formatos 1, 2 e 3. Ao escolher o arquivo, o app mostra antes quantas categorias e quantos lançamentos vão entrar. Mostra também as recorrências do arquivo e o que fica de fora, com o motivo, por exemplo "dia inválido para o mês: 31" ou "categoria inexistente". Depois, pergunta se é para **juntar** com o que já existe ou **substituir tudo**. Ao substituir, o tema do arquivo é aplicado; ao juntar, o tema atual é mantido.
- **Substituir tudo** troca os dados atuais pelo conteúdo do arquivo. Por isso o botão mostra **Baixar backup agora**, e o botão **Substituir tudo** só libera depois que você digitar SUBSTITUIR.
- No fim da importação, o aviso repete o que ficou de fora.
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
| `Ctrl+Z` | no computador, desfaz a última ação que ainda não foi desfeita (fora de um campo de texto) |
| endereço do app + `?novo=1` | abre já na tela de lançamento |
| endereço do app + `?novo=mercado` | abre o lançamento com a categoria "Mercado" escolhida |
| endereço do app + `?tela=mes&ano=2026&mes=3` | abre a tela Mês em março de 2026 |

No `?novo=` vai o **código** da categoria. Ele é o nome que a categoria tinha quando foi criada, em minúsculas, sem acento e com hífen no lugar dos espaços: "Saúde e farmácia" vira `saude-e-farmacia`. Renomear a categoria depois não muda o código. Na dúvida, o código está na coluna `id` da aba `categorias` da planilha. Se o código não bater, o lançamento abre sem categoria escolhida.

Dica: abra o endereço com `?novo=mercado` no celular e use **Adicionar à tela inicial**. Fica um ícone que já abre o lançamento de mercado.
