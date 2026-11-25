<!-- cobre: src/Codigo.gs, src/App.html, src/Index.html, src/Estilos.html -->
# Arquitetura

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/Codigo.gs` | Servidor (Apps Script): serve a página, lê e grava as abas, aplica operações |
| `src/Index.html` | Esqueleto da página; junta `Estilos` e `App` com `incluir()` |
| `src/Estilos.html` | Visual: tokens de cor (claro e escuro), layout de celular e de computador, fonte DM Sans embutida |
| `docs/fontes/DM-Sans-OFL.txt` | Licença SIL OFL 1.1 da DM Sans, embutida no `Estilos.html` |
| `src/App.html` | O app no navegador: estado, sincronização, cálculos, telas |
| `src/appsscript.json` | Manifesto: fuso, permissão mínima e configuração do app da Web |
| `versao.json` | Canal de versões lido pelo app: versão, tag, novidades e SHA-256 dos arquivos |
| `instalador/` | Projeto Apps Script separado que instala e atualiza o Finanças no Drive de quem usa |

## Dados

A planilha é a fonte da verdade. São cinco abas: as quatro da versão 1, no mesmo formato, e a `recorrencias`, opcional, que só nasce na primeira gravação (3.1.0):

```
lancamentos  id | ano | mes | dia | categoriaId | descricao | valor
categorias   id | nome | grupo (fixo|variavel|renda) | ordem
orcamento    ano | categoriaId | mes | valor              ← o "plano"
config       chave | valor   (nome, tema, revisao, atualizadoEm…)
recorrencias id | categoriaId | descricao | valor | dia | inicio | fim | ativa | automatico   ← opcional
```

`inicio` e `fim` são números aaaamm (202611), porque o texto "2026-11" viraria data no Sheets; `fim` e `dia` podem ficar vazios; `ativa` e `automatico` são 1 ou 0. Uma planilha sem a aba abre sem criá-la: `linhasOpcionais_()` lê com `getSheetByName`, e `gravarModelo_()` só cria a aba quando `m.sujo.recorrencias`. Está no mapa `CABECALHOS`, então editar a aba à mão também sobe a revisão (`onEdit`).

Chaves da `config` além das básicas, todas preservadas pelas versões anteriores: `categoriaGuardar` (2.8.1), `encerrada:AAAA-MM:<categoriaId>` (2.8.0), `fechado:AAAA-MM` (3.0.0), `pular:AAAA-MM:<recId>` e `categoriaSobra` (3.1.0).

O app recebe tudo agrupado por ano:

```js
{ revisao, nome, tema, planilha: { id, nome, url },
  categorias: [{ id, nome, grupo, ordem }],
  recorrencias: [{ id, categoriaId, descricao, valor, dia, inicio, fim, ativa, automatico }],
  marcas, fechados, categoriaGuardar, categoriaSobra,
  anos: { "2026": { lancamentos: [{ id, mes, dia, categoriaId, descricao, valor }],
                    orcamento: { mercado: { "11": 1200 } } } } }
