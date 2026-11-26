# Produto: Finanças

> O QUE o sistema é. Não descreve como codar (ver `convencoes.md`) nem o que é proibido (ver `regras.md`).
> Atualizar sempre que uma feature mudar o domínio, os perfis ou os módulos.

## Em uma frase

Controle financeiro pessoal que roda dentro do Google Sheets do usuário, sem servidor próprio: o app envia operações pequenas, o servidor as aplica na planilha e o celular/computador não se sobrescrevem.

## Perfis

Hierarquia de menor para maior alcance: `usuário`.

| Perfil | Quem é | Alcance |
|---|---|---|
| usuário | Quem baixa o projeto e instala o app na própria planilha do Google Sheets | Lê e altera apenas a própria planilha (`@OnlyCurrentDoc`) |

Não há papel gravado no banco nem autorização em camadas: a planilha pertence a quem a criou e o acesso é dado pelo Google.

## Módulos

| Módulo | O que faz | Entrada principal |
|---|---|---|
| Início | Responde, em ordem: quanto posso gastar, o que falta pagar, como estou nos planos e para onde foi o dinheiro | `src/Index.html` + `src/App.html` |
| Lançar | Registra despesa, receita ou transferência com poucos toques; parcela uma compra em 2 a 48 vezes; duplica e repete lançamentos | Tela de lançamento |
| Todo mês | Recorrências por categoria (conta ou renda com valor, dia e débito automático); viram o plano do mês e o vencimento em "O que falta pagar" | Folha da categoria |
| Extrato | Lista lançamentos, permite busca e filtros; importa extrato de banco (CSV e OFX) no navegador | Tela de extrato |
| Planilha | Mostra o ano em mapa de calor e os detalhes do mês selecionado | Aba do Google Sheets |
| Planejar | Define valores planejados por categoria/mês, com "Copiar de" | Tela de planejamento |
| Ajustes | Abre num índice (Geral, Categorias, Cartões, Seus dados, Atualizações, Diagnósticos); no computador, índice e seção lado a lado. Categorias é uma lista de leitura: tocar numa linha abre o painel de edição, e **Ordenar** muda a posição dentro do grupo. Configura tema, atualização, versão e dados de exemplo; backup (JSON v3), CSVs e importação | Tela de ajustes |
| Fechamento | Fecha o mês passado, guarda a sobra realizada e pode levá-la como renda ao mês seguinte | Folha "Fechar {mês}" |

## Entidades e prefixos de coluna

| Entidade | Tabela (aba) | Prefixo | Observação |
|---|---|---|---|
| Lançamento | `lancamentos` | — | `id`, `ano`, `mes`, `dia`, `categoriaId`, `descricao`, `valor` |
| Categoria | `categorias` | — | `id`, `nome`, `grupo`, `ordem` |
| Orçamento/Plano | `orcamento` | — | `ano`, `categoriaId`, `mes`, `valor` |
| Configuração | `config` | — | `chave`, `valor` (inclui `revisao`, `atualizadoEm`, `categoriaGuardar`, `categoriaSobra`, e as marcas `encerrada:`, `fechado:` e `pular:`) |
| Recorrência | `recorrencias` (opcional, nasce na primeira gravação) | — | `id`, `categoriaId`, `descricao`, `valor`, `dia`, `inicio`, `fim` (aaaamm), `ativa`, `automatico` |
| Cartão de crédito | `cartoes` (opcional, nasce na primeira gravação; 3.2.0) | — | `id` (`k` + 10 caracteres `[a-z0-9]`), `nome`, `fechamento` (1–31), `vencimento` (1–31), `limite` (opcional), `ativo`. Lançamento de cartão tem id `k<cartao>_<id>`, sem coluna nova |

**Fatura** (3.2.0) não é entidade gravada: é o agrupamento dos lançamentos de um cartão pelo mês de pagamento, mostrado no Mês. O total aparece, nunca é somado de novo, e a fatura não vira conta a mais.

