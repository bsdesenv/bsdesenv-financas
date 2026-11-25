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
| Levantamento: onde se usa X, listar, contar, ler arquivos para extrair fatos, conferir inventário | subagente `levantamento` (haiku) | `explore` (deepseek-v4.1-flash), declarado no `opencode.json` |
| Já desenhado: o prompt diz o que escrever (caminhos, template, assinatura ou passos) e o comando de verificação, em qualquer número de arquivos | subagente `mecanico` (haiku) | subagente `mecanico` (deepseek-v4.1-flash) |
| Resta decisão local, nomeada em `Decidir:`: adaptar padrão a caso novo, debug de sincronização, escolher abordagem de UI | subagente `pleno` (sonnet) | subagente `pleno` (glm-5.3) |
| Decidir: plano, arquitetura, regras invioláveis, editar a `spec/`, conversar com o usuário | principal (forte) | subagente `pleno` (glm-5.3) |
| Revisão pós-implementação (tarefas de 3/4 fases) | subagente `review` (haiku) | subagente `review` (deepseek-v4.1-flash) |

A sessão do opencode é o degrau médio: executa o trabalho padrão, desce ao `mecanico` no que é fechado e sobe ao `pleno` no que exige julgamento. No Claude Code a sessão é o degrau forte e delega para baixo.

**O degrau sai do que resta decidir, não do tamanho.** Tarefa que a sessão já desenhou é do `mecanico`, em um arquivo ou em cinco.

**Nunca os embutidos `Explore`, `Plan`, `general-purpose` e `claude`:** herdam o modelo da sessão e estão negados no `settings.json`.

**Fica na sessão principal só o que nenhum degrau abaixo resolve**, mais o caso de edição de uma ou duas linhas já localizada.

**O parecer de consumo é do `pleno`, pela skill `consumo`**, embora seja parecer: a entrada é a saída agregada do `medir-consumo.py` (uns 3 KB), o juízo fica restrito ao ambiente de IA e o `aviso-consumo` o lança em segundo plano. A sessão principal resume o resultado ao usuário em até três linhas e leva as melhorias à aprovação.

### Nomes reais

| Papel | Runtime A (`.claude/agents/`) | Runtime B (`.opencode/agents/`) |
|---|---|---|
| Levantamento | `levantamento`, em `haiku` | `explore`, em `deepseek-v4.1-flash`, declarado no `opencode.json` |
| Executor mecânico | `mecanico`, em `haiku` | `mecanico`, em `deepseek-v4.1-flash` |
| Executor pleno | `pleno`, em `sonnet` | `pleno`, em `glm-5.3` |
| Revisor | `review`, em `haiku` | `review`, em `deepseek-v4.1-flash` |
| Sessão | principal (forte) | `opencode.json`, em `deepseek-v4.1-flash` |

**Sinais específicos deste projeto que sobem para o tier pleno:**

- mudança no formato das operações de sincronização;
- mudança na estrutura das abas (`CABECALHOS`) ou na regra de migração;
- comportamento do instalador/atuador público (`instalador/`);
- tarefa que dependa de lacuna aberta em `spec/estado.md`.

**Esforço de raciocínio.** A sessão principal roda em `high`, pelo `effortLevel` e pelo `modelSettings` do `~/.claude/settings.json`, configurados uma vez por máquina. Plano, arquitetura e debug não óbvio pedem `xhigh`: `/effort xhigh` no começo da sessão e `/effort high` depois, porque trocar no meio regrava o cache uma vez. Quando a tarefa é dessas, a sessão principal sugere o `/effort xhigh` em uma linha antes de começar. Retrabalho que o esforço explicaria (correção do usuário, achado do `review`, regra de 1 strike) devolve o `xhigh` como padrão. O teto do dia a dia é `xhigh`. `max` só quando o usuário escolhe, para uma sessão inteira de decisão de rumo, com `/effort high` ao fim dela: no projeto de origem, 205 chamadas em `max` foram um terço do gasto de 14 dias, a quase 10 vezes o raciocínio do `xhigh` por chamada (medição de 07/11/2026). O rodapé mostra o esforço da sessão, com o `max` em vermelho, porque quem o liga é o usuário e o modelo não vê o próprio esforço.

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

**Paralelo quando não se esperam, com ou sem grafo:** levantamentos independentes saem no mesmo turno, um por pergunta, e edições sem arquivo em comum, um subagente por arquivo ou por camada. Leitura é onde o paralelo mais rende, porque não escreve e não conflita. Com grafo, a ordem é a das ondas.

**Todo executor tem teto de turnos**, no frontmatter do agente. Worker que bate no teto devolve trabalho parcial e isso conta como falha da regra de 1 strike.

**O prompt do subagente é autossuficiente:** caminhos completos, template de referência, comando de verificação, e o que está **fora** de escopo.

