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
- Fica fora da barra de gastos, dos avisos de "passou do plano" e de "Sem plano". O que foi guardado entra em "já saiu"; o que falta para a meta entra em "falta guardar", que o disponível desconta. Um resgate (lançamento negativo) não aumenta o que falta guardar.
- O cartão "Contas a pagar" não a mostra; a transferência é confirmada no cartão "Meta de economia".
- `sugestaoMeta()` devolve `{ valor, meses }` a partir da média de `rendaReal − gastoConsumoReal` dos últimos 3 meses fechados que tenham lançamentos. O valor é 80% dessa média, arredondado para baixo em múltiplos de 10 quando for pelo menos 100; se a média for menor ou igual a zero, o valor é 0. A sugestão só vira plano quando a pessoa usa o botão da sugestão ou grava o campo.

## Lançamento rápido

No computador, a barra do topo é um campo de lançamento rápido de gasto. `lancarRapido()` usa `interpretarLinha()` — o mesmo interpretador do campo de valor do formulário completo — para separar valor, categoria e descrição; grava no mês em exibição (no mês atual, com a data de hoje; em outro mês, sem dia, e o aviso diz o mês) e mostra o aviso com **Desfazer**. Um valor muito acima do habitual abre o formulário completo, que pede confirmação. Se a categoria não for reconhecida, abre o formulário completo com o texto (`abrirNovo({ texto })`), sem gravar nada.

O atalho `N` foca esse campo no computador; no celular, como o campo não existe, abre o formulário completo. **Novo lançamento** e `Ctrl+K` sempre abrem o formulário completo. Na tela Início, o cartão **Variáveis do mês** resume **Gasto**, **Plano** e **Ainda nos planos** apenas das categorias variáveis e desenha **“Para onde foi”** com as 5 maiores categorias variáveis do mês + **Demais**. São agregações de exibição da regra descrita em "Regras de cálculo".

## Camada visual do Início

O topo do Início é só exibição. `cartaoHeroi()` desenha o anel de composição a partir de `jaSaiu`, `reservado` e `disponivel`, e a composição linha a linha (renda − já saiu − contas a pagar − falta guardar − ainda nos planos); no celular, o CSS troca o anel por uma barra compacta com as mesmas partes. `cartaoKpis()` desenha os micrográficos: sparkline da renda dos últimos 6 meses, barras por dia do mês, as 3 maiores reservas do mês e o anel da meta de Guardar. Para quem já usava o app, o herói mostra uma vez o aviso "As contas do mês mudaram na versão 2.8.0", com o disponível pela regra antiga e pela nova (`legado.disponivel`). O cálculo é o de `resumo(ano, mes)`, descrito abaixo.

## Regras de cálculo

Desde a 2.8.0, as contas de um mês ficam em `contasDoMes()`, na seção 1 de `src/App.html`, entre os marcadores `<dominio>` e `</dominio>`: funções puras, sem DOM nem estado, testadas no Node por `testes/dominio.test.mjs`. `resumo(ano, mes)` só junta os dados do app e guarda o resultado até a próxima alteração ou a virada do dia. Os valores são somados em centavos inteiros e convertidos para reais no fim.

Para uma categoria num mês:

- **lançado** (`real`): a soma dos lançamentos, sempre no valor exato;
- **plano**: o valor gravado em `orcamento` para o mês;
- **falta**: o que ainda falta do plano, `max(0, plano − lançado)`, enquanto houver plano e a categoria não tiver sido **encerrada** no mês. Em Guardar, `max(0, meta − max(0, guardado))`.

Campos de `resumo(ano, mes)`:

| Campo | Como é calculado |
|---|---|
| `recebida` | lançado nas categorias de renda |
| `aReceber` | falta das categorias de renda |
| `renda` | `recebida + aReceber` |
| `jaSaiu` | lançado em todas as saídas, inclusive Guardar |
| `contasAPagar` | falta dos fixos, exceto Guardar |
| `faltaGuardar` | falta de Guardar, em qualquer grupo de saída |
| `nosPlanos` | falta dos variáveis, exceto Guardar |
| `reservado` | `contasAPagar + faltaGuardar + nosPlanos` |
| `disponivel` | `renda − jaSaiu − reservado` |
| `saidasPrevistas` | `jaSaiu + reservado` |
| `sobraRealizada` | `recebida − jaSaiu` |
| `porDia` | `disponivel / dias restantes`, em reais inteiros, no mês atual; 0 nos demais |
| `pendencias` | num mês passado: o que falta dos fixos, de Guardar e da renda, e os planos de variáveis sem nenhum lançamento |
| `legado.disponivel` | a regra até a 2.7 (o lançado substitui o plano no primeiro lançamento), só para o aviso "O que mudou" |
| `planoGastos`, `gastoComPlano`, `semPlano`, `semPlanoQtd` | só categorias de consumo (sem Guardar); alimentam o Ritmo do plano e a Cobertura do plano |
| `porCat` | por categoria: `real`, `plano`, `falta`, `encerrada`, `qtd`, `tipo` e `valor` (o lançado ou, sem lançamento, o plano, usado nas células da planilha) |