```

O backup em JSON (Ajustes › Baixar backup, `exportarJSON()`) usa esse mesmo formato, versão 3, com `config: { tema, marcas, fechados, categoriaGuardar, categoriaSobra }` e `recorrencias` na raiz. O app guarda a data do último backup só no aparelho (`localStorage`, `ultimo-backup`). A importação aceita backups dos formatos 1, 2 e 3: no modo **substituir**, aplica o `config.tema` do arquivo se ele for válido e troca as recorrências e as marcas `pular:`; no modo **mesclar**, preserva o tema atual, insere ou substitui as recorrências pelo `id` e aceita `pular:` cuja recorrência exista. `categoriaSobra` segue a regra de `categoriaGuardar`, mas exige uma categoria de renda. Uma versão anterior à 3.1.0 que importe um backup 3 ignora o que não conhece, sem aviso: recorrências, marcas `pular:` e `categoriaSobra` se perdem.

**Prévia e resumo.** Antes de gravar, o navegador mostra quantas categorias e lançamentos entram e o que fica de fora, com o motivo (até 5). A prévia (`previaImportacao()`, que também conta as recorrências) segue as mesmas regras do servidor. No modo substituir, o botão só libera depois de digitar SUBSTITUIR, e a folha oferece baixar um backup antes. O servidor aplica o `importar` em `importar_()`, que devolve `{ categorias: {aceitas, ignoradas}, lancamentos: {aceitos, ignorados}, planos: {aceitos, ignorados}, recorrencias: {aceitas, ignoradas}, motivos }`, com até 5 motivos. Em `sincronizar`, esse resumo vem no campo `importacao`.

## Sincronização

O problema da versão 1: cada gravação mandava a base inteira, e o servidor regravava todas as abas. Um aparelho com dados velhos (um celular aberto desde ontem) apagava o que o outro tinha lançado.

Na versão 2:

1. **Operações, não a base.** Cada ação vira uma operação pequena:
   `{t:'lanc', l:{…}}`, `{t:'lanc-', id}`, `{t:'cat', c:{…}}`, `{t:'cat-', id}`, `{t:'orc', ano, categoriaId, mes, valor}`, `{t:'rec', r:{…}}` (insere ou substitui pelo `id`), `{t:'rec-', id}` (apaga a recorrência e as marcas `pular:` dela), `{t:'cfg', k, v}` e `{t:'importar', dados, modo, confirmado:true}`.
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

A categoria de economia é a que `catGuardar()` devolve. A função centraliza a busca, nesta ordem: primeiro a categoria indicada em `config.categoriaGuardar`, se existir e não for de renda; depois a que tem `id === 'guardar'`; por último, a primeira categoria que não é de renda cujo nome normalizado começa por "guardar" (por exemplo, "Guardar" ou "Guardar / Investir").

- É criada com `{ id: 'guardar', nome: 'Guardar', grupo: 'fixo', ordem: menor ordem dos fixos − 1 }` pelos modelos de primeiro acesso e pelas ações que precisam dela (`criar-guardar` e `meta-sugestao`, quando ainda não existe).
- O **plano** mensal dela é a meta de economia; o **lançamento** nela é a transferência feita.
- Fica fora da barra de gastos, dos avisos de "passou do plano" e de "Sem plano". O que foi guardado entra em "já saiu"; o que falta para a meta entra em "falta guardar", que o disponível desconta. Um resgate (lançamento negativo) não aumenta o que falta guardar.
- O bloco "Contas" de "O que falta pagar" não a mostra. Ela tem bloco próprio, "Guardar", com o botão que lança a transferência; a meta fica em "Plano do mês".
- A chave `categoriaGuardar` da aba `config` guarda o id dela. `fixarGuardar()` grava a chave uma vez, ao abrir, se ainda não existir; por isso renomear não a perde. `salvarCfg_` valida a chave: a categoria precisa existir e não pode ser de renda.
- `salvarCat_` recusa virar renda para a categoria de economia. `apagarCat_` recusa apagá-la, e o botão de apagar fica desabilitado em Ajustes (`ehGuardar`).
- `importar_` leva `config.categoriaGuardar` do backup, se a categoria existir e não for de renda. No modo mesclar, só quando ainda não há uma escolhida.
- `sugestaoMeta()` devolve `{ valor, meses }` a partir da média de `rendaReal − gastoConsumoReal` dos últimos 3 meses fechados que tenham lançamentos. O valor é 80% dessa média, arredondado para baixo em múltiplos de 10 quando for pelo menos 100; se a média for menor ou igual a zero, o valor é 0. A sugestão só vira plano quando a pessoa usa o botão da sugestão ou grava o campo.

## Lançamento rápido

No computador, a barra do topo é um campo de lançamento rápido de gasto. `lancarRapido()` usa `interpretarLinha()` — o mesmo interpretador do campo de valor do formulário completo — para separar valor, categoria e descrição; grava no mês em exibição (no mês atual, com a data de hoje; em outro mês, sem dia, e o aviso diz o mês) e mostra o aviso com **Desfazer**. Um valor muito acima do habitual abre o formulário completo, que pede confirmação. Se a categoria não for reconhecida, abre o formulário completo com o texto (`abrirNovo({ texto })`), sem gravar nada.

O atalho `N` foca esse campo no computador; no celular, como o campo não existe, abre o formulário completo. **Novo lançamento** e `Ctrl+K` sempre abrem o formulário completo. Na tela Início, o bloco **Plano do mês** mostra as categorias variáveis, e **Onde foi** desenha as 6 maiores saídas do mês + **Demais categorias**. São agregações de exibição da regra descrita em "Regras de cálculo".

## Avisos e Desfazer

`aviso(msg, { acao, fn, tipo, tempo })` mostra um aviso por vez, no contêiner `#avisos`. Quando `acao` é `'Desfazer'` e há `fn`, o item entra na pilha `desfazeres`, com no máximo 10 itens. Um aviso novo não remove os itens da pilha. `Ctrl+Z`, fora de um campo de texto, chama `desfazerUltimo()`, que desfaz o item mais recente ainda não desfeito.

