# Feature: <título legível>

> status: rascunho | pronta | em-implementacao | implementada
> Valor exato, um dos quatro, sem grafia variante, data nem ressalva no campo: a régua e o índice
> leem o primeiro token. Ressalva vai numa linha `> Nota:` logo abaixo, ou no corpo da feature.
> Um arquivo por feature, em `spec/features/<nome-em-kebab>.md`.
> `US-`, `AC-`, `ASM-` e `T-` são globais e únicos no projeto inteiro, não por arquivo.
> Pergunta é a exceção: `Q-` mora em `spec/estado.md` e a feature só a **cita**; pergunta que
> só existe dentro desta entrega é `QF-`, numerada de `QF-001` neste arquivo.

## Contexto

<Por que esta feature existe. O problema, não a solução.>

## Fora de escopo

<O que explicitamente NÃO entra. Esta seção é o antídoto contra scope creep e não pode ficar vazia: se não houver nada, escrever por quê.>

---

## Histórias

### US-001 — <Título curto>

Como `<perfil>`, quero `<ação>`, para que `<benefício>`.

#### AC-001 — <Título do critério>

- **Dado** <estado inicial verificável>
- **Quando** <ação do usuário>
- **Então** <resultado que o usuário vê>
- **E** <resultado adicional, se houver>

#### AC-002 — <Título>

- **Dado** ...
- **Quando** ...
- **Então** ...

---

## Regras de escrita dos critérios

Apagar esta seção ao preencher a feature.

- **Observável.** "O sistema deve ser rápido" não serve. "A resposta chega em menos de 300ms" serve.
- **Do ponto de vista de quem usa.** Preferir "a tela mostra acesso negado" a "o endpoint devolve 403". A regra técnica entra em `## Notas técnicas`, não no critério.
- **Dado, Quando e Então, os três.** Critério sem os três está incompleto e não dá para verificar.
- **Um critério, um comportamento.** Se precisar de "e também", provavelmente são dois critérios.

---

## Notas técnicas

<Arquivos que serão tocados, endpoints, decisão de arquitetura. Só se a feature exigir a fase PLAN.>

---

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | | aberta | |

Feature não pode ser marcada `implementada` com suposição aberta. Se realmente não houver nenhuma, escrever "nenhuma" e desconfiar: quase toda feature tem pelo menos uma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| QF-001 | | aberta | |

---

## Grafo de execução

Só se a feature exigir a fase TASKS. O grafo é a fonte executável das tarefas; o plano não repete
a lista. Uma tarefa continua sendo um entregável, com um commit.

Ao preencher a feature, fica só o título da seção e o bloco `plano`: as regras, o exemplo, as
tabelas e o resto desta seção são do template e saem.

Regras que o grafo precisa cumprir:

- **Contrato primeiro.** Se duas tarefas compartilham uma interface, o tipo, o schema ou o
  endpoint nasce numa tarefa da onda 1. O consumidor depende dela e só lê o contrato.
- **Um dono por arquivo.** `escreve:` lista caminhos exatos, ou uma pasta com `/` no fim. Dois
  donos só convivem se um depender do outro. Não use glob para "reservar" uma área.
- **Um dono por contrato.** `possui:` é de uma tarefa só; `le:` é de quem consome. Contrato que já
  existe fora do plano entra como `@Nome` e não tem dono aqui.
- **Paralelismo é o default da onda 1.** O grafo começa com o maior número de tarefas
  independentes que caibam no `limite` e na revisão. Se a onda 1 tiver uma tarefa só num grafo
  de várias, escreva `motivo_serial:` dizendo por quê.
- **Dependência é de dado ou de contrato, não de arquivo.** "Vai ficar mais fácil depois" não é
  dependência; é preferência, e serializa o que podia rodar junto. Dependência de dado que não
  deixa rastro em arquivo nem em contrato declara `motivo_depende:`; sem isso o validador reprova.
- **Contexto é orçamento.** `contexto:` lista só o que o executor precisa ler para começar. O
  resto ele busca por `grep`/`sed`, não relê o repositório. Arquivo que outra tarefa da mesma onda
  escreve não entra: chegaria pela metade, ou velho.
- **Prova é observável.** `prova:` é o resultado que se vê; `verifica:` é o comando que sai 0.
  "Funciona" não é prova. "O 101º pedido recebe 429" é. `verifica` roda só no que a tarefa
  escreve (o teste filtrado, o lint dos arquivos dela): na onda, o vizinho está com arquivo pela
  metade, e o que varre o projeto inteiro fica para o gate.
