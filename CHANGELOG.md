# Changelog

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