- O aviso com Desfazer dura 10 s. O temporizador para com `mouseenter` ou `focusin` e recomeça ao sair do aviso.
- Com uma folha aberta, o aviso sai no topo (celular) ou à esquerda do painel (computador), para não cobrir o Salvar nem o teclado.
- Com uma folha aberta, o resto da tela fica inerte (`inert` no `#app`). Problemas de sincronização (sem conexão, alterações guardadas no aparelho) e a volta ao normal são anunciados na região `#sinc-anuncio`, e não cada "Salvando…".

## Camada visual do Início

`telaInicio()` monta o Início pela fase do mês (`resumo(ano, mes).fase`). Cada bloco é uma função que devolve HTML a partir de `resumo()`. Os blocos, em ordem:

| Fase | Blocos |
|---|---|
| `atual` | `cartaoHeroi` · `cartaoPagar` · `cartaoPlanoMes` · `cartaoOndeFoi` · `cartaoUltimos` |
| `passado` | `cartaoHeroi` (sobra realizada e fechamento) · `cartaoOndeFoi` · `cartaoUltimos` |
| `futuro` | `cartaoHeroi` · `cartaoCategorias` · `cartaoUltimos` |

Depois dos blocos vem o link `Ver <ano> na Planilha`. Sem plano, renda nem saída prevista no mês atual, `cartaoPagar` não aparece e o herói mostra o estado vazio.

- `cartaoHeroi(r)`: o disponível, com o anel e a barra de composição, desenhados a partir de `jaSaiu`, `reservado` e `disponivel`. No CSS do celular, o anel vira uma barra compacta com as mesmas partes. No mês atual, traz `notaFechamentoAnterior()` (o aviso de pendências do mês anterior) e `avisoMudanca()`, o aviso único da 2.8.0, que usa `legado.disponivel` e fica guardado em `localStorage`. Desde a 3.0.0, ele só aparece quando o cache local do aparelho era de uma versão anterior à 2.8.0 (`aviso-2.8.0-mostrar`, gravado em `iniciar()`): quem instala depois nunca conheceu a regra antiga. No mês passado, mostra a sobra realizada e o chip "Mês fechado", a partir de `fechamentoDe()`.
- `cartaoPagar(r)`: "O que falta pagar", com três grupos de `porCat`. **Contas** são as saídas `fixo` que não são Guardar (ações `confirmar` e `encerrar`, com os rótulos Confirmar e Quitar). **Guardar** é a categoria de `catGuardar()` (ação `confirmar`, rótulo Guardar). **A receber** são as rendas com falta (rótulos Recebi e Não vem). O total do título é `contasAPagar + faltaGuardar`.
- `cartaoPlanoMes(r)`: o ritmo do consumo (`planoGastos`, `gastoComPlano`, `ritmo` e a situação de `estadoCategoria`); a meta de Guardar (`planoExp`, `celReal`, `sugestaoMeta()`) com o campo `data-mudar="plano"`; as categorias variáveis (`linhaCat`); a cobertura (`semPlano`, `semPlanoQtd`) e `blocoAvisos(r)`, alimentado por `calcularAvisos(r)`.
- `cartaoOndeFoi(r)`: as 6 maiores saídas, sem Guardar, e "Demais categorias", em barras com nome, valor e percentual, sem depender de cor. No mês passado, o título é "Para onde foi o dinheiro".
- `cartaoCategorias(r)`: só nos meses futuros, com o plano de cada categoria.
- `cartaoUltimos()`: os 6 lançamentos mais recentes do mês.
- `cartaoAno()`: o gráfico "Sobra mês a mês" fica no topo da Planilha (`telaPlanilha()`), não mais no Início. Usa a sobra realizada dos meses passados e o disponível dos demais.

