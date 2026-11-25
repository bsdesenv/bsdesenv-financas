# spec/

> Fonte de verdade do projeto: o que o sistema é, o que não pode ser feito e como se escreve código aqui.

## O que cada arquivo responde

| Arquivo | Responde |
|---|---|
| `produto.md` | O que é o sistema, para quem serve, módulos, entidades, ambiente |
| `regras.md` | O que é inviolável e o porquê de cada regra |
| `convencoes.md` | Como se escreve código (front, back, testes, doc) |
| `convencoes-processo.md` | Onde vai plano, feature e arquivo novo |
| `roteamento.md` | Quem executa cada tarefa e quantas fases ela merece |
| `glossario.md` | Termos do domínio e os pares que se parecem |
| `estado.md` | Direção atual, lacunas e suposições |
| `_IAdoc/AMBIENTE-IA.md` | O que foi instalado do ambiente de IA |

## Regra de ouro

A `spec/` só vale enquanto for verdade. Toda tarefa que mude algo que a `spec/` descreve deve atualizar a `spec/` no mesmo commit. O hook `commit-msg` cobra isso; o escape é `Spec-OK: <motivo>`.

## Tabela Rosetta

| No mercado | Aqui | Por quê |
|---|---|---|
| `constitution.md` | `regras.md` + `convencoes.md` | Regra inviolável e preferência de estilo têm peso diferente |
| `/specify` → `spec.md` | SPECIFY → `spec/features/<nome>.md` | Igual |
| `/clarify` | Suposição e pergunta em aberto obrigatórias no SPECIFY | Perguntar é parte de especificar |
| `/plan`, `/tasks`, `/implement` | PLAN, TASKS, IMPLEMENT | Igual |
| `/analyze` | skill `spec-analyze` | Igual, mais as checagens contra o código vivo |
| Profundidade fixa | `roteamento.md` | O padrão roda as quatro fases sempre. Aqui a tarefa escolhe |
| Sem doc persistente do sistema | `produto.md`, `glossario.md`, `estado.md` | O Spec Kit é por feature e esquece o todo |
| `AGENTS.md` | `CLAUDE.md`, com `AGENTS.md` como symlink | Um conteúdo, dois nomes. Cada runtime acha o nome que procura |

## Como ativar a trava do commit

```bash
git config core.hooksPath spec/_fontes/hooks
```

A `spec/` é versionada neste projeto; o `pre-commit` bloqueia `.claude/`, `.opencode/`, `CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `opencode.json` e `docs/plans/` (se não versionado), mas permite `spec/`.