Consequências, cobertas pelos testes de domínio:

- gastar dentro do plano não muda o disponível (sai de "ainda nos planos"); gastar sem plano ou além do plano reduz na mesma medida;
- o primeiro lançamento abaixo do plano não aumenta o disponível;
- receber parte de uma renda prevista não muda o disponível: o resto fica "a receber";
- estorno numa categoria com plano volta para o plano; sem plano, aumenta o disponível;
- nenhum gasto positivo numa saída aumenta o disponível (teste de propriedade).

**Encerrar no mês.** "Quitar" (conta fixa paga em parte), "Encerrar no mês" (variável) e "Não vem mais" (renda) gravam na aba `config` a marca `encerrada:AAAA-MM:<categoriaId>` com valor `1`. A falta daquela categoria naquele mês vira zero; o plano continua gravado. "Reabrir no mês" apaga a marca. O servidor valida a chave em `salvarCfg_` e devolve as marcas em `carregar()` (campo `marcas`); o backup as leva em `config.marcas` (formato 3). Versões anteriores preservam essas chaves ao regravar a `config`.

**Por fase do mês:**

- **mês atual:** o herói mostra `disponivel` ("Disponível para gastar") e a composição renda − já saiu − contas a pagar − falta guardar − ainda nos planos;
- **mês passado:** `sobraRealizada` ("Sobra realizada"), com as pendências à parte;
- **mês futuro:** a mesma fórmula do disponível, com o nome "Sobra prevista".

A Planilha usa a mesma regra no rodapé (meses fechados: só o lançado; mês atual e futuros: com o que falta dos planos). O gráfico "Sobra mês a mês" mostra a sobra realizada dos meses fechados, a partir do primeiro mês com lançamentos, e o mês atual e os futuros em contorno; a média, o melhor e o pior mês usam só os meses fechados.

**Médias e sugestões.** `media3()`, por `mediaRealizada()`, é a média do lançado nos 3 meses fechados antes do mês planejado: sem o mês corrente e sem planos; mês sem lançamento conta zero, a partir do primeiro mês com dados. Ela alimenta "Usar sugestão", "Preencher com as médias", "Planejar agora", as projeções dos avisos e a confirmação de valor fora do normal.

**Valor digitado.** Um único leitor (`paraNumero` e `paraNumeros`) para todos os campos: aceita "1200", "1.200", "12,00", "R$ 89,90" e o sinal "−" que o app mostra; vários valores separados por espaço ou "+"; só o asterisco multiplica ("36*4"), e "1200x10" é recusado com uma dica. O teclado numérico do celular é o único lugar em que os dígitos entram nos centavos. O tipo **Estorno** grava o valor negativo numa categoria de gasto. Valor muito acima do habitual (mais de 10× a média de 3 meses da categoria e acima de R$ 5.000; sem histórico, acima de R$ 100.000) pede uma segunda confirmação.

- **Ritmo do plano:** cartão separado; usa `planoGastos` e `gastoComPlano` (só consumo, sem Guardar). Fica `acima` quando o gasto passa o plano; `atencao` quando `planoGastos > 0` e o gasto passa mais de 12 pontos percentuais do ritmo do mês; senão `ok`. Guardar não entra. A barra é só ritmo; a reserva do que falta de cada plano está no disponível.
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
- `testes/servidor.test.mjs` cobre leitura do formato da v1, operações, dois aparelhos, recusas, fórmulas, importação (inclusive o tema e as marcas), data inválida, `onEdit` a página, as marcas `encerrada:` na `config` e a compatibilidade com o `Codigo.gs` da versão anterior.
- `testes/dominio.test.mjs` roda a seção 1 de `src/App.html` (entre os marcadores `<dominio>`) num `vm`: as regras do disponível, de renda, Guardar, estornos e encerramento, a propriedade "nenhum gasto aumenta o disponível", centavos, pendências, o leitor de valores e a média das sugestões.
- `testes/e2e.mjs` abre o app de verdade num Chrome sem janela, ligado ao servidor de verdade. A data é fixa (18/11/2026) para os testes não dependerem do dia. Cobre lançar, editar, apagar e desfazer, dois aparelhos, queda de conexão com recarga, plano, planilha, primeiro acesso, disponível para gastar, meta de economia, cobertura do plano, foco do teclado, transbordo no celular e o aviso de versão nova com a folha de atualização assistida (GitHub simulado).
- `testes/versao.test.mjs` confere o `versao.json` contra o `package.json`, o `VERSAO_APP`, o changelog e os hashes dos arquivos.
- `testes/instalador.test.mjs` roda o `instalador/Codigo.gs` num `vm` com as APIs do Google e do GitHub simuladas: canal, hashes, instalação e atualização (cópia de segurança, arquivo `Código` removido, extras mantidos, só a implantação pedida).
- `npm run versao -- --conferir` falha se o `versao.json` estiver desatualizado; o workflow de publicação roda os testes antes de criar a tag.