Os números de todos os blocos vêm de `resumo(ano, mes)`, descrito em "Regras de cálculo".

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
| `planoGastos`, `gastoComPlano`, `semPlano`, `semPlanoQtd` | só categorias de consumo (sem Guardar); alimentam o ritmo e o "Sem plano" do bloco Plano do mês |
| `porCat` | por categoria: `real`, `plano`, `falta`, `encerrada`, `qtd`, `tipo` e `valor` (o lançado ou, sem lançamento, o plano, usado nas células da planilha) |

Consequências, cobertas pelos testes de domínio:

- gastar dentro do plano não muda o disponível (sai de "ainda nos planos"); gastar sem plano ou além do plano reduz na mesma medida;
- o primeiro lançamento abaixo do plano não aumenta o disponível;
- receber parte de uma renda prevista não muda o disponível: o resto fica "a receber";
- estorno numa categoria com plano volta para o plano; sem plano, aumenta o disponível;
- nenhum gasto positivo numa saída aumenta o disponível (teste de propriedade).

**Encerrar no mês.** "Quitar" (conta fixa paga em parte), "Encerrar no mês" (variável) e "Não vem mais" (renda) gravam na aba `config` a marca `encerrada:AAAA-MM:<categoriaId>` com valor `1`. A falta daquela categoria naquele mês vira zero; o plano continua gravado. "Reabrir no mês" apaga a marca. O servidor valida a chave em `salvarCfg_` e devolve as marcas em `carregar()` (campo `marcas`); o backup as leva em `config.marcas` (formato 3). Versões anteriores preservam essas chaves ao regravar a `config`. A marca `pular:AAAA-MM:<recId>` (3.1.0) segue o mesmo tratamento: `salvarCfg_` valida a chave (`RE_PULAR`) e exige que a recorrência exista, e `carregar()` a devolve no mesmo campo `marcas`.

**Por fase do mês:**

- **mês atual:** o herói mostra `disponivel` ("Disponível para gastar") e a composição renda − já saiu − contas a pagar − falta guardar − ainda nos planos;
- **mês passado:** `sobraRealizada` ("Sobra realizada"), com as pendências à parte;
- **mês futuro:** a mesma fórmula do disponível, com o nome "Sobra prevista".

A Planilha usa a mesma regra no rodapé (meses fechados: só o lançado; mês atual e futuros: com o que falta dos planos). O gráfico "Sobra mês a mês", no topo da Planilha (`cartaoAno()`), mostra a sobra realizada dos meses fechados, a partir do primeiro mês com lançamentos, e o mês atual e os futuros em contorno; a média, o melhor e o pior mês usam só os meses fechados.

**Médias e sugestões.** `media3()`, por `mediaRealizada()`, é a média do lançado nos 3 meses fechados antes do mês planejado: sem o mês corrente e sem planos; mês sem lançamento conta zero, a partir do primeiro mês com dados. Ela alimenta "Usar sugestão", "Preencher com as médias", "Planejar agora", as projeções dos avisos e a confirmação de valor fora do normal.

**Valor digitado.** Um único leitor (`paraNumero` e `paraNumeros`) para todos os campos: aceita "1200", "1.200", "12,00", "R$ 89,90" e o sinal "−" que o app mostra; vários valores separados por espaço ou "+"; só o asterisco multiplica ("36*4"), e "1200x10" é recusado com uma dica. O teclado numérico do celular é o único lugar em que os dígitos entram nos centavos. O tipo **Estorno** grava o valor negativo numa categoria de gasto. Valor muito acima do habitual (mais de 10× a média de 3 meses da categoria e acima de R$ 5.000; sem histórico, acima de R$ 100.000) pede uma segunda confirmação.

