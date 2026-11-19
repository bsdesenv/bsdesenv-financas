# bsdesenv-financas

Controle financeiro pessoal que roda no **Google Sheets + Apps Script**: rápido para lançar no celular, completo no computador, e com os seus dados numa planilha da sua própria conta Google.

*Personal finance tracker built on Google Sheets + Apps Script (Portuguese UI). Your data stays in your own spreadsheet.*

<p>
  <img src="docs/img/celular-inicio.png" alt="Início no celular: disponível para gastar com barra de composição, números do mês com micrográficos, meta de economia, ritmo do plano e contas a vencer" width="260">
  <img src="docs/img/celular-lancar.png" alt="Novo lançamento no celular: teclado numérico, data e categorias" width="260">
  <img src="docs/img/celular-mes.png" alt="Mês no celular: cada categoria com gasto, plano e ritmo" width="260">
</p>

![Início no computador: campo de lançamento rápido no topo, disponível para gastar com anel de composição, números do mês com micrográficos, variáveis do mês com resumo, meta de economia e ritmo do plano](docs/img/computador-inicio.png)

## Por que usar

- **Seus dados, sua planilha.** Tudo fica numa planilha do seu Google Drive, em abas comuns que dá para abrir e ler. Sem servidor de terceiros, sem mensalidade, sem anúncio e sem senha de banco.
- **Lançar em três toques.** O botão **+** fica sempre à mão; no computador, a barra do topo é um **lançamento rápido de gasto**: digite `32,90 mercado padaria` e pressione `Enter` para gravar com a data de hoje. Para escolher categoria, data ou descrição, use **Novo lançamento** (ou `Ctrl+K`). O valor se digita como no app do banco (6430 vira R$ 64,30), as categorias mais usadas vêm primeiro e a data já começa em "hoje".
- **A regra da planilha, sem mágica.** O plano de uma categoria só entra enquanto ela não tem lançamento; depois do primeiro lançamento, só o realizado conta. O **anel de composição** do Início mostra onde está a renda do mês — **Já saiu**, **Planos sem lançamento** e **Disponível**, com a porcentagem livre no centro — e o **disponível** é renda − o que já saiu − os planos sem lançamento. O **Ritmo do plano** compara o gasto com o plano, mas o plano não desconta o disponível. A **Meta de economia** sugere 80% da sobra média realizada dos últimos 3 meses fechados — a sugestão só vira meta quando você grava.
- **Nada fica fora da conta sem aviso.** Categorias sem plano aparecem em **Cobertura do plano**, com o valor que está fora da barra; um toque planeja pela média dos últimos 3 meses. Como essas categorias já têm lançamento, o plano novo entra no ritmo, não no disponível. A sobra do mês atual é a mesma do disponível; nos meses fechados, quando há dados reais, o app mostra a **realizada**.
- **Planilha no computador.** O ano inteiro numa matriz com mapa de calor (onde cada categoria fugiu da própria média), atalhos de teclado e lançamento direto na célula.
- **Não perde nada.** Celular e computador podem ser usados ao mesmo tempo sem um apagar o outro. Sem conexão, o app guarda no aparelho e envia depois. Toda exclusão tem "Desfazer".
- **Acessível.** Contraste AA nos temas claro e escuro, alvos de toque de 44 px e navegação completa pelo teclado.

## Telas

| Planilha com mapa de calor | Modo escuro |
|---|---|
| ![Planilha do ano com mapa de calor e o mês atual com o lançado e o previsto](docs/img/computador-planilha.png) | ![Início no computador em modo escuro](docs/img/computador-escuro.png) |

| Extrato | Primeiro acesso |
|---|---|
| <img src="docs/img/celular-extrato.png" alt="Extrato agrupado por dia, com busca e filtros" width="300"> | <img src="docs/img/primeiro-acesso.png" alt="Primeiro acesso: escolha de um modelo de categorias" width="300"> |

Os prints são ilustrativos e usam dados fictícios.

## Começar

Não precisa saber programar. Você precisa de uma conta Google pessoal (Gmail), de um computador para a instalação e de uns 10 minutos.

| Sua situação | Siga |
|---|---|
| Vou instalar pela primeira vez | **[docs/INSTALAR.md](docs/INSTALAR.md)**: passo a passo com os nomes exatos de cada menu e arquivo |
| Já instalei e quero entender as telas | **[docs/USAR.md](docs/USAR.md)**: disponível para gastar, meta de economia, plano, backup e atalhos |
| Já uso a versão 1 | **[docs/ATUALIZAR.md](docs/ATUALIZAR.md)**: troca só o código, sem migrar dados |
| Deu algum erro | **[Problemas comuns](docs/INSTALAR.md#problemas-comuns)** |

Resumo da instalação, para quem já conhece o Apps Script: crie uma planilha, cole os arquivos de [`src/`](src) em **Extensões › Apps Script** e publique como **App da Web**, com *Executar como: Eu* e *Quem pode acessar: Somente eu*.

## Como funciona

A planilha é a fonte da verdade, em quatro abas legíveis:

| Aba | O que tem |
|---|---|
| `lancamentos` | uma linha por gasto ou renda: id, ano, mês, dia, categoria, descrição, valor |
| `categorias` | nome, grupo (fixo, variável ou renda) e ordem — a categoria Guardar é um fixo especial, com id `guardar` |
| `orcamento` | o plano de cada categoria em cada mês |
| `config` | nome do controle, tema e a revisão usada na sincronização |

O app nunca regrava a base inteira. Ele envia **operações** (salvar ou apagar um lançamento, mudar um plano...) e o servidor as aplica sobre o que está na planilha naquele momento. Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Privacidade e segurança

- O app roda **na sua conta**, com acesso **somente seu**. Ninguém mais abre o endereço.
- A permissão pedida ao Google é **"somente esta planilha"** (`@OnlyCurrentDoc`), não todas as suas planilhas.
- O Google mostra o aviso "app não verificado" porque o script é seu e não foi publicado na loja. O código é o deste repositório.
- Requisições externas: só a fonte Inter (Google Fonts) e o ícone da aba (este repositório no GitHub). Os seus dados nunca vão para o GitHub.
- Texto que viraria fórmula na planilha (começando com `=`, `+`, `-` ou `@`) é gravado como texto.

## Desenvolvimento

```
src/          arquivos do Apps Script (é o que vai para o projeto)
testes/       servidor rodando no Node sobre uma planilha falsa, e testes no navegador
exemplos/     dados fictícios para experimentar e para os testes
docs/         guias e imagens
```

As versões ficam marcadas como tags (`v2.1.0`...) e o que mudou em cada uma está no [CHANGELOG.md](CHANGELOG.md).

```bash
npm test             # testes do servidor (Node 20+, sem dependências)
npm i -D puppeteer   # uma vez, para os testes no navegador
npm run test:e2e     # o app de verdade num Chrome sem janela, falando com o servidor de verdade
npm run prints       # regrava os prints de docs/img com os dados fictícios
```

Para enviar o código direto para o Apps Script, use o [clasp](https://github.com/google/clasp): copie `.clasp.json.example` para `.clasp.json`, preencha o `scriptId` do seu projeto e rode `npx clasp push`.

## Licença

[MIT](LICENSE)
