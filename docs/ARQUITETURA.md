# Arquitetura

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/Codigo.gs` | Servidor (Apps Script): serve a página, lê e grava as abas, aplica operações |
| `src/Index.html` | Esqueleto da página; junta `Estilos` e `App` com `incluir()` |
| `src/Estilos.html` | Visual: tokens de cor (claro e escuro), layout de celular e de computador |
| `src/App.html` | O app no navegador: estado, sincronização, cálculos, telas |
| `src/appsscript.json` | Manifesto: fuso, permissão mínima e configuração do app da Web |

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

## Categoria Guardar

A categoria de economia é a que tem `id === 'guardar'` ou, se ela não existir, a primeira categoria que não é de renda cujo nome normalizado começa por "guardar" (por exemplo, "Guardar" ou "Guardar / Investir"). A função `catGuardar()` centraliza essa busca.

- É criada com `{ id: 'guardar', nome: 'Guardar', grupo: 'fixo', ordem: menor ordem dos fixos − 1 }` pelos modelos de primeiro acesso e pelas ações que precisam dela (`criar-guardar` e `meta-sugestao`, quando ainda não existe).
- O **plano** mensal dela é a meta de economia; o **lançamento** nela é a transferência feita.
- Fica fora da barra de gastos, dos avisos de "passou do plano" e de "Sem plano". Entra no total de saídas, na sobra e no disponível.
- O cartão "A vencer" não a mostra; a transferência é confirmada no cartão "Meta de economia".
- `sugestaoMeta()` devolve `{ valor, meses }` a partir da média de `rendaReal − gastoConsumoReal` dos últimos 3 meses fechados que tenham lançamentos. O valor é 80% dessa média, arredondado para baixo em múltiplos de 10 quando for pelo menos 100; se a média for menor ou igual a zero, o valor é 0. A sugestão só vira plano quando a pessoa usa o botão da sugestão ou grava o campo.

## Regras de cálculo

Para uma categoria num mês:

| Situação | Valor (qualquer mês: passado, corrente ou futuro) |
|---|---|
| teve lançamento | a soma do lançado |
| sem lançamento, com plano | o plano, marcado como "previsto" |
| sem lançamento, sem plano | zero |

É a regra da versão 1. Nada é estimado por conta própria: a média dos 3 meses anteriores só aparece como sugestão e só vira plano quando a pessoa grava ("Usar as médias"). Assim, apagar um lançamento ou um plano muda o total na hora.

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
| `rendaBase` | `rendaReal > 0 ? rendaReal : renda`: limite conservador, usa o que já entrou; se nada entrou, usa o plano |
| `gastosConsumo` | valor por categoria das categorias de consumo (exclui Guardar) |
| `gastoConsumoReal` | lançado nas categorias de consumo (exclui Guardar) |
| `gastos` | todas as saídas, incluindo Guardar |
| `gastoReal` | lançado em todas as saídas, incluindo Guardar |
| `guardadoPlano` | plano de Guardar (a meta do mês) |
| `guardadoReal` | lançado em Guardar (a transferência feita) |
| `aRealizar` | soma de `max(0, plano − real)` de todas as categorias de saída; inclui Guardar |
| `aRealizarConsumo` | o mesmo, só nas categorias de consumo |
| `previsto` | `gastos − gastoReal`: a diferença agregada dos planos sem lançamento |
| `disponivel` | `rendaBase − gastoReal − aRealizar` |
| `porDia` | `disponivel / dias restantes` no mês atual; 0 nos demais |
| `sobra` | `renda − gastos` (projeção; inclui Guardar) |
| `sobraSeGastarPlanos` | `renda − gastoReal − aRealizar` (se gastar tudo o que ainda está nos planos) |
| `sobraReal` | `rendaReal − gastoReal` (realizado) |
| `planoGastos` e `gastoComPlano` | só categorias de consumo; alimentam a barra do plano |
| `semPlano` e `semPlanoQtd` | só consumo, sem plano |
| `qtdGastos` e `qtdConsumo` | quantidade de lançamentos de saída e de consumo |
| `aVencer` | fixos com plano e sem lançamento, para o cartão "A vencer"; o cartão exclui Guardar |

`previsto` e `aRealizar` não são a mesma coisa: `aRealizar` soma apenas o que falta em cada plano e não desconta o que passou dele; `previsto` é a diferença agregada entre `gastos` e `gastoReal`.

A diferença central está entre `sobra` e `disponivel`: `sobra` responde "quanto sobra se o mês terminar como está previsto?" e `disponivel` responde "quanto posso gastar agora sem furar os planos nem a meta?". Por isso `disponivel` parte de `rendaBase` (renda recebida) e desconta `aRealizar` (o que ainda falta sair), incluindo Guardar. Quando parte da renda ainda não entrou, `disponivel` é menor que `sobra`.

- **Mês fechado:** `sobraReal` é o realizado. `sobra` continua sendo o valor por categoria (o plano quando não há lançamento). Nas telas de mês passado, o app usa `sobraReal` quando há renda/lançamento real e rotula "realizada"; sem dados reais, usa `sobra` e rotula "com previsto".
- **Herói:** mostra `rendaBase − gastoReal − aRealizar = disponivel`, em quatro linhas (Renda, Já saiu, Ainda reservado, Disponível). A sobra não entra no herói; ela fica na tela Mês e no gráfico anual.
- **Ritmo do plano:** cartão separado; usa `planoGastos` e `gastoComPlano` (só consumo, sem Guardar). Fica `acima` quando o gasto passa o plano; `atencao` quando `planoGastos > 0` e o gasto passa mais de 12 pontos percentuais do ritmo do mês; senão `ok`. Guardar não entra.
- **Ritmo:** a marca nas barras é o dia de hoje sobre os dias do mês. Uma categoria variável fica "acima do ritmo" quando já usou mais de 12 pontos percentuais além dele. Guardar é sempre `ok`: guardar mais que a meta é bom.
- **Mapa de calor:** cada mês fechado é comparado com a média dos meses fechados da própria categoria no ano (a partir de 3 meses). Acima de 15% fica laranja; abaixo de −15%, azul.

## Segurança

- `@OnlyCurrentDoc`: o script só enxerga a planilha onde está instalado.
- Sem `ALLOWALL`: outros sites não conseguem embutir o app.
- Validação no servidor: ids no padrão `[A-Za-z0-9_-]`, mês 1–12, dia válido para o mês (`diasNoMes_()` recusa 31/02, por exemplo), valor finito e diferente de zero, categoria existente, lote de até 500 operações.
- Texto que começa com `=`, `+`, `-` ou `@` recebe um apóstrofo antes de ir para a planilha, para não virar fórmula.
- No navegador, todo texto vindo dos dados é escapado antes de entrar no HTML.

## Testes

- `testes/gas-mock.mjs` imita `SpreadsheetApp`, `LockService` e `HtmlService`, inclusive o que a planilha faz com texto que parece número ou fórmula. O `Codigo.gs` de verdade roda dentro do Node.
- `testes/servidor.test.mjs` cobre leitura do formato da v1, operações, dois aparelhos, recusas, fórmulas, importação (inclusive o tema), data inválida, `onEdit` e a página.
- `testes/e2e.mjs` abre o app de verdade num Chrome sem janela, ligado ao servidor de verdade. A data é fixa (18/11/2026) para os testes não dependerem do dia. Cobre lançar, editar, apagar e desfazer, dois aparelhos, queda de conexão com recarga, plano, planilha, primeiro acesso, disponível para gastar, meta de economia, cobertura do plano, foco do teclado e transbordo no celular.