- **Ritmo do plano:** primeiro item do bloco Plano do mês (`cartaoPlanoMes`); usa `planoGastos` e `gastoComPlano` (só consumo, sem Guardar). Fica `acima` quando o gasto passa o plano; `atencao` quando `planoGastos > 0` e o gasto passa mais de 12 pontos percentuais do ritmo do mês; senão `ok`. Guardar não entra. A barra é só ritmo; a reserva do que falta de cada plano está no disponível.
- **Ritmo:** a marca nas barras é o dia de hoje sobre os dias do mês. Uma categoria variável fica "acima do ritmo" quando já usou mais de 12 pontos percentuais além dele. Guardar é sempre `ok`: guardar mais do que a meta é bom.
- **Mapa de calor:** cada mês fechado é comparado com a média dos meses fechados da própria categoria no ano (a partir de 3 meses). Acima de 15% fica laranja; abaixo de −15%, azul.

## Fechamento do mês

Um mês passado pode ser fechado. O fechamento é uma marca na aba `config`: a chave `fechado:AAAA-MM`, com a **sobra realizada** como valor (texto numérico, com até duas casas). Ela é uma operação `cfg` como as outras: entra na fila e vai ao servidor.

- **Servidor:** `salvarCfg_` valida a chave (`RE_FECHADO`, com ano entre 1900 e 2200) e o valor (`RE_VALOR_FECHADO`). Valor vazio apaga o fechamento. `fechados_(cfg)` devolve o mapa `{ 'AAAA-MM': valor }`, e `carregar()` o envia no campo `fechados` (via `paraCliente_`).
- **Navegador:** `aplicarOp` grava a chave `fechado:` em `d.fechados`. `fechamentoDe(ano, mes)` devolve a sobra guardada ou `null`, e `mesFechado()` diz se o mês está fechado.
- **Folha:** `abrirFechamento(ano, mes)` lista as pendências de `resumo().pendencias.itens`. Cada uma tem três ações: `feito` (lança o valor que falta, sem dia), `nao` (`encerrarCategoria`, que deixa de reservar o que faltava) e `depois` (só no estado da folha). O botão `fechar-mes` fica desabilitado enquanto há pendências. Quando não há nenhuma, grava `fechado:` com `sobraRealizada.toFixed(2)`. O aviso de fechamento oferece Desfazer, que volta ao valor anterior.
- **Mudança em mês fechado:** `pedirConfirmacaoFechado(meses, estado)` faz o primeiro toque avisar e pede o segundo. O `estado` guarda a chave dos meses já avisados. Vale para editar, apagar e lançar pela Planilha. Depois da mudança, `atualizarFechamento(ano, mes)` regrava a marca com a sobra nova, se ela mudou. Os Desfazer dessas ações também chamam `atualizarFechamento`.
- **Alterado depois:** se a `sobraRealizada` atual é diferente da marca, o herói mostra "Alterado depois do fechamento" e o link "Fechar de novo". Isso acontece quando outro aparelho ou a própria planilha muda o mês.
- **Backup:** o backup gerado pelo app leva `config.fechados`, e a importação o aceita.

## Recorrências, parcelas e transporte de sobra

Tudo no domínio puro (`<dominio>` de `src/App.html`), testado em `testes/dominio.test.mjs`.

**Recorrências (3.1.0).**

- `recorrenciasDoMes(recs, ano, mes, pulada)` devolve, por categoria, `{ cent, itens }`. Entra a recorrência com `ativa`, `inicio <= aaaamm` e `fim` vazio ou `>= aaaamm`; o `dia` é limitado ao último dia do mês; o item pulado aparece, mas não soma.
- **Plano efetivo.** `contasDoMes` recebe `p.recorrentes`. Em cada categoria vale o plano gravado no mês; sem ele, a soma das recorrências. Nada é gravado em massa, e nada é contado duas vezes. `porCat[].v.recorrente` marca o plano que veio delas. No app, `planoGravado()` lê só o `orcamento`, `planoExp()` devolve o plano efetivo, `pulada()` lê a marca e `recorrentesDoMes()` memoriza o Map por mês em `M()`.
- `situacaoContas(itens, realCent, hojeDia)` reparte o lançado entre as contas não puladas, na ordem do dia, e devolve `pago`, `restante`, `atrasada` (dia passou, falta pagar e não é automática) e `venceHoje`. Débito automático nunca fica atrasado.
- `aplicarOp` trata `rec` e `rec-` (este também limpa `pular:` em `d.marcas`). `abrirRecorrencia()`, `encerrarRec()` e `pularRec()` montam o bloco "Todo mês" da folha da categoria. `confirmarPrevisto()` e `lancarPrevisto()` lançam, no dia do vencimento, o `restante` de cada conta. O fechamento oferece `todas-auto`.
- No servidor, `validarRec_`, `salvarRec_` e `apagarRec_` validam e aplicam as operações. `apagarCat_` apaga também as recorrências da categoria e as marcas `pular:` delas.

