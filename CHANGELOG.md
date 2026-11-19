# Changelog

## 2.3.0 — 2026-11-19

### Novo
- **Lançamento rápido de gasto na barra do topo (computador).** A barra deixou de ser um botão e virou um campo de verdade: digite algo como `32,90 mercado padaria` e pressione `Enter`. O app grava na hora, com a data de hoje, mostra o aviso com **Desfazer** e limpa o campo. Se não reconhecer a categoria, abre o formulário completo já preenchido com o texto.
- **Variáveis do mês.** O cartão do Início ganhou o resumo **Gasto**, **Plano** e **Ainda previsto** (só das categorias variáveis); o gráfico **“Para onde foi”**, com as 5 maiores categorias variáveis do mês + **Outras**, legenda e percentuais; e os atalhos **Lançar** e **Ajustar planos** no rodapé, com a dica “Toque numa categoria para lançar ou ajustar o plano”.
- **Limpar meta.** O cartão **Meta de economia** ganhou o link que remove o plano de Guardar do mês, com aviso e **Desfazer**.
- **Ajustar meta.** O **Ritmo do plano** ganhou o atalho que foca o campo da Meta de economia.
- **Apagar plano no painel da categoria.** Ao tocar numa categoria, o painel agora tem o link **Apagar plano**, que remove o plano daquele mês com aviso e **Desfazer**.

### Mudou
- **Atalho `N`.** No computador, foca o campo de lançamento rápido; no celular, abre o formulário completo. O botão **Novo lançamento** e `Ctrl+K` continuam abrindo o formulário completo.
- **Meta de economia.** O cartão mostra o percentual da renda ao lado da meta (por exemplo, `Meta R$ 2.000,00 · 16,6% da renda`) e explica que, enquanto a meta não é lançada, ela entra como plano sem lançamento; depois, entra o realizado.
- **Ritmo do plano.** O cartão ganhou o botão **Ajustar plano** no topo, que leva para **Mês › Planejar**, a linha `Plano = X% da renda do mês` e a linha da meta de economia com valor e percentual da renda. O texto continua explicando que o plano é só ritmo e não desconta o disponível.
- **Regra de cálculo da v2.2.0 mantida.** O plano de uma categoria só entra enquanto ela não tem lançamento; depois do primeiro lançamento, só o realizado conta. `Disponível = renda − gastos`; o plano das categorias com lançamento aparece só no **Ritmo do plano**; a sugestão de média só vira plano quando você usa; a sobra do mês é a mesma do disponível; meses fechados usam a sobra realizada.

### Corrigido
- **A barra do topo não é mais um botão disfarçado de campo.** Antes, clicar nela abria o formulário completo e o ícone era uma lupa; agora é um campo real de lançamento rápido, com ícone de raio.

## 2.2.0 — 2026-11-19

### Mudou
- **Volta à regra da planilha:** o plano de uma categoria só entra enquanto ela não tem lançamento. Depois do primeiro lançamento, o plano deixa de contar e só o realizado conta.
- **Disponível = sobra.** O número principal volta a ser a sobra da planilha (renda − gastos). A reserva do "restante dos planos já iniciados" foi removida; o que conta é o lançado e o plano das categorias sem lançamento.
- **Planos sem lançamento.** O KPI e a linha do herói mostram só os planos das categorias sem nenhum gasto. É o "previsto" da planilha.
- **De onde vem o disponível.** A folha mostra planos sem lançamento, o plano usado no ritmo (que não desconta o disponível) e as categorias acima do plano.
- **Ritmo do plano.** O plano da barra é só referência de ritmo; o plano de uma categoria com lançamento não desconta o disponível.
- **Mês.** "Gastos do mês" inclui lançado + previsto; "Sobra do mês" é a mesma do Início.

## 2.1.3 — 2026-11-18

### Corrigido
- **A sugestão de média não entra mais nos totais.** O campo do plano começa vazio (placeholder `0,00`) e a média dos 3 meses aparece ao lado, como texto, com o botão **Usar sugestão**. Ela só vira plano quando você usa; até lá, não entra no gasto previsto, no disponível nem na sobra.
- **Preencher com as médias** agora mostra quantas categorias foram preenchidas e o total, e oferece **Desfazer**. O botão antigo se chamava "Usar as médias".
- **Copiar de** também mostra o total e oferece **Desfazer**.

## 2.1.2 — 2026-11-18

