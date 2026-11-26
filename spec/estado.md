# Estado atual

> Direção do produto, decisões que sobreviveram e lacunas conhecidas.
> Atualizar sempre que uma tarefa mudar direção, fechar uma lacuna ou abrir outra.

---

## Direção atual

Branch de trabalho: `main`. Branch principal: `main`.

| Tema | Situação |
|---|---|
| Plano financeiro e UX | Em revisão: a sessão atual trabalha na revisão do plano financeiro e da experiência de uso do app. |
| Versão 3.2.0 | Publicada em 25/11/2026: cartão de crédito com fatura no Mês, Diagnósticos, impressão do Mês e testes de acessibilidade locais (axe, 200% de zoom, só teclado, capturas em 320/390/1440). |
| Versão 3.1.0 | Publicada em 25/11/2026 (planejamento de verdade: recorrências, parcelas, sobra levada, importar extrato). O app avisa quando houver nova versão; o instalador faz atualização preservando dados. |

---

## Lacunas abertas

Uma lacuna é algo que o código não resolve e que precisa de decisão antes de virar tarefa. Registrar com ID para poder ser referenciada.

### Q-001 — Qual o escopo exato da revisão de plano financeiro e UX?

**Status:** aberta.

Sabe-se que a direção é "Revisão de plano financeiro e UX", mas não está definido quais telas/fluxos entram primeiro e se a revisão inclui alteração de regra financeira (como o cálculo do disponível) ou só ajustes de interface.

**Antes de codar qualquer coisa, responder:** se a revisão pode mudar a fórmula do `disponível` ou se fica só em layout/navegação; e quais são as duas ou três telas prioritárias.

---

### Q-002 — Ligar o GitHub Pages na pasta `docs/`?

**Status:** aberta.

A página `docs/index.html` (Antes de começar) está no repositório, mas só vira endereço público com o Pages ligado. Os guias citam o caminho sem link até lá.

### Q-003 — Pendências menores do instalador e do e2e

**Status:** aberta.

- `escolherImplantacoes_` (instalador): se o `implantacaoId` informado não existir, aponta todas as implantações web do projeto, como antes da 3.6.0. Avaliar recusar com "Implantação não encontrada".
- e2e "3.1.0 parcelas … Duplicar" falhou uma vez na suíte completa rodando junto com outro e2e; passou 5 de 5 sozinho, antes e depois da 3.6.0. Suspeita de instabilidade sob carga.
- Publicar o instalador central (conta do instalador) com as etapas novas; testar antes com `REF_TESTE`.

---

## Achados de tela (gravação dos vídeos de 26/11/2026)

- **Planilha, gráfico "Sobra mês a mês":** as barras não aparecem no Chrome; o cartão fica branco entre o título e o resumo. Medido no app servido pelo `servidor.mjs`: `.ga-col` fica com altura 0 px, e as barras `.ga-pos`/`.ga-neg` usam altura percentual sem referência. A gravação usou um ajuste só do navegador (`.ga-col{height:100%}` em `auxiliar.mjs`) para o gráfico aparecer no vídeo; o app publicado continua sem as barras. Entra na tarefa que tocar a Planilha.

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
| ASM-002 | A data real da compra no cartão não é guardada: a compra conta no mês de pagamento da fatura, no dia do vencimento. | aberta | Guardar a data exigiria coluna ou aba de detalhe (R-004). Fica suposição até decisão sobre isso. |
| ASM-003 | CSP não implementada: a política de conteúdo por meta tag dentro do iframe do HtmlService não foi verificada. | aberta | `docs/SEGURANCA.md` diz que não é prometida; o teste fixa só as origens externas. |
| ASM-012 | Depois do PUT na implantação, `google.script.run` de uma página aberta antes já roda o código novo (base do "Atualizado para X"). | aberta | Conferir na instalação de teste depois de publicar o instalador central. |
| ASM-013 | `script.google.com/home/usersettings` abre no navegador do celular. | aberta | Conferir no celular; se não abrir, o passo pede computador. |
| ASM-014 | Baixar e conferir os arquivos de novo em cada etapa de escrita cabe no tempo das chamadas do Apps Script. | aberta | Medir na instalação de teste. |
