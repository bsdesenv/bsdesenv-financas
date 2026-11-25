# O ambiente de IA do bsdesenv-financas

> Última revisão: 25/11/2026.
>
> Se você chegou agora, leia até o fim uma vez. Depois volte só nas tabelas.

---

## 1. O que você precisa entender antes de tudo

Três ideias sustentam o resto:

1. **A IA não sabe nada do projeto sozinha.** O contexto vem de arquivos de texto que alguém colocou na frente dela.
2. **Cada informação tem um dono só.** Regra repetida em dois lugares vira duas versões; a desatualizada é sempre a que alguém lê.
3. **A `spec/` é versionada; o material de IA não.** `.claude/`, `.opencode/`, `CLAUDE.md`, `AGENTS.md`, `.mcp.json` e `opencode.json` ficam fora do git. O motivo é manter o repositório livre de configuração de ferramenta pessoal.

Como a `spec/` está no git, backup da camada de IA não é necessário; `spec/_fontes/backup.sh` só empacota a memória do runtime do Claude (`~/.claude/projects/...`).

---

## 2. O mapa em 30 segundos

```
┌─────────────────────────────────────────────────────────────┐
│  CLAUDE.md / AGENTS.md (symlink) — carregado em todo turno  │
└───────────────────────────────┬─────────────────────────────┘
                                │ aponta para
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   ┌─────────┐            ┌──────────┐           ┌──────────┐
   │ spec/   │            │  skills  │           │ agentes  │
   └─────────┘            └──────────┘           └──────────┘

   executam:  Claude Code          opencode
              claude-opus-5        gpt-4o
              claude-fable-5       gpt-4o-mini

   travas:    commit-msg (spec-acompanha)
              pre-commit (não versiona material de IA)
              .claude/hooks/safety-net.sh
```

---

## 3. As peças

### 3.1 Runtimes e modelos

| | Claude Code | opencode |
|---|---|---|
| Leve / fechado | `claude-fable-5` | `gpt-4o-mini` |
| Médio / sessão | `claude-fable-5` | `gpt-4o` |
| Pleno / decisão | `claude-opus-5` | `gpt-4o` |
| Lê `CLAUDE.md`? | sim | sim |
| Skills | sim | não |
| Memória | sim (`~/.claude/projects/...`) | não |
| MCPs | não | não |

Dois runtimes existem por **disponibilidade e custo**: Claude Code é o principal; opencode é a alternativa local sem custo de API.

### 3.2 `CLAUDE.md` / `AGENTS.md`

- `CLAUDE.md` é o preâmbulo carregado em todo turno.
- `AGENTS.md` é symlink para `CLAUDE.md`; serve para ferramentas que procuram esse nome.
- É curto e só ponteiros: stack, comandos, checklist, skills, agentes, hooks, travas, estilo de output.
- **Não contém** regras de negócio completas nem convenções de código; isso mora na `spec/`.

### 3.3 `spec/`, o contexto do produto

| Arquivo | Responde |
|---|---|
| `spec/produto.md` | O que o sistema é: domínio, perfis, módulos, entidades, ambiente |
| `spec/regras.md` | O que é inviolável |
| `spec/convencoes.md` | Como codar aqui |
| `spec/convencoes-processo.md` | Estilo de plano e parecer; onde vai cada arquivo novo |
| `spec/roteamento.md` | Quando delegar, qual agente e por quê |
| `spec/glossario.md` | Termos do domínio |
| `spec/estado.md` | Direção, lacunas, suposições, decisões pendentes |

### 3.4 Agentes

Em `.claude/agents/` e `.opencode/agents/`:

- `mecanico` — edição fechada, testes, harnesses.
- `pleno` — decisões de arquitetura e debug difícil (só sobe com `Decidir:` no prompt).
- `levantamento` (Claude) / `explore` (opencode) — mapear código e responder perguntas.
- `review` — revisão de código; não altera arquivos.

### 3.5 Skills

- `spec` — pipeline de plano/IMPLEMENT/PARECER.
- `spec-analyze` — auditoria: checa se a máquina está instalada e saudável.
- `bsdesenv-financas` — inventário do projeto (backend e frontend).

### 3.6 MCPs

Nenhum. O projeto roda no Google Apps Script; não há servidor local para ferramentas de navegador nem banco exposto.

### 3.7 Travas mecânicas

| Trava | O que faz | Como testar |
|---|---|---|
| `pre-commit` | Bloqueia commit de `.claude/`, `.opencode/`, `CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `opencode.json`; permite `spec/` e `.claude/skills/video-tutorial/` | `sh spec/_fontes/hooks/pre-commit` |
| `commit-msg` → `spec-acompanha` | Exige que mudança em `src/Codigo.gs`, `src/App.html`, `src/appsscript.json` etc. traga `spec/` junto ou tenha `Spec-OK: <motivo>` | `sh spec/_fontes/hooks/spec-acompanha <arquivo>` |
| `safety-net.sh` | Pede confirmação antes de comandos destrutivos (rm, drop, truncate, etc.) | `sh .claude/hooks/safety-net.test.sh` |

---

## 4. Comandos de verificação

```bash
# Unitários
npm test

# E2E (precisa do Chrome; instalar com npx puppeteer browsers install chrome se der erro)
npm run test:e2e

# Portão de entrega
sh spec/_fontes/verificar-entrega.sh

# Auditoria da máquina (substitui a skill spec-analyze em scripts)
sh spec/_fontes/verificar-inventario.sh
sh spec/_fontes/verificar-comentarios.sh
```

---

## 5. Exemplo de tarefa do começo ao fim

**Tarefa:** "Adicionar um campo 'observação' no lançamento rápido."

1. **Plano.** Usar a skill `spec` se a tarefa for grande. Para 1–3 arquivos, plano inline no prompt. Ver `spec/roteamento.md`.
2. **Implementar.** Editar `src/App.html` (campo no modal), `src/Codigo.gs` (função que grava) e `src/Estilos.html` (se necessário).
3. **Testar.** Rodar `npm test` e `npm run test:e2e`.
4. **Atualizar a spec.** Se a mudança altera o formato da aba `Lançamentos` ou o contrato de API, atualizar `spec/produto.md`. Se for só layout, pode usar `Spec-OK: layout interno, não muda contrato`.
5. **Commit.** O `pre-commit` permite `spec/` e `src/`; o `spec-acompanha` vai exigir a spec junto.
6. **Review.** Se a tarefa teve 3+ fases, chamar o agente `review` antes de fechar.

---

## 6. O que muda de outros projetos do kit

- Sem Laravel, Quasar, commitlint, prettier, eslint.
- O backend é Google Apps Script (`src/Codigo.gs`); o frontend é HTML/CSS/JS vanilla servido por `doGet`.
- A base de dados é a planilha Google; regras de schema estão em `spec/regras.md`.
- `spec/_fontes/verificar-documentacao.sh` foi removido: o projeto não tem `docs/dev/` nem `docs/uso/`.
- `TETO_DOCBLOCK` foi ajustado para `25` em `spec/_fontes/verificar-comentarios.sh` para acomodar os headers existentes.

---

## 7. Checklist rápido a cada tarefa

- [ ] `spec/produto.md`, `regras.md`, `convencoes.md` atualizados se o domínio/regra/estilo mudou.
- [ ] Testes da camada tocada passam (`npm test` e `npm run test:e2e`).
- [ ] Portão de entrega verde: `sh spec/_fontes/verificar-entrega.sh`.
- [ ] Nenhum dado pessoal, real ou caminho de máquina entrou no diff.