### Mudou
- **De onde vem o disponível.** O herói agora mostra a ponte completa: **Renda − Já saiu = Ainda na conta**, depois **− Planos sem lançamento = Sobra otimista**, depois **− Restante dos planos já iniciados = Disponível**. O link **De onde vem esse valor?** abre a conta e a lista de cada categoria.
- **Ainda planejado.** O KPI "Ainda reservado" virou "Ainda planejado" e o detalhe separa planos sem lançamento, restante dos planos já iniciados e categorias acima do plano.
- **Sobra otimista.** A tela Mês e o gráfico usam a sobra do mês atual sem descontar o restante dos planos já iniciados, com aviso explícito. A sobra realizada dos meses fechados não muda.
- **Ajustar planos.** A folha "De onde vem o disponível" tem um botão que leva direto para **Mês › Planejar**.

## 2.1.1 — 2026-11-18

### Mudou
- **Card do Início mais simples.** O herói agora mostra a conta em quatro linhas: **Renda** − **Já saiu** − **Ainda reservado** = **Disponível**. A "sobra projetada" saiu do herói e dos KPIs do mês; ela continua no gráfico "Sobra mês a mês" e na tela Mês.
- **Ritmo do plano em cartão próprio.** A barra de gasto × plano saiu do herói e virou o cartão **Ritmo do plano**, com a explicação de que ela compara o consumo com o plano e não é a conta do disponível.
- **KPIs do mês:** Renda do mês, Já saiu, Ainda reservado e Guardado. O cartão "Gasto até hoje" virou "Já saiu" para incluir as transferências de Guardar quando existirem.
- **Cobertura do plano** agora começa com "Sem plano: R$ ...", deixando claro o valor que está fora da barra e não é reservado.

## 2.1.0 — 2026-11-18

"Guardar primeiro": o app reserva a meta de economia e os planos do mês antes de mostrar quanto há para gastar.

### Novo
- **Categoria Guardar.** Um fixo especial (id `guardar`) que é a primeira reserva do mês: o plano é a meta de economia e o lançamento é a transferência feita. Ela não entra na barra de gastos, nos avisos de "passou do plano" nem em "Sem plano", mas entra no total de saídas, na sobra e no disponível. Os quatro modelos de primeiro acesso já vêm com ela.
- **Meta de economia.** Cartão no Início com o guardado, a meta e o que falta. O campo grava a meta do mês e o botão **Confirmar** registra a transferência. Se a categoria ainda não existe, o app sugere **80% da sobra média realizada dos últimos 3 meses fechados** (em múltiplos de 10) e oferece criá-la. A sugestão não é automática: só vira meta quando você toca no botão ou grava o valor.
- **Cobertura do plano.** Cartão que mostra quanto está em categorias sem plano — valor que fica fora da barra e não é reservado no disponível — e oferece planejar pela média dos últimos 3 meses.
- **Backup do tema.** O JSON agora inclui o tema escolhido. A importação em **substituir tudo** aplica o tema do arquivo (se for válido); em **juntar**, mantém o tema atual.

### Mudou
- **Guardar primeiro, disponível conservador.** "Livre para gastar" virou **Disponível para gastar até ...**: a conta usa a renda já recebida (ou a prevista, se nada entrou) e desconta o que já foi gasto e o que ainda falta lançar dos planos, inclusive as categorias variáveis e a meta de Guardar. O texto do herói lembra a meta e o valor por dia.
- **Sobra projetada e sobra realizada.** No mês atual, a sobra é **projetada**: usa o lançado e, sem lançamento, o plano. Nos meses passados, o app usa a **sobra realizada** (renda recebida − gastos lançados) quando há dados reais e rotula "realizada"; sem eles, mostra "com previsto". O cartão do ano segue a mesma regra e marca os meses projetados com contorno.
- **Renda recebida e renda prevista.** O KPI de renda mostra "recebida R$ X de R$ Y" quando há renda recebida; sem lançamento, "prevista". O disponível usa a renda recebida; se nada entrou, usa a prevista.
- **Barra de atenção.** A barra do plano, que compara só as categorias de consumo com plano, fica em atenção quando o gasto passa mais de 12 pontos do ritmo do mês, antes de estourar o plano.
- **Aviso ao apagar plano.** Limpar o plano de uma categoria (ou usar **Limpar plano**) avisa: "Plano removido. Isso não cancela a despesa; só deixa de reservá-la." com **Desfazer**.
- **Telas.** "Previsto a lançar" saiu do Início; "Sobra do mês" virou "Sobra projetada"; a nota do herói não diz mais que o mês "fecha com sobra". O cartão "A vencer" não mostra Guardar, e a Planilha passou de "Total de gastos" para "Total de saídas" (inclui Guardar). A tela Mês mostra Guardar como compromisso fixo e o disponível já desconta a meta.