**Parcelas.** `dividirParcelas(totalCent, n)` devolve `n` inteiros (2 a 48) que somam `totalCent`; a sobra do arredondamento vai para a primeira. `planoParcelas()` monta a prévia e as operações. Cada parcela é um `lanc` comum, com id `p{10 base36}-{kk}` (o mesmo prefixo liga as irmãs, mesmo entre anos) e descrição "base (k/n)". Como o id passa por `RE_ID`, o servidor não conhece o conceito: não há coluna nem aba. `registrarLote()` grava todas com um só Desfazer. `lerVezes()` e `pareceVezes()` reconhecem "1200x10". `proximasParcelas(id)` alimenta "Só nesta" e "Nesta e nas próximas". `copiarLancamento()` serve a Duplicar e a Repetir no próximo mês.

**Transporte de sobra.** `levarSobra()` e `planoSobra()`, no fechamento. A categoria da sobra é uma categoria de renda técnica ("Sobra do mês anterior") guardada em `config.categoriaSobra`. O lançamento tem id determinístico `sAAAAMM` (do mês de origem), cai no dia 1 do mês seguinte, e fechar de novo atualiza o mesmo id. `salvarCat_` recusa tirá-la de renda, e `apagarCat_` recusa apagá-la. Em `contasDoMes`, `p.sid` separa o valor transportado: a saída ganha `transporte` e `resultado = sobraRealizada − transporte`. O disponível e a sobra do mês incluem o transporte, porque o dinheiro veio junto. Os totais do ano (gráfico, rodapé da Planilha, CSV da tabela), a média, o melhor e o pior mês, `sugestaoMeta()` e `media3()` usam `resultado` e `rendaReal − transporte`.

## Importar extrato

Folha `abrirImportarExtrato()`, aberta em Ajustes e no Extrato. O arquivo nunca sai do navegador. Limites: 2 MB (`LIMITE_EXTRATO`) e 2.000 linhas (`MAX_LINHAS_EXTRATO`). A decodificação usa `decodificarTexto()`: UTF-8 estrito e, se falhar, windows-1252 (também quando o OFX declara `CHARSET:1252`).

- **Leitura:** `lerOFX()` (SGML e XML), `lerCSV()` (separador `;`, `,` ou tabulação detectado pela consistência das colunas, aspas e BOM), `adivinharColunasCSV()` e `extratoDeCSV()`. `lerDataBr()` e `lerValorBr()` leem os formatos brasileiros e os de fora ("1.234,56", "1,234.56", "(1.234,56)", sufixo D/C).
- **Sinal:** no extrato, débito é negativo. `valorDoExtrato()` grava gasto positivo para débito e estorno para crédito em categoria de gasto; em renda, o sinal fica. `inverterSinal()` serve à opção "Fatura de cartão".
- **Duplicados sem coluna nova.** O id do lançamento é `x` + dois `hash53` (cyrb53, base36) da conta e da chave: `idImportado(conta, chave)`. A chave é o `FITID`, quando existe; senão, `AAAA-MM-DD|centavos|descNormalizada|ocorrencia`, em que `ocorrencia` conta as linhas iguais do próprio arquivo. `classificarExtrato()` devolve a situação: `nova`, `ja-importada` (já existe o id), `duplicada-arquivo`, `possivel-duplicada` (mesma data, valor e descrição de um lançamento existente, contando ocorrências; vem desmarcada) ou `invalida`. `sugerirCategoria()` usa o histórico.
- **Gravação:** uma operação `lanc` por linha, em lotes pela fila normal (`registrarLote()`), com um só Desfazer. Descrição com `esc` na tela; o servidor já protege fórmulas. Linha em mês fechado chama `atualizarFechamento`.

## CSV