**Diagnósticos** (3.2.0) é a folha de Ajustes com versão, revisão, fila, última sincronização, operações recusadas e sinais da planilha. Mostra só contagens e datas, e o texto copiado segue a mesma regra.

Não há convenção de FK por prefixo: as colunas são literais (`categoriaId` aponta para `categorias.id`).

Parcela e transporte de sobra não têm aba: são lançamentos comuns com id de formato fixo (`p{grupo}-{kk}` nas parcelas, `sAAAAMM` na sobra levada, `x`+hash nos importados).

## Ambiente

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS e JavaScript vanilla servidos pelo `HtmlService` do Apps Script |
| Backend | Google Apps Script (runtime V8), `src/Codigo.gs` |
| Banco | Google Sheets (`lancamentos`, `categorias`, `orcamento`, `config` e a opcional `recorrencias`) |
| Deploy | Web App do Apps Script (`doGet`) |
| Testes | Node.js 20+ com `node --test`, mocks da planilha em `testes/` |

Layout do repositório:

- `src/` — arquivos que vão para o projeto Apps Script (`.gs`, `.html`, `appsscript.json`).
- `instalador/` — projeto Apps Script separado que cria a planilha e publica o app. Instalar e atualizar são divididos em etapas que a página chama uma a uma e mostra como progresso (`prepararInstalacao`, `criarPlanilha`, `criarProjeto`, `publicarApp`, `desfazerInstalacao`; `prepararAtualizacao`, `guardarCopia`, `trocarCodigo`, `publicarAtualizacao`, `voltarVersao`); `instalar` e `atualizar` continuam e encadeiam as mesmas etapas. `estado()` informa `alvo.copia`, a cópia antes de atualizar mais recente. A página tem a trilha "Passo n de 4", QR code do endereço do app gerado por `instalador/Qr.html` (adaptado da qrcodegen, MIT) e voltar para a versão anterior com confirmação.
- `docs/index.html` — página estática "Antes de começar", sem JS nem recurso externo, que explica a instalação antes de abrir o instalador. Publicada pelo GitHub Pages quando ligado (QF-001).
- Atualizações no app — `versaoServidor()` devolve a `VERSAO_APP` do código implantado; o app a consulta ao voltar à aba depois de "Atualizar para X" e mostra "Atualizado para X · Recarregar". A faixa de versão nova na Visão geral e a folha "O que mudou" usam as chaves locais `versao-fechada` e `versao-vista`.
- `testes/` — testes de domínio, servidor, HTML service, versão e e2e.
- `exemplos/` — dados fictícios para testes e primeiro acesso.
- `docs/` — guias de instalação, uso, arquitetura, segurança e atualização.
- `versao.json` — canal de versões lido pelo app.

## Autenticação

O usuário entra pela conta Google que criou a planilha. O app pede escopo `https://www.googleapis.com/auth/spreadsheets.currentonly` (`@OnlyCurrentDoc`), restringido à planilha aberta. O instalador tem permissões próprias para criar a planilha e o projeto; ele não lê dados do usuário. A planilha que ele cria leva o marcador `appProperties.financasInstalador`, e a lixeira em caso de falha só alcança planilha com esse marcador criada há no máximo 60 minutos. Toda escrita de código baixado é precedida da conferência SHA-256; `voltarVersao` é a exceção, porque só repõe a cópia que o próprio projeto guardou.

## Inventário detalhado

- Backend: funções expostas em `src/Codigo.gs` (`doGet`, `carregar`, `estado`, `sincronizar`, `onEdit`, etc.).
- Frontend: páginas em `src/*.html` (`Index.html`, `App.html`, `Estilos.html`).
- Testes: `testes/*.mjs`.
- O inventário completo de nomes está na skill `bsdesenv-financas` (`spec/templates/inventario.md`).