### Corrigido
- Lançamento com dia que não existe no mês (como 31/02) passou a ser recusado no servidor, que valida o dia contra o número de dias do mês.

## 2.0.3 — 2026-11-18

### Corrigido
- A barra "Plano" do início comparava todo o gasto do mês com a soma só das categorias que têm plano, e mostrava, por exemplo, 181% usado quando o uso real era 82%. Agora a barra compara só as categorias com plano; o gasto em categorias sem plano aparece à parte, como "Sem plano".

## 2.0.2 — 2026-11-18

### Corrigido
- **A sobra não reagia ao que você lançava ou apagava.** No mês atual, cada categoria entrava na conta pelo maior valor entre o lançado e o plano, e categoria sem plano ganhava a média dos 3 meses anteriores, que não dava para apagar. Agora vale a regra da versão 1 em todos os meses: o lançado; sem lançamento, o plano que você gravou. Apagar um lançamento ou um plano muda a sobra na hora.
- A média dos 3 meses virou só sugestão (no campo do plano e no botão "Usar as médias"). O botão "Confirmar" não lança mais média como se fosse gasto.
- Início: "Projeção de gastos" e "Fechamento previsto" viraram **Previsto a lançar** e **Sobra do mês**, e o texto diz quanto da sobra vem de planos ainda sem lançamento.

## 2.0.1 — 2026-11-18

### Corrigido
- Celular: na tela de lançar, as categorias ficavam espremidas e cortadas entre o valor e o teclado quando a barra do navegador ocupava parte da tela; em celulares pequenos, o botão Salvar chegava a sair da tela. Agora valor, categorias, teclado e Salvar ficam sempre inteiros: Gasto/Renda subiu para o topo, os dois botões de salvar ficam lado a lado e as teclas se ajustam à altura disponível. Em telas baixas (ou com "Outra data" aberta), as categorias ficam numa linha que rola para o lado.

## 2.0.0 — 2026-11-18

Reescrita completa da interface e da sincronização. Os dados continuam nas mesmas abas, com o mesmo formato: quem usa a versão 1 só troca o código (veja [docs/ATUALIZAR.md](docs/ATUALIZAR.md)).

### Novo
- Interface para celular e computador: navegação embaixo no celular e menu lateral no computador.
- Lançamento rápido: teclado de valor como o do banco, categorias mais usadas primeiro, data em "hoje", sugestões de descrição. No computador, aceita frases como "32,90 mercado padaria".
- Início com "livre para gastar até o fim do mês", ritmo, projeção do fechamento, contas a vencer e avisos.
- Tela **Mês** para acompanhar e planejar cada categoria (copiar do mês anterior, usar médias).
- **Planilha** do ano com mapa de calor, projeção do mês corrente, painel de lançamento na célula e navegação pelas setas.
- Primeiro acesso guiado, com modelos de categorias (Essencial, Família, Autônomo, Do zero).
- "Desfazer" em lançar, editar, apagar e em outras ações.
- Backup completo em JSON, importação (juntar ou substituir) e exportação em CSV.
- Modo escuro (automático, claro ou escuro). Botão Voltar do celular fecha painéis. Atalhos `N`, `Ctrl+K` e `/`.

### Corrigido em relação à versão 1
- Celular e computador abertos ao mesmo tempo apagavam o trabalho um do outro. Agora o servidor aplica operações sobre o estado atual da planilha.
- Edição que falhava ao gravar se perdia ao reabrir o app. Agora fica numa fila no aparelho e é reenviada.
- Um arquivo com `anos: {}` apagava todo o histórico. Agora a importação exige confirmação e valida item por item.
- "1.500" era lido como R$ 1,50, e "100-20" virava só 100.
- "Restaurar dados" travava o app.
- As fontes declaradas não eram aplicadas (nome da família errado).
- Textos secundários reprovavam o contraste mínimo (WCAG AA).
- O foco do teclado se perdia depois de editar um campo, e a busca recriava o campo a cada tecla.
- No celular: a coluna de valores do extrato e partes dos ajustes ficavam fora da tela.

### Segurança
- Permissão restrita à planilha onde o script está instalado (`@OnlyCurrentDoc`).
- Removido `XFrameOptionsMode.ALLOWALL`.
- Texto que viraria fórmula é gravado como texto. Ids validados.
