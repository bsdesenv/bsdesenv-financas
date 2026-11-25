# Arquitetura

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/Codigo.gs` | Servidor (Apps Script): serve a página, lê e grava as abas, aplica operações |
| `src/Index.html` | Esqueleto da página; junta `Estilos` e `App` com `incluir()` |
| `src/Estilos.html` | Visual: tokens de cor (claro e escuro), layout de celular e de computador |
| `src/App.html` | O app no navegador: estado, sincronização, cálculos, telas |
| `src/appsscript.json` | Manifesto: fuso, permissão mínima e configuração do app da Web |
| `versao.json` | Canal de versões lido pelo app: versão, tag, novidades e SHA-256 dos arquivos |
| `instalador/` | Projeto Apps Script separado que instala e atualiza o Finanças no Drive de quem usa |

## Dados

A planilha é a fonte da verdade. São quatro abas, no mesmo formato da versão 1:

```
lancamentos  id | ano | mes | dia | categoriaId | descricao | valor
categorias   id | nome | grupo (fixo|variavel|renda) | ordem
orcamento    ano | categoriaId | mes | valor              ← o "plano"
config       chave | valor   (nome, tema, revisao, atualizadoEm…)
```

O app recebe tudo agrupado por ano:

```js
{ revisao, nome, tema, planilha: { id, nome, url },
  categorias: [{ id, nome, grupo, ordem }],
  anos: { "2026": { lancamentos: [{ id, mes, dia, categoriaId, descricao, valor }],
                    orcamento: { mercado: { "11": 1200 } } } } }
