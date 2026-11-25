# Estado atual

> Direção do produto, decisões que sobreviveram e lacunas conhecidas.
> Atualizar sempre que uma tarefa mudar direção, fechar uma lacuna ou abrir outra.

---

## Direção atual

Branch de trabalho: `main`. Branch principal: `main`.

| Tema | Situação |
|---|---|
| Plano financeiro e UX | Em revisão: a sessão atual trabalha na revisão do plano financeiro e da experiência de uso do app. |
| Versão 3.1.0 | Publicada em 25/11/2026 (planejamento de verdade: recorrências, parcelas, sobra levada, importar extrato). O app avisa quando houver nova versão; o instalador faz atualização preservando dados. |

---

## Lacunas abertas

Uma lacuna é algo que o código não resolve e que precisa de decisão antes de virar tarefa. Registrar com ID para poder ser referenciada.

### Q-001 — Qual o escopo exato da revisão de plano financeiro e UX?

**Status:** aberta.

Sabe-se que a direção é "Revisão de plano financeiro e UX", mas não está definido quais telas/fluxos entram primeiro e se a revisão inclui alteração de regra financeira (como o cálculo do disponível) ou só ajustes de interface.

**Antes de codar qualquer coisa, responder:** se a revisão pode mudar a fórmula do `disponível` ou se fica só em layout/navegação; e quais são as duas ou três telas prioritárias.

---

## Restrições de processo

- O repositório é público: nenhum dado pessoal, de cliente ou de máquina entra em commit.
- A `spec/` é versionada; o material de execução da IA (`.claude/`, `.opencode/`, `CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `opencode.json`) fica fora do git, configurado em `.git/info/exclude`.
- Backup da camada de IA restringe-se à memória do runtime do Claude (`spec/_fontes/backup.sh`); a `spec/` já tem histórico no git.

---

## Ambiente de IA

Instalação concluída em `e29e6bc`. Runtimes configurados: Claude Code (`sonnet`, `haiku`) e opencode (`glm-5.3` no pleno, `deepseek-v4.1-flash` na sessão e nos leves; plano OpenCode Go). Hooks ativos (`spec/_fontes/hooks`), agentes instalados, skills `spec`, `spec-analyze` e `bsdesenv-financas` em `.claude/skills/`. Ver detalhes em `spec/_IAdoc/AMBIENTE-IA.md`.

Correção da instalação em 25/11/2026, pelo `ATUALIZAR.md` do kit: modelos dos agentes (haiku nos leves, sonnet no pleno), módulo de custo ligado, avisos de economia e rodapé ligados, fixture do núcleo restaurada, teto de docblock de volta a 8, trava de dados pessoais no pre-commit e `verificar-documentacao.sh` reinstalado. Backup do ambiente de IA anterior guardado fora do repositório.

---

## Suposições em aberto

Uma suposição é uma lacuna que foi preenchida com um palpite razoável para não travar o trabalho. Precisa ser confirmada ou invalidada antes da feature ser dada como pronta.

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | A revisão de UX não muda a regra do `disponível` nem a estrutura das abas existentes. | fechada | A regra do `disponível` não mudou. A 3.1.0 acrescentou só a aba opcional `recorrencias`, sem colunas novas nas abas antigas (R-004). |
