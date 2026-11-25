# Roteamento: profundidade, executor e custo

> Como decidir, ao receber uma tarefa, quanto processo ela merece e qual modelo executa.
> Uma decisão só: a profundidade do pipeline e o peso do executor saem do mesmo sinal.

---

## Princípio

**O que o modelo leve pode fazer, ele faz; o que o médio pode fazer, vai para o médio.** O texto e o porquê estão em `regras.md` (R-006); aqui fica o degrau de cada trabalho.

Usar sempre o menor modelo que resolva e o menor número de fases que evite retrabalho. O critério é **raciocínio residual**: quanto ainda precisa ser decidido durante a execução, não o tamanho aparente da tarefa.

---

## Tabela de decisão

### Quantas fases

| Sinal objetivo | Fases |
|---|---|
| 1 arquivo conhecido, menos de 30 linhas, já existe similar, não altera contrato | SPECIFY + IMPLEMENT |
| 1 a 3 arquivos conhecidos, padrão conhecido com template, contrato inalterado | SPECIFY + TASKS + IMPLEMENT |
| Mais de 3 arquivos, ou toca `regras.md`, ou muda contrato de sincronização/operação, ou debug não óbvio | SPECIFY + PLAN + TASKS + IMPLEMENT |
| Muda direção do produto, ou invalida algo que a `spec/` afirma | Tudo, mais atualização da `spec/` com aprovação |

### Quem executa

| Trabalho | Claude Code | opencode |
|---|---|---|
| Levantamento: onde se usa X, listar, contar, ler arquivos para extrair fatos, conferir inventário | subagente `levantamento` (claude-fable-5) | `explore` (gpt-4o), declarado no `opencode.json` |
| Já desenhado: o prompt diz o que escrever (caminhos, template, assinatura ou passos) e o comando de verificação, em qualquer número de arquivos | subagente `mecanico` (claude-fable-5) | subagente `mecanico` (gpt-4o-mini) |
| Resta decisão local, nomeada em `Decidir:`: adaptar padrão a caso novo, debug de sincronização, escolher abordagem de UI | subagente `pleno` (claude-opus-5) | subagente `pleno` (gpt-4o) |
| Decidir: plano, arquitetura, regras invioláveis, editar a `spec/`, conversar com o usuário | principal (forte) | subagente `pleno` (gpt-4o) |
| Revisão pós-implementação (tarefas de 3/4 fases) | subagente `review` (claude-fable-5) | subagente `review` (gpt-4o) |

A sessão do opencode é o degrau médio: executa o trabalho padrão, desce ao `mecanico` no que é fechado e sobe ao `pleno` no que exige julgamento. No Claude Code a sessão é o degrau forte e delega para baixo.

**O degrau sai do que resta decidir, não do tamanho.** Tarefa que a sessão já desenhou é do `mecanico`, em um arquivo ou em cinco.

**Nunca os embutidos `Explore`, `Plan`, `general-purpose` e `claude`:** herdam o modelo da sessão e estão negados no `settings.json`.

**Fica na sessão principal só o que nenhum degrau abaixo resolve**, mais o caso de edição de uma ou duas linhas já localizada.

### Nomes reais

| Papel | Runtime A (`.claude/agents/`) | Runtime B (`.opencode/agents/`) |
|---|---|---|
| Levantamento | `levantamento`, em `claude-fable-5` | `explore`, em `gpt-4o`, declarado no `opencode.json` |
| Executor mecânico | `mecanico`, em `claude-fable-5` | `mecanico`, em `gpt-4o-mini` |
| Executor pleno | `pleno`, em `claude-opus-5` | `pleno`, em `gpt-4o` |
| Revisor | `review`, em `claude-fable-5` | `review`, em `gpt-4o` |
| Sessão | principal (forte) | `opencode.json`, em `gpt-4o` |

**Sinais específicos deste projeto que sobem para o tier pleno:**

- mudança no formato das operações de sincronização;
- mudança na estrutura das abas (`CABECALHOS`) ou na regra de migração;
- comportamento do instalador/atuador público (`instalador/`);
- tarefa que dependa de lacuna aberta em `spec/estado.md`.

---

## As quatro fases

| Fase | Obrigatória? | Entrega |
|---|---|---|
| **SPECIFY** | Sempre | O que muda, o que fica fora de escopo, qual comportamento observável prova que funcionou |
| **PLAN** | Opcional | Arquitetura, análise de reuso, componentes e interfaces |
| **TASKS** | Opcional | Grafo em `spec/features/<nome>.md` |
| **IMPLEMENT** | Sempre | Implementar, verificar, revisar quando aplicável, 1 commit atômico por tarefa |

---

## Regra de 1 strike

Se o modelo leve exigir mais de uma correção ou mais de um re-prompt, abortar e subir de tier. Nunca trocar de modelo no meio da execução, exceto em loop de erro óbvio.

---

## Delegação a subagente

Decisão por custo; a fonte é o campo `executor:` da tarefa no grafo. Sem grafo, vale a linha final `Executor:` do plano. Executa o **tier mais barato** compatível.

**Todo executor tem teto de turnos**, no frontmatter do agente. Worker que bate no teto devolve trabalho parcial e isso conta como falha da regra de 1 strike.

**O prompt do subagente é autossuficiente:** caminhos completos, template de referência, comando de verificação, e o que está **fora** de escopo.

**O retorno é curto e conferível:** tabela PASS/FAIL ou lista `arquivo:linha`, nunca saída bruta nem dado sensível.

---

## Calibração

Registrar só descalibração real: o modelo leve falhou e precisou de retry no pleno, ou o caro rodou 100% mecânico.

### Registros

(vazio)
