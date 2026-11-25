# Glossário

> Termos do domínio. Quando um termo aqui muda de sentido, é mudança de produto: atualizar `produto.md` e registrar em `estado.md`.

Entra aqui o termo que um recém-chegado entenderia errado, e principalmente **os pares que se parecem e não são a mesma coisa**.

| Termo | Significa |
|---|---|
| **disponível** | Renda do mês − o que já saiu − o que ainda está reservado (contas a pagar + planos restantes). Gastar dentro de um plano não muda o disponível. |
| **renda** | Entrada de dinheiro do mês. Pode ser prevista e recebida parcialmente; receber parte de uma renda prevista não altera o disponível. |
| **fixo** | Categoria de despesa que se repete todo mês (ex.: aluguel, internet). Um dos valores de `GRUPOS`. |
| **variável** | Categoria de despesa que varia de mês a mês (ex.: mercado, lazer). Um dos valores de `GRUPOS`. |
| **economia** | Categoria de despesa negativa/sobra guardada no mês. Fechamento do mês guarda a sobra realizada aqui. |
| **plano / orçamento** | Valor planejado para uma categoria em um mês, guardado na aba `orcamento`. "Plano" é o nome na UI; "orçamento" é o nome da aba. |
| **lançamento** | Uma entrada na aba `lancamentos`: despesa, receita ou transferência, com data e categoria. |
| **categoria** | Uma entrada na aba `categorias`, com nome, grupo (`fixo`, `variavel`, `renda`) e ordem. |
| **revisão** | Número inteiro incrementado a cada sincronização; o app usa `estado()` para saber se precisa recarregar. |
| **importar** | Operação que traz dados de outra planilha/cópia de segurança para dentro do app atual. |
| **fechamento** | Ação de fechar um mês passado: as pendências aparecem uma a uma e a sobra realizada é guardada. |
| **recorrência** | Conta ou renda que se repete todo mês, guardada na aba `recorrencias`: valor, dia, débito automático, início e fim. Não é o mesmo que o plano: sem plano gravado, o plano do mês é a soma delas. Na tela chama-se **Todo mês**. |
| **Todo mês** | O bloco da folha da categoria que lista e edita as recorrências dela. |
| **Não vem em {mês}** | Marca `pular:AAAA-MM:<id>` que tira uma recorrência de um único mês, sem apagá-la. Não é o mesmo que **Encerrar**, que dá fim à recorrência a partir de um mês. |
| **parcela** | Lançamento de uma compra dividida em 2 a 48 vezes, com id `p{grupo}-{kk}` e descrição "base (k/n)". A soma é o total da compra. Cai no mês em que será paga, não no da compra. |
| **transporte de sobra** | Lançamento de renda `sAAAAMM`, dia 1, que leva a sobra realizada de um mês ao seguinte, na categoria "Sobra do mês anterior" (`categoriaSobra`). Entra no disponível, mas não nos totais de renda do ano, na meta nem nas médias. |
| **importar extrato** | Traz lançamentos de um CSV ou OFX do banco, lido no navegador, com prévia e Desfazer. Não é o mesmo que **importar** (backup JSON). |
| **fatura de cartão** | Opção do importar extrato que inverte o sinal: no cartão as compras vêm positivas. |
| **instalador** | Projeto Apps Script separado (`instalador/`) que cria a planilha, copia o código e publica o web app no Drive do usuário. |
