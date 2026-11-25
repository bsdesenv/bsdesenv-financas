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
| **instalador** | Projeto Apps Script separado (`instalador/`) que cria a planilha, copia o código e publica o web app no Drive do usuário. |
