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
| Lançar | Registra despesa, receita ou transferência com poucos toques | Tela de lançamento |
| Extrato | Lista lançamentos, permite busca e filtros | Tela de extrato |
| Planilha | Mostra o ano em mapa de calor e os detalhes do mês selecionado | Aba do Google Sheets |
| Planejar | Define valores planejados por categoria/mês, com "Copiar de" | Tela de planejamento |
| Ajustes | Configura tema, atualização, versão e dados de exemplo | Tela de ajustes |

## Entidades e prefixos de coluna

| Entidade | Tabela (aba) | Prefixo | Observação |
|---|---|---|---|
| Lançamento | `lancamentos` | — | `id`, `ano`, `mes`, `dia`, `categoriaId`, `descricao`, `valor` |
| Categoria | `categorias` | — | `id`, `nome`, `grupo`, `ordem` |
| Orçamento/Plano | `orcamento` | — | `ano`, `categoriaId`, `mes`, `valor` |
| Configuração | `config` | — | `chave`, `valor` (inclui `revisao`, `atualizadoEm`, etc.) |

Não há convenção de FK por prefixo: as colunas são literais (`categoriaId` aponta para `categorias.id`).

## Ambiente

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS e JavaScript vanilla servidos pelo `HtmlService` do Apps Script |
| Backend | Google Apps Script (runtime V8), `src/Codigo.gs` |
| Banco | Google Sheets (`lancamentos`, `categorias`, `orcamento`, `config`) |
| Deploy | Web App do Apps Script (`doGet`) |
| Testes | Node.js 20+ com `node --test`, mocks da planilha em `testes/` |

Layout do repositório:

- `src/` — arquivos que vão para o projeto Apps Script (`.gs`, `.html`, `appsscript.json`).
- `instalador/` — projeto Apps Script separado que cria a planilha e publica o app.
- `testes/` — testes de domínio, servidor, HTML service, versão e e2e.
- `exemplos/` — dados fictícios para testes e primeiro acesso.
- `docs/` — guias de instalação, uso, arquitetura, segurança e atualização.
- `versao.json` — canal de versões lido pelo app.

## Autenticação

O usuário entra pela conta Google que criou a planilha. O app pede escopo `https://www.googleapis.com/auth/spreadsheets.currentonly` (`@OnlyCurrentDoc`), restringido à planilha aberta. O instalador tem permissões próprias para criar a planilha e o projeto; ele não lê dados do usuário.

## Inventário detalhado

- Backend: funções expostas em `src/Codigo.gs` (`doGet`, `carregar`, `estado`, `sincronizar`, `onEdit`, etc.).
- Frontend: páginas em `src/*.html` (`Index.html`, `App.html`, `Estilos.html`).
- Testes: `testes/*.mjs`.
- O inventário completo de nomes está na skill `bsdesenv-financas` (`spec/templates/inventario.md`).