- **Tamanho.** 2 a 5 minutos por tarefa. Tarefa que não cabe vira duas; tarefa que só faz sentido
  junto com a vizinha não vira tarefa.

O exemplo abaixo é só formato: o `limite: <n>` e o texto entre `<...>` são de propósito, para o
validador recusar o bloco copiado sem preencher. Troque o exemplo inteiro pela feature real.

````markdown
```plano
limite: <n>
justificativa: <por que esse limite, com o número de tarefas e o gargalo>

### T-001 — Congelar o contrato [pendente]
- refs: AC-001
- depende: -
- escreve: src/types/pedido.ts
- possui: ContratoPedido
- le: -
- contexto: -
- prova: o tipo exporta os campos que a tela e a API usam
- verifica: npx tsc --noEmit src/types/pedido.ts
- executor: mecanico

### T-002 — Implementar o limite [pendente]
- refs: AC-001, AC-002
- depende: T-001
- escreve: src/pedidos/limite.ts, src/pedidos/limite.test.ts
- possui: -
- le: ContratoPedido
- contexto: src/types/pedido.ts
- prova: o 101º pedido da janela recebe 429
- verifica: npm test -- limite
- executor: pleno
- decidir: a janela do limite e onde guardar o contador

### T-003 — Aviso na tela [pendente]
- refs: AC-002
- depende: -
- escreve: src/ui/aviso.ts
- possui: -
- le: @ContratoTela
- contexto: -
- prova: a tela mostra o aviso quando o limite é atingido
- verifica: npm test -- aviso
- executor: mecanico
```
````

Campos do cabeçalho:

| Campo | O que é |
|---|---|
| `limite` | Quantos agentes podem rodar ao mesmo tempo na onda. Não é meta: é o que a revisão absorve. Acima de 8 o validador avisa |
| `justificativa` | Por que esse limite, e não outro. Uma linha, com o número de tarefas e o gargalo |
| `parada` | Opcional. Só quando a feature para por algo além da regra geral, que já está na skill `spec` (onda vermelha, segunda falha, contrato alterado) e no teto de turnos do agente |
| `motivo_serial` | Obrigatório só quando a onda 1 tem uma tarefa e o grafo tem mais de uma. Diz o que impede as outras de começarem juntas |

Campos da tarefa:

| Campo | O que é |
|---|---|
| `refs` | `US-`/`AC-` que a tarefa entrega. Todo AC do corpo precisa aparecer em alguma tarefa |
| `depende` | IDs de tarefas que precisam terminar antes. `-` quando não há |
| `escreve` | Arquivos, ou pasta com `/` no fim, que só esta tarefa edita. Nada de glob |
| `possui` | Contrato que esta tarefa define e ninguém mais edita. `-` quando não há |
| `le` | Contrato consumido, ou `@Nome` para contrato externo ao plano. `-` quando não há |
| `contexto` | O mínimo que o executor lê para começar. `-` quando a tarefa é autoexplicativa |
| `prova` | Evidência observável de que o AC foi cumprido |
| `verifica` | Comando que sai 0 e prova a tarefa |
| `decidir` | Obrigatório quando o `executor` não é `mecanico` e a tarefa não está concluída: a decisão que fica com o executor, em uma linha. Vai no prompt do `pleno` como `Decidir:`. Sem decisão para nomear, a tarefa já está desenhada e é do `mecanico`, em quantos arquivos for |
| `motivo_depende` | Só quando a dependência é de dado ou de ordem, sem contrato nem arquivo em comum. Uma linha com o motivo |
| `executor` | O degrau que escreve: `mecanico` por padrão, `pleno` ou `sessao` (ou `sessão`, `principal`) quando resta decisão. `navegador`, `levantamento` e `explore` só leem e são recusados: roteiro de tela é do gate da onda, levantamento é do PLAN |

Status possíveis: `pendente`, `em-andamento`, `concluida` (sem acento).

O validador lê o bloco e confere o grafo antes de qualquer agente começar:

```sh
sh spec/_fontes/verificar-plano.sh spec/features/<nome>.md
```

Ele reprova ciclo, dependência inexistente, arquivo ou contrato com dois donos, consumidor antes
do dono, dependência sem contrato/arquivo e sem `motivo_depende`, AC sem tarefa, campo obrigatório
faltando, `escreve` vazio, executor que só lê, executor acima do `mecanico` sem `decidir`, `contexto` que a mesma onda escreve e placeholder
no cabeçalho. Com a feature em curso, a linha `retomar` diz a onda e as tarefas de onde seguir.

Aprovar não é executar: a quebra continua sendo recomendação, e o usuário decide se roda em
paralelo e quais tarefas.