`exportarCSV()` escreve com `;`, BOM e vírgula decimal. `textoCSV()` protege texto que começa com `=`, `+`, `-` ou `@`. `linhasTabelaAno(ano)` monta a tabela (categorias × meses, com saídas, renda e sobra sem o transporte). Os botões são "CSV dos lançamentos" e "CSV da tabela de {ano}".

## Navegação e links

- **Mês:** `irParaMes(ano, mes)` troca o mês, reescreve o endereço com `hist.replace` e renderiza. Por isso, andar de mês não cria entradas no histórico. As setas usam `mudarMes(±1)`. `abrirSeletorMes()` é a folha **Escolher mês**: setas de ano, grade de 12 meses (`data-f="mes"`), **Hoje** e **Copiar link deste mês**, que aparece quando há `S.dados.urlApp`.
- **Endereço:** `parametros(estado)` monta `{ tela, ano, mes }`. Com `google.script.history`, dentro do Apps Script, `push` e `replace` usam essa API. Fora dele, usam `history.pushState` e `history.replaceState` com `?tela=…&ano=…&mes=…`. `irPara(tela)` faz `hist.push`, que cria uma entrada; `irParaMes` faz `hist.replace`.
- **Atalhos de entrada:** `lerAtalhosDaUrl()` aplica `ano` (1900 a 2200), `mes` (1 a 12), `tela` (uma das chaves de `TELAS`) e `novo` (abre `abrirNovo` com a categoria, se ela existir). No Apps Script, os parâmetros vêm de `google.script.url.getLocation`. Na página comum, vêm de `BUSCA_INICIAL`, capturada quando o script carrega. `iniciar()` chama `hist.replace` antes de carregar os dados, e esse replace reescreve `location.search`. Por isso a busca é guardada antes.

## Modo exemplo

`entrarExemplo()` troca `S.dados` por `gerarDadosExemplo(h)`: um controle fictício de 12 meses até o mês atual, com as categorias do modelo Essencial. O gerador usa uma sequência pseudoaleatória com semente fixa, então os valores são sempre os mesmos. A planilha real fica em `S.exemplo.real`. `planilha`, `urlApp`, `versaoApp` e `scriptId` são copiados para o exemplo, para os links continuarem funcionando.

Com `S.exemplo` definido:

- `registrar()` aplica a operação só na memória e não a põe em `S.fila`.
- `persistirFila()`, `salvarCache()` e `LS.gravar()` não gravam nada. O cache e o localStorage ficam como estavam.
- `enviar()` não faz nada, e `verificarAtualizacao()` sai cedo.
- A importação é recusada, com o aviso para usar **Começar do zero**.
- A faixa `#faixa-exemplo`, no topo da coluna, mostra o aviso e o botão `sair-exemplo`.

`sairExemplo()` fecha as folhas abertas, restaura `S.dados` com a planilha real e volta às boas-vindas. Se houver operações na fila, elas são enviadas.

## Fonte e cores

- **Fonte:** a DM Sans (SIL Open Font License 1.1) está embutida no início de `src/Estilos.html`, num `@font-face` com `src` em `data:font/woff2;base64`. Cobre os pesos 400 a 700, usa `font-display: swap` e tem `unicode-range` no subconjunto latino. As barras `/` do base64 estão escapadas como `\/`, que o CSS lê como `/`. A licença fica em `docs/fontes/DM-Sans-OFL.txt`. A variável `--fonte` usa a DM Sans e, de reserva, a fonte do sistema. O app não consulta o Google Fonts. Os tamanhos de texto usam `rem`, então acompanham a fonte padrão do navegador.
- **Cores das categorias:** `corCat(id)` devolve um índice de 0 a 7, que vira a classe `.cor-N` em `Estilos.html`, com variantes para o modo escuro. As categorias que não são de renda seguem a ordem da lista (`i % 8`). As de renda começam no índice 3. Um id fora da lista cai num índice pelo nome (`corDe(id) % 8`). O mapa fica no cache de `M()`, que é zerado quando `S.versao` ou o dia muda. Verde, âmbar e vermelho ficam só para situação.

## Segurança