**O retorno é curto e conferível:** tabela PASS/FAIL ou lista `arquivo:linha`, nunca saída bruta nem dado sensível.

---

## Paralelismo seguro

O grafo da feature é a fonte, e `sh spec/_fontes/verificar-plano.sh` prova antes de gastar token: sem ciclo, sem arquivo com dois donos, sem consumidor antes do contrato, sem AC órfão. O validador calcula as ondas; a sessão não improvisa a ordem.

**A onda 1 começa inteira, no mesmo turno, até o `limite`.** O limite é a capacidade de revisão e integração, não uma meta de agentes. Onda 1 com uma tarefa só é permitida, mas exige `motivo_serial:`; sem motivo, o validador reprova. A fila acima do limite é impressa em lotes: o segundo lote só começa quando o primeiro foi integrado e verificado.

**Dependência sem rastro é suspeita.** Se duas tarefas não compartilham arquivo nem contrato, o validador exige `motivo_depende` antes de aceitar a aresta. É o que impede uma cadeia artificial de transformar em série o que começaria junto.

**A execução da onda é a da skill `spec`, seção "Executar uma onda":** uma tarefa por worker, sem commit, integração e verificação combinada uma vez, commit por tarefa, falha que para a onda. Aqui fica o porquê. Rodar a suíte inteira em cada worker multiplica o custo sem achar mais nada. Contrato que precisa mudar no meio da onda vira tarefa do dono e revalida o grafo antes de os consumidores voltarem. E a dependência só existe quando a tarefa anterior está integrada, verificada e commitada: começar antes porque ela "parece pronta" é como o conflito semântico nasce.

**Worktree não é pré-requisito, e não substitui o grafo.** Sem ele, o dono de arquivo e a integração serial isolam a escrita, mas não a verificação: na mesma árvore, cada worker vê o arquivo pela metade do vizinho. Por isso o `verifica` da tarefa roda só no que ela escreve, e o que varre o projeto inteiro (`tsc` sem arquivo, build, suíte) fica para o gate da onda; senão a falha é do vizinho, e a regra de 1 strike sobe de tier à toa. E no Claude Code o `isolation: worktree` do subagente nasce do branch padrão, não do `HEAD` da sessão: o worker da onda 2 não veria o que a onda 1 commitou. Por isso o fluxo do grafo usa a árvore compartilhada. O que worktree não isola é a intenção: dois agentes com merge textual limpo ainda podem remover o extension point um do outro. Por isso o contrato e a onda vêm antes da ferramenta.

**Paralelizar custa contexto.** Cada worker começa um contexto próprio e relê o que precisa; N workers custam mais tokens que um agente serial, e o ganho é latência e isolamento, não economia. Medido fora daqui: multiagente gasta cerca de 15 vezes os tokens de um chat, contra 4 de um agente só, e a Anthropic registra que código tem menos tarefa de fato paralelizável que pesquisa; no CooperBench, dois agentes no mesmo repositório acertam cerca de 30% menos que um fazendo as duas partes, e a falha é de expectativa e de compromisso, não de merge. Só vale quando as tarefas são de fato independentes, o contexto de cada uma é curto e a revisão absorve a onda. Se o grafo não tem largura real, o caminho certo é serial, e o `motivo_serial` diz isso em uma linha.

---

## Economia de contexto e de output

A tabela do que fazer e do que não fazer é do `CLAUDE.md`, que carrega sempre, e **não se repete aqui**: duas cópias divergem, e a desatualizada é sempre a que está sendo lida.

O que este arquivo acrescenta: **o custo de leitura entra na conta da profundidade.** Tarefa trivial que lê `produto.md` inteiro já gastou mais que a própria correção. Quem decide a profundidade decide junto quanto da `spec/` vai ser aberto, e a escala de leitura está na skill `spec`, seção "Antes de qualquer coisa". No grafo, o mesmo princípio vira o campo `contexto:`: o worker lê o que está ali, não o repositório.

**Onda não é de graça.** O custo de uma onda é a soma dos contextos dos workers mais a integração; a economia vem de contexto curto e de não reler o que já foi decidido, não do número de agentes. Medir o custo da primeira onda antes de escalar o limite.

E o segundo custo, que é maior e não aparece aqui: **quantas idas ao servidor a tarefa vai gastar.** O contexto é relido inteiro a cada chamada, então uma tarefa resolvida em 40 chamadas num contexto de 200k custa mais que a mesma tarefa em 15. Delegar não é só usar modelo leve: é tirar as idas do contexto grande e pô-las num contexto próprio, que começa vazio. Medir com `python3 .claude/medir-consumo.py`, e registrar aqui embaixo quando a conta surpreender.

---

## Calibração

Registrar só descalibração real: o modelo leve falhou e precisou de retry no pleno, ou o caro rodou 100% mecânico.

### Registros

(vazio)
