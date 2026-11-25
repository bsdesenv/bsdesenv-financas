# Regras invioláveis

> O que **não** pode ser violado, e o porquê. Violar isso quebra produção, vaza dado ou some com dado.
> Se uma tarefa exigir violar algo daqui, PARE e pergunte. Não decida sozinho.

Só entra aqui o que tem consequência grave e irreversível. Preferência de estilo não é regra inviolável: isso vai para `convencoes.md`.

---

## R-001 — A planilha é a fonte da verdade; nunca envie a base inteira

O app envia operações (`salvar`, `apagar`, `importar` etc.) e o servidor as aplica na planilha atual. O app nunca recebe nem envia a base completa como JSON de substituição.

**Por quê:** enviar a base inteira para substituir o que está na planilha apagaria trabalho feito em outro dispositivo. A sincronização por operações é o que permite celular e computador coexistirem.

**Como fazer em vez disso:** adicione uma operação ao vetor `ops` em `sincronizar(revisaoCliente, opsTexto)`. Se precisar de um novo tipo de operação, defina-o em `aplicarOp_`, mantendo a semântica de aplicação sobre o modelo lido do disco.

---

## R-002 — Não alargue o escopo de permissão do Apps Script

O `appsscript.json` usa `@OnlyCurrentDoc` e o escopo `spreadsheets.currentonly`. Não mude para escopo de todas as planilhas do usuário nem adicione escopos desnecessários.

**Por quê:** o app é vendido como "só lê a sua planilha". Alargar a permissão quebra a promessa de privacidade e assusta o usuário na instalação.

**Como fazer em vez disso:** se uma feature precisar de escopo novo, discuta com o usuário e atualize `docs/SEGURANCA.md` e a mensagem de autorização.

---

## R-003 — Use o lock no `sincronizar` e respeite o limite de operações

`LockService.getScriptLock()` envolve a aplicação das operações. `MAX_OPS` é 500.

**Por quê:** sem lock, duas abas/aparelhos escrevem ao mesmo tempo e perdem dados. Sem limite, uma requisição enorme pode estourar tempo ou quota do Apps Script.

**Como fazer em vez disso:** mantenha `sincronizar` idempotente por revisão; rejeite operações em lote acima do limite com mensagem clara.

---

## R-004 — Atualizações preservam os dados e o formato da versão 1

O formato das abas (`lancamentos`, `categorias`, `orcamento`, `config`) é o mesmo desde a versão 1.0. Uma atualização de código não pode exigir migração manual dos dados.

**Por quê:** usuários têm anos de dados na planilha. Perder ou exigir reformatar é inaceitável.

**Como fazer em vez disso:** novos campos entram como novas colunas ou novas chaves em `config`; código antigo ignora o que não entende. Se migração for inevitável, ela é feita pelo instalador, com backup.

---

## R-005 — Não coloque dado pessoal, real ou de exemplo identificável no repositório

Nenhum nome, e-mail, valor real, id de planilha, chave de API ou caminho pessoal entra em commit, issue, teste ou documentação versionada. Os testes usam mocks e fixtures.

**Por quê:** o repositório é público. Dado pessoal vazado não se recolhe.

**Como fazer em vez disso:** use `exemplos/` e `testes/fixtures` com dados fictícios. Caminhos absolutos e chaves ficam em variáveis de ambiente ou configuração local, nunca no git.

---

## R-006 — A sessão decide, o degrau barato executa

Use o subagente certo para cada tipo de trabalho (`mecanico` para edição já desenhada, `pleno` para decisão local, `levantamento`/`explore` para busca). Os subagentes embutidos (`Explore`, `Plan`, `general-purpose`, `claude`) estão negados no `settings.json`.

**Por quê:** reler o contexto grande a cada chamada é o maior custo. Delegar para um contexto novo e curto economiza sem perder qualidade nas tarefas fechadas.

**Como fazer em vez disso:** siga `spec/roteamento.md`. Quando o prompt já tiver caminhos, template e comando de verificação, desça ao `mecanico`. Quando restar decisão, nomeie-a no campo `Decidir:` e use o `pleno`.

---

## R-007 — Arquivos intocáveis

Não abra, leia nem escreva em:

- `.env*` (não versionados, podem conter segredos locais)
- `node_modules/`, `.git/`
- arquivos de lock (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- dados pessoais fora de mocks (`dados-financeiro*.json`, `*.zip`, `_privado/`)
- build/cache gerados (`testes/saida/`)

O `safety-net.sh` estende essa lista ao Bash e ao opencode, inclusive ao `git grep` com pathspec que alcança arquivo rastreado da lista.

**Por quê:** leitura acidental de segredo vaza para o contexto do modelo; escrita acidental em lock corrige a árvore de dependências sem aprovação.

---

## R-008 — Não execute comandos destrutivos contra a planilha de produção

Proibido: apagar abas (`SpreadsheetApp.deleteSheet`), limpar colunas inteiiras, remover linhas em massa fora do fluxo de operações, `TRUNCATE`, `DROP` ou equivalente manual.

**Por quê:** a planilha é o banco de produção do usuário. Uma operação em massa irreversível some com anos de dados.

**Como fazer em vez disso:** todo dado novo ou removido passa por uma operação no vetor `ops` de `sincronizar`, com revisão e lock. Limpeza legítima é do usuário, à mão, na planilha dele.

---

## R-009 — Trava sem fixture não é trava

Toda nova regra de bloqueio entra no `safety-net.sh` com fixture em `.claude/hooks/safety-net.fixtures.txt`, e os dois harnesses (`safety-net.test.sh` e `safety-net.test.mjs`) têm de sair com zero falhas. O mesmo vale para verificadores estáticos (`spec/_fontes/verificar-*.sh`) e para o portão de entrega.

**Por quê:** regra que não dispara é pior que regra ausente, porque parece cobertura. Fixture que só testa o que pega vira alarme falso.

**Como fazer em vez disso:** escreva `reprova-*` e `passa-*` para cada nova régua; rode `sh spec/_fontes/verificar.test.sh` antes de declarar pronto.