```

O backup em JSON (Ajustes › Baixar backup) usa esse mesmo formato e inclui o tema em `config: { tema }`. A importação aceita backups da versão 1 e da 2: no modo **substituir**, aplica o `config.tema` do arquivo se ele for válido; no modo **mesclar**, preserva o tema atual.

## Sincronização

O problema da versão 1: cada gravação mandava a base inteira, e o servidor regravava todas as abas. Um aparelho com dados velhos (um celular aberto desde ontem) apagava o que o outro tinha lançado.

Na versão 2:

1. **Operações, não a base.** Cada ação vira uma operação pequena:
   `{t:'lanc', l:{…}}`, `{t:'lanc-', id}`, `{t:'cat', c:{…}}`, `{t:'cat-', id}`, `{t:'orc', ano, categoriaId, mes, valor}`, `{t:'cfg', k, v}` e `{t:'importar', dados, modo, confirmado:true}`.
2. **O servidor aplica sobre o que está na planilha agora.** `sincronizar(revisao, ops)`, dentro de uma trava, lê as abas, aplica cada operação pelo `id`, grava só as abas que mudaram e aumenta a `revisao`.
3. **Realinhamento.** Se a revisão do aparelho estava velha, ou se alguma operação foi recusada, a resposta traz a base completa. O app reaplica por cima dela o que ainda não tinha enviado.
4. **Fila local.** As operações ficam numa fila guardada no aparelho até o servidor confirmar. Sem conexão, o app tenta de novo (2 s, 5 s, 10 s, 30 s, 60 s). Ao reabrir, reaplica e reenvia o que ficou.
5. **Novidades.** Ao voltar para a aba, e a cada 3 minutos, o app consulta `estado()` (só a revisão) e recarrega se mudou. Editar a planilha à mão aumenta a revisão pelo gatilho `onEdit`.
6. **Recusa sem perda.** Uma operação inválida é recusada sozinha. As outras do lote seguem, e o app avisa.

A gravação de cada aba é uma escrita única. As linhas que sobram são limpas depois, então a aba nunca fica vazia no meio de uma gravação.

## Atualização e canal de versões

O app não pede permissão nova para saber se há versão nova:

1. **`versao.json`** na raiz é gerado por `node testes/gerar-versao.mjs` a partir de `package.json`, da seção da versão no `CHANGELOG.md` e dos bytes/SHA-256 de cada arquivo de `src/`. O `ref` é a tag (`v2.7.0`).
2. **Verificação no navegador:** `verificarAtualizacao()` lê `raw.githubusercontent.com/.../main/versao.json` (alternativa `cdn.jsdelivr.net`) uma vez por dia, com tempo limite de 8 s e `cache: 'no-store'`. O resultado fica em `localStorage` por 24 h; o interruptor `atualizacao-auto` desliga. Qualquer falha vira o estado `erro`, sem exceção e sem aviso intrusivo.
3. **Atualizar agora:** `urlInstalador()` monta o link do instalador com `?script=<scriptId>&implantacao=<id>`, só IDs, tirados de `scriptId` e `urlApp`. Sem `scriptId` (a prévia local, por exemplo), o botão não aparece e fica só o passo a passo.
4. **Atualizar à mão (folha guiada):** ao abrir a folha, o app busca o `versao.json` da própria tag, valida `app`, `versao`, `ref`, caminhos `src/…` e SHA-256, baixa cada arquivo e confere o hash com `crypto.subtle` antes de copiar. A pessoa cola no editor e publica uma **Nova versão** na implantação existente; os dados não mudam. O servidor só acrescenta `scriptId` e `urlApp` em `paraCliente_()`, obtidos por `ScriptApp` (funciona com `spreadsheets.currentonly`). O app lê só o `versao.json`; o `CHANGELOG.md` entra apenas como link.
5. **Publicação:** o workflow `.github/workflows/publicar-versao.yml` roda `npm test` e, se a versão for nova na `main`, cria a tag `vX.Y.Z` e o Release com as notas do changelog. O instalador e o app leem os arquivos **da tag**, nunca de um estado intermediário.

O canal é público e de leitura: o GitHub vê o IP de quem consulta, mas nenhum dado da planilha é enviado. Veja [SEGURANCA.md](SEGURANCA.md).

## Instalador

A pasta [`instalador/`](../instalador) é um projeto Apps Script **separado**, opcional:

- Roda como a pessoa que abre (`executeAs: USER_ACCESSING`, `access: ANYONE`) e usa a API do Apps Script com o token dela (`ScriptApp.getOAuthToken()`).
- Escopos mínimos: `script.projects`, `script.deployments`, `script.external_request` e `drive.file`. Não usa `SpreadsheetApp`, `DriveApp` nem `Session`.
- **Preparo:** `exigirPreparo_()` roda antes de criar ou alterar qualquer coisa. A autorização granular é conferida com `ScriptApp.getAuthorizationInfo` (a tela do Google vem com as caixas desmarcadas). A chave da API é testada por uma sonda: `apiLigada_()` consulta o próprio ID do instalador (`projects/<ScriptApp.getScriptId()>`); só o 403 que aponta para `usersettings` conta como API desligada.
- **Instalar:** baixa a versão da tag e confere os SHA-256 antes de criar qualquer coisa; só então cria a planilha pela API do Drive (`files`), o projeto (`projects`), troca o conteúdo (`projects.updateContent`), cria a versão e a implantação de app da Web, e devolve os links. Se um passo falhar, a limpeza é um `PATCH files/<id>` com `{trashed: true}` na planilha criada.
- **Atualizar:** confere se o projeto é o Finanças (marca `bsdesenv-financas` e `VERSAO_APP`, em `Codigo` ou `Código`), guarda uma versão de segurança, mantém arquivos extras da pessoa, troca o conteúdo e atualiza só as implantações de app da Web (a pedida ou todas), sem mudar o endereço. Se a versão publicada não for maior, devolve `jaAtual` sem escrever.
- **Cloud:** o instalador vive num projeto Google Cloud próprio da bsdesenv, com a API do Apps Script e a do Drive ligadas. Quem instala precisa ligar uma vez a chave da API em `script.google.com/home/usersettings`.
- **`REF_TESTE`:** propriedade de script que só o dono do instalador define. Troca apenas a ref (tag ou branch) de onde vêm os arquivos; a conferência de SHA-256 continua valendo.

## Categoria Guardar

A categoria de economia é a que tem `id === 'guardar'` ou, se ela não existir, a primeira categoria que não é de renda cujo nome normalizado começa por "guardar" (por exemplo, "Guardar" ou "Guardar / Investir"). A função `catGuardar()` centraliza essa busca.

- É criada com `{ id: 'guardar', nome: 'Guardar', grupo: 'fixo', ordem: menor ordem dos fixos − 1 }` pelos modelos de primeiro acesso e pelas ações que precisam dela (`criar-guardar` e `meta-sugestao`, quando ainda não existe).
- O **plano** mensal dela é a meta de economia; o **lançamento** nela é a transferência feita.
- Fica fora da barra de gastos, dos avisos de "passou do plano" e de "Sem plano". Entra no total de saídas, na sobra e no disponível.
- O cartão "A vencer" não a mostra; a transferência é confirmada no cartão "Meta de economia".
- `sugestaoMeta()` devolve `{ valor, meses }` a partir da média de `rendaReal − gastoConsumoReal` dos últimos 3 meses fechados que tenham lançamentos. O valor é 80% dessa média, arredondado para baixo em múltiplos de 10 quando for pelo menos 100; se a média for menor ou igual a zero, o valor é 0. A sugestão só vira plano quando a pessoa usa o botão da sugestão ou grava o campo.

## Lançamento rápido

No computador, a barra do topo é um campo de lançamento rápido de gasto. `lancarRapido()` usa `interpretarLinha()` — o mesmo interpretador do campo de valor do formulário completo — para separar valor, categoria e descrição; grava com a data de hoje e mostra o aviso com **Desfazer**. Se a categoria não for reconhecida, abre o formulário completo com o texto (`abrirNovo({ texto })`), sem gravar nada.

O atalho `N` foca esse campo no computador; no celular, como o campo não existe, abre o formulário completo. **Novo lançamento** e `Ctrl+K` sempre abrem o formulário completo. Na tela Início, o cartão **Variáveis do mês** resume **Gasto**, **Plano** e **Ainda previsto** apenas das categorias variáveis e desenha **“Para onde foi”** com as 5 maiores categorias variáveis do mês + **Demais**. São agregações de exibição: a regra de cálculo da v2.2.0 (abaixo) não mudou.

## Camada visual do Início

O topo do Início é só exibição. `cartaoHeroi()` desenha o anel de composição a partir de `gastoReal`, `previsto` e `disponivel` (e a linha-ponte Renda/Ainda na conta); no celular, o CSS troca o anel por uma barra compacta com as mesmas partes; `cartaoKpis()` desenha os micrográficos — sparkline da renda dos últimos 6 meses, barras por dia do mês a partir dos lançamentos, lista das 3 maiores categorias sem lançamento e anel da meta de Guardar. O cálculo continua sendo o de `resumo(ano, mes)`, sem fórmula nova: vale a regra da v2.2.0 descrita abaixo.

## Regras de cálculo

Para uma categoria num mês:

| Situação | Valor (qualquer mês: passado, corrente ou futuro) |
|---|---|
| teve lançamento | a soma do lançado |
| sem lançamento, com plano | o plano, marcado como "previsto" |
| sem lançamento, sem plano | zero |

É a regra da versão 1. Nada é estimado por conta própria: a média dos 3 meses anteriores só aparece como sugestão ao lado do campo, com o botão "Usar sugestão", e só vira plano quando a pessoa grava (ou usa "Preencher com as médias"). O campo vazio não usa a média. Assim, apagar um lançamento ou um plano muda o total na hora.

Três noções atravessam o app:

- **realizado:** o que foi lançado;
- **previsto:** o plano de uma categoria que ainda não teve lançamento (entra na projeção, não no realizado);
- **projetado:** uma conta que mistura realizado e plano, como a sobra do mês.

Campos de `resumo(ano, mes)`:

| Campo | Como é calculado |
|---|---|
| `rendaReal` | soma dos lançamentos das categorias de renda |
| `rendaPlano` | soma dos planos das categorias de renda |
| `renda` | soma, nas categorias de renda, do valor por categoria: o lançado; sem lançamento, o plano |
| `gastosConsumo` | valor por categoria das categorias de consumo (exclui Guardar) |
| `gastoConsumoReal` | lançado nas categorias de consumo (exclui Guardar) |
| `gastos` | todas as saídas, incluindo Guardar |
| `gastoReal` | lançado em todas as saídas, incluindo Guardar |
| `guardadoPlano` | plano de Guardar (a meta do mês) |
| `guardadoReal` | lançado em Guardar (a transferência feita) |
| `previsto` | `gastos − gastoReal`: o plano das categorias sem lançamento |
| `aindaNaConta` | `renda − gastoReal`: o dinheiro que já entrou menos o que já saiu |
| `disponivel` | `renda − gastos` = `sobra` = `aindaNaConta − previsto` |
| `porDia` | `disponivel / dias restantes` no mês atual; 0 nos demais |
| `sobra` | `renda − gastos` (regra da v1; inclui Guardar) |
| `sobraReal` | `rendaReal − gastoReal` (realizado) |
| `planoGastos` e `gastoComPlano` | só categorias de consumo; alimentam a barra do plano |
| `semPlano` e `semPlanoQtd` | só consumo, sem plano |
| `qtdGastos` e `qtdConsumo` | quantidade de lançamentos de saída e de consumo |
| `aVencer` | fixos com plano e sem lançamento, para o cartão "A vencer"; o cartão exclui Guardar |

`previsto` é a diferença agregada entre `gastos` e `gastoReal`: o plano das categorias que ainda não tiveram lançamento. O plano de uma categoria que já teve lançamento não entra em `gastos` (vale o realizado) e não desconta o disponível; ele só alimenta a barra de ritmo.

`disponivel` é igual a `sobra`: a regra é a da v1, lançado; sem lançamento, o plano. O plano de uma categoria com lançamento não conta no disponível; só o realizado. A barra do ritmo ainda mostra o plano de todas as categorias de consumo, mas ele é só uma referência de ritmo, não uma reserva.

- **Mês fechado:** `sobraReal` é o realizado. `sobra` continua sendo o valor por categoria (o plano quando não há lançamento). Nas telas de mês passado, o app usa `sobraReal` quando há renda/lançamento real e rotula "realizada"; sem dados reais, usa `sobra` e rotula "com valores previstos".
- **Herói:** mostra `renda − gastoReal = aindaNaConta` e `aindaNaConta − previsto = disponivel`. O link **Ver composição** abre a folha com a mesma conta, as categorias sem lançamento, o plano restante nas categorias com lançamento e as categorias acima do plano.
- **Ritmo do plano:** cartão separado; usa `planoGastos` e `gastoComPlano` (só consumo, sem Guardar). Fica `acima` quando o gasto passa o plano; `atencao` quando `planoGastos > 0` e o gasto passa mais de 12 pontos percentuais do ritmo do mês; senão `ok`. Guardar não entra. O plano aqui é só ritmo: não desconta o disponível.
- **Ritmo:** a marca nas barras é o dia de hoje sobre os dias do mês. Uma categoria variável fica "acima do ritmo" quando já usou mais de 12 pontos percentuais além dele. Guardar é sempre `ok`: guardar mais do que a meta é bom.
- **Mapa de calor:** cada mês fechado é comparado com a média dos meses fechados da própria categoria no ano (a partir de 3 meses). Acima de 15% fica laranja; abaixo de −15%, azul.

## Segurança

- `@OnlyCurrentDoc`: o script só enxerga a planilha onde está instalado.
- Sem `ALLOWALL`: outros sites não conseguem embutir o app.
- Validação no servidor: ids no padrão `[A-Za-z0-9_-]`, mês 1–12, dia válido para o mês (`diasNoMes_()` recusa 31/02, por exemplo), valor finito e diferente de zero, categoria existente, lote de até 500 operações.
- Texto que começa com `=`, `+`, `-` ou `@` recebe um apóstrofo antes de ir para a planilha, para não virar fórmula.
- No navegador, todo texto vindo dos dados é escapado antes de entrar no HTML.
- A consulta de versão é feita pelo navegador (leitura pública, sem dados da planilha); o GitHub vê o IP. O instalador é opcional e tem escopos próprios, descritos em [SEGURANCA.md](SEGURANCA.md).

## Testes

- `testes/gas-mock.mjs` imita `SpreadsheetApp`, `LockService` e `HtmlService`, inclusive o que a planilha faz com texto que parece número ou fórmula. O `Codigo.gs` de verdade roda dentro do Node.
- `testes/servidor.test.mjs` cobre leitura do formato da v1, operações, dois aparelhos, recusas, fórmulas, importação (inclusive o tema), data inválida, `onEdit` e a página.
- `testes/e2e.mjs` abre o app de verdade num Chrome sem janela, ligado ao servidor de verdade. A data é fixa (18/11/2026) para os testes não dependerem do dia. Cobre lançar, editar, apagar e desfazer, dois aparelhos, queda de conexão com recarga, plano, planilha, primeiro acesso, disponível para gastar, meta de economia, cobertura do plano, foco do teclado, transbordo no celular e o aviso de versão nova com a folha de atualização assistida (GitHub simulado).
- `testes/versao.test.mjs` confere o `versao.json` contra o `package.json`, o `VERSAO_APP`, o changelog e os hashes dos arquivos.
- `testes/instalador.test.mjs` roda o `instalador/Codigo.gs` num `vm` com as APIs do Google e do GitHub simuladas: canal, hashes, instalação e atualização (cópia de segurança, arquivo `Código` removido, extras mantidos, só a implantação pedida).
- `npm run versao -- --conferir` falha se o `versao.json` estiver desatualizado; o workflow de publicação roda os testes antes de criar a tag.