- `@OnlyCurrentDoc`: o script só enxerga a planilha onde está instalado.
- Sem `ALLOWALL`: outros sites não conseguem embutir o app.
- Validação no servidor: ids no padrão `[A-Za-z0-9_-]`, mês 1–12, dia válido para o mês (`diasNoMes_()` recusa 31/02, por exemplo), valor finito e diferente de zero, categoria existente, troca de grupo recusada quando a categoria tem lançamentos e muda entre renda e gasto (`salvarCat_`), lote de até 500 operações; recorrência com valor, dia, `inicio` e `fim` válidos e categoria existente; categoria da sobra sempre de renda.
- Texto que começa com `=`, `+`, `-` ou `@` recebe um apóstrofo antes de ir para a planilha, para não virar fórmula.
- No navegador, todo texto vindo dos dados é escapado antes de entrar no HTML.
- A consulta de versão é feita pelo navegador (leitura pública, sem dados da planilha); o GitHub vê o IP. O instalador é opcional e tem escopos próprios, descritos em [SEGURANCA.md](SEGURANCA.md).

## Testes

- `testes/gas-mock.mjs` imita `SpreadsheetApp`, `LockService` e `HtmlService`, inclusive o que a planilha faz com texto que parece número ou fórmula. O `Codigo.gs` de verdade roda dentro do Node.
- `testes/servidor.test.mjs` cobre leitura do formato da v1, operações, dois aparelhos, recusas, fórmulas, importação (inclusive o tema, as marcas e as recorrências), data inválida, `onEdit` a página, as marcas `encerrada:`, `pular:` e os fechamentos `fechado:` na `config`, a aba `recorrencias` (que não é criada ao ler e nasce na primeira gravação), `categoriaSobra` e a compatibilidade com o `Codigo.gs` da versão anterior.
- `testes/dominio.test.mjs` roda a seção 1 de `src/App.html` (entre os marcadores `<dominio>`) num `vm`: as regras do disponível, de renda, Guardar, estornos e encerramento, a propriedade "nenhum gasto aumenta o disponível", centavos, pendências, o leitor de valores e a média das sugestões; da 3.1.0, as recorrências e o plano efetivo, os vencimentos, a divisão de parcelas, o transporte de sobra e a leitura de extrato (CSV, OFX, datas, valores, ids e duplicados).
- `testes/e2e.mjs` abre o app de verdade num Chrome sem janela, ligado ao servidor de verdade. A data é fixa (18/11/2026) para os testes não dependerem do dia. Cobre lançar, editar, apagar e desfazer, dois aparelhos, queda de conexão com recarga, plano, planilha, primeiro acesso, disponível para gastar, meta de economia, cobertura do plano, foco do teclado, transbordo no celular e o aviso de versão nova com a folha de atualização assistida (GitHub simulado). Cobre também os recursos da 2.8.0 (quitar, encerrar no mês, não vem mais, estorno, lançamento rápido em outro mês, `1200x10`, valor fora do normal, aviso único) e da 2.8.1 (avisos fora da folha, repetir até dezembro com confirmação, proteção de grupo e de Guardar, importação com prévia, Desfazer em pilha e acessibilidade). Os cenários da 3.1.0 cobrem recorrências e vencimentos, parcelas, duplicar e repetir, transporte de sobra, importação de extrato (CSV e OFX) e o backup com CSVs.
- Para rodar o e2e é preciso o `puppeteer` (`npm i -D puppeteer`, ou `PUPPETEER_MODULE` com o caminho do módulo) e um Chrome, indicado por `CHROME_PATH`. `node testes/e2e.mjs` roda os cenários; `--prints` também regrava os prints de `docs/img/`; `E2E_SO="3.1.0"` roda só os cenários com esse texto no nome.
- `testes/versao.test.mjs` confere o `versao.json` contra o `package.json`, o `VERSAO_APP`, o changelog e os hashes dos arquivos.
- `testes/instalador.test.mjs` roda o `instalador/Codigo.gs` num `vm` com as APIs do Google e do GitHub simuladas: canal, hashes, instalação e atualização (cópia de segurança, arquivo `Código` removido, extras mantidos, só a implantação pedida).
- `npm run versao -- --conferir` falha se o `versao.json` estiver desatualizado; o workflow de publicação roda os testes antes de criar a tag.
