# Feature: Instalador e atualizador modernos

> status: em-implementacao
> Plano de origem: `docs/plans/261126-instalador-e-atualizador-ux.md`. Decisões tomadas na execução: Q1 progresso real, Q2 com QR code, Q3 com "voltar atrás", Q4 com página "Antes de começar" (ligar o GitHub Pages fica com o usuário).

## Contexto

Instalar o Finanças passa por dois avisos do Google, uma chave a ligar e uma espera, mas o instalador mostra um cartão por vez, sem dizer o caminho, sem progresso real e sem saída clara quando falha. No app, o cartão de Atualizações tem três botões de mesmo peso, o app não percebe que já foi atualizado e a atualização à mão não avisa que precisa de computador. Tudo isso é usado no PC e no celular.

## Fora de escopo

- Verificação do app OAuth pelo Google (tirar o aviso "não verificado" e o teto de 100 usuários).
- Publicar o instalador central na conta bsdesenvmidia e ligar o GitHub Pages: são passos do usuário, depois do merge.
- Mudar escopos do instalador ou do app (R-002). Voltar atrás usa `script.projects` e `script.deployments`, que o instalador já tem.
- Migração de dados (R-004): nada muda nas abas.
- Instalação à mão (`docs/INSTALAR.md`, seção à mão) continua como está, salvo o link.

---

## Histórias

### US-010 — Instalar guiado

Como `usuário` que instala pela primeira vez, quero ver o caminho inteiro e o progresso real, para não desistir no meio nem ficar sem saber o que aconteceu.

#### AC-025 — Trilha de passos

- **Dado** o instalador aberto sem autorização
- **Quando** a página carrega
- **Então** mostra "Passo 1 de 4" e os quatro passos (Autorizar, Ligar a API, Escolher o nome, Instalar), com o atual marcado
- **E** em 390 px a ação principal fica fixa embaixo; em 1440 px a trilha fica numa coluna à esquerda

#### AC-026 — Confere sozinho ao voltar

- **Dado** o passo "Ligar a API" aberto
- **Quando** a pessoa volta para a aba (evento `visibilitychange` ou `focus`) e a API já está ligada
- **Então** a página avança para "Escolher o nome" sem clicar em "Já liguei"

#### AC-027 — O que será criado

- **Dado** o passo "Escolher o nome"
- **Quando** a pessoa digita o nome
- **Então** o painel "O que será criado" mostra a planilha com esse nome, o projeto vinculado e a publicação do app

#### AC-028 — Progresso real

- **Dado** o clique em Instalar
- **Quando** cada etapa do servidor termina (conferir o código, criar a planilha, enviar o código, publicar)
- **Então** a etapa ganha ✓ e a seguinte fica "em andamento", e a barra avança uma etapa

#### AC-029 — Erro que diz o que fazer

- **Dado** uma etapa que falha
- **Quando** o servidor devolve o erro
- **Então** a tela mostra em qual etapa parou, o que foi desfeito, "Tentar de novo", "Instalar à mão" e o detalhe técnico com botão de copiar

#### AC-030 — Levar para o celular

- **Dado** a instalação concluída
- **Quando** a tela de sucesso aparece no PC (`pointer: fine`)
- **Então** mostra o QR code do endereço do app, gerado na página, e "Copiar endereço"
- **E** no celular (`pointer: coarse`) mostra como pôr na tela inicial no iPhone e no Android, sem QR
- **E** nos dois, avisa que o Google vai mostrar o aviso do app, "o desenvolvedor é você"

### US-011 — Atualizar pelo instalador

Como `usuário` que atualiza, quero confirmar o alvo, ver o progresso e poder voltar atrás, para atualizar sem medo.

#### AC-031 — Confirmar o alvo

- **Dado** o instalador aberto pelo app com `?script=` e uma versão nova publicada
- **Quando** a página carrega
- **Então** mostra o nome do projeto, "versão atual → nova", as novidades e a lista do que fica (seus dados, o endereço do app, arquivos seus)

#### AC-032 — Progresso real da atualização

- **Dado** o clique em Atualizar
- **Quando** cada etapa termina (conferir o código, guardar a cópia, trocar o código, publicar)
- **Então** a etapa ganha ✓, como na instalação

#### AC-033 — Voltar atrás em um clique

- **Dado** uma atualização concluída, ou o instalador aberto num projeto que tem cópia de segurança
- **Quando** a pessoa clica em "Voltar para a versão anterior" e confirma
- **Então** o código e a publicação voltam à cópia, o endereço do app continua o mesmo
- **E** a tela seguinte oferece atualizar de novo para a versão publicada

### US-012 — Atualizações no app

Como `usuário`, quero saber da versão nova sem ser interrompido e ver o app perceber a atualização, para não ficar recarregando no escuro.

#### AC-034 — Cartão com uma ação principal

- **Dado** Ajustes › Atualizações com versão nova
- **Quando** a seção abre
- **Então** há um selo de estado, as novidades e um só botão principal "Atualizar para X"
- **E** "Atualizar à mão…" e "Verificar agora" ficam num bloco "Outras formas" recolhido, e o texto de privacidade em "Sobre e privacidade", recolhido

#### AC-035 — Aviso discreto uma vez por versão

- **Dado** versão nova detectada
- **Quando** a pessoa abre a Visão geral
- **Então** aparece a faixa "Versão X disponível · Ver novidades · ✕"
- **E** depois de fechada, não volta para a mesma versão, nem ao recarregar

#### AC-036 — O app percebe a atualização

- **Dado** a pessoa clicou em "Atualizar para X" e o instalador publicou a versão nova
- **Quando** ela volta para a aba do app
- **Então** o app mostra "Atualizado para X" com o botão "Recarregar"

#### AC-037 — O que mudou, uma vez

- **Dado** o app recarregado numa versão maior que a última vista neste navegador
- **Quando** a tela abre
- **Então** aparece uma vez a folha "O que mudou na X", com as novidades
- **E** na primeira abertura de todas (sem versão vista) não aparece

#### AC-038 — À mão no celular

- **Dado** a folha "Atualizar à mão" aberta num aparelho de toque (`pointer: coarse`)
- **Quando** a folha monta
- **Então** avisa no topo que precisa de um computador e oferece copiar o link do editor
- **E** em qualquer aparelho, o passo dos arquivos mostra "n de m copiados"

### US-013 — Antes de começar

Como `pessoa` que ainda não instalou, quero saber o que vai aparecer antes de clicar, para não me assustar com o aviso do Google.

#### AC-039 — Página de entrada

- **Dado** a página `docs/index.html` aberta num navegador, sem servidor
- **Quando** carrega em 320 px e em 1440 px
- **Então** mostra os selos (Grátis, Código aberto, Não lê seus dados, Código conferido), os quatro passos com uma ilustração cada, "uns 3 minutos", o botão "Começar a instalação" com o endereço do instalador, e o link "Prefere instalar à mão?"
- **E** não carrega nada de fora do próprio repositório (sem fonte, script ou imagem externos)

---

## Notas técnicas

**Contrato `ContratoEtapas` (`instalador/Codigo.gs`, funções públicas novas).** Cada uma valida os argumentos por padrão (`RE_ID_GOOGLE`, `RE_VERSAO`) antes de qualquer chamada, chama `exigirPreparo_()` e lança `Error` com texto para a pessoa.

| Função | Devolve | Escreve |
|---|---|---|
| `prepararInstalacao()` | `{ versao, arquivos }` (n de arquivos conferidos) | nada |
| `criarPlanilha(nome)` | `{ planilhaId, planilhaUrl, nome }` | a planilha |
| `criarProjeto(planilhaId, versao)` | `{ scriptId }` | projeto vinculado + código; falha → planilha na lixeira |
| `publicarApp(planilhaId, scriptId, versao)` | `{ versao, appUrl, planilhaUrl, editorUrl, scriptId }` | versão + implantação; falha → lixeira |
| `desfazerInstalacao(planilhaId)` | `{ limpou }` | planilha na lixeira |
| `prepararAtualizacao(scriptId, implantacaoId, versaoEsperada)` | `{ jaAtual, versaoAtual, versaoNova, arquivos }` | nada |
| `guardarCopia(scriptId, versaoNova)` | `{ copiaSeguranca }` | uma versão do estado atual |
| `trocarCodigo(scriptId, versaoNova)` | `{ extrasMantidos }` | conteúdo do projeto |
| `publicarAtualizacao(scriptId, implantacaoId, versaoNova)` | `{ versaoNova, implantacoes }` | versão + implantações apontadas |
| `voltarVersao(scriptId, implantacaoId, versaoNumero)` | `{ versaoAtual, implantacoes }` | conteúdo da cópia de volta + implantações apontadas para ela |

`instalar(opcoes)` e `atualizar(...)` continuam, agora encadeando as etapas, com o mesmo retorno. `estado()` ganha `alvo.copia = { numero, descricao }` (a versão mais recente com descrição "Cópia antes de atualizar…", ou `null`). Toda escrita de código baixado continua precedida da conferência SHA-256 da mesma versão, e `publicarAtualizacao` confere de novo o hash do código do projeto antes de publicar. A exceção é `voltarVersao`: ela não baixa nada, só repõe a cópia que o próprio projeto guardou antes de atualizar. `doGet` passa a incluir `instalador/Qr.html` e o favicon do app.

**Contrato `ContratoQr` (`instalador/Qr.html`).** Um `<script>` que define `window.qrMatriz(texto)` → `boolean[][]` (byte mode, correção M, versão mínima que caiba). Adaptado da biblioteca qrcodegen de Project Nayuki (MIT), com a licença no cabeçalho. Sem barra dupla fora de comentário (`testes/htmlservice.test.mjs`).

**Contrato `ContratoVersaoServidor` (`src/Codigo.gs`).** `versaoServidor()` → `VERSAO_APP`. Depois que o instalador repõe a implantação, uma página antiga que chama `google.script.run` já recebe a versão nova (ASM-012).

**Reuso.** Tokens visuais do `src/Estilos.html` (`--acento`, `--fonte`) copiados no instalador e na página de entrada. `abrirFolha`, `aviso`, `copiarTexto`, `atualizacaoNova`, `verificarAtualizacao` no app. `api_`, `baixarArquivos_`, `lerAlvo_`, `implantacoesWeb_` no instalador.

**Regras tocadas.** R-002: nenhum escopo novo. R-004: nada muda nas abas. R-005: testes só com mocks; o QR de teste usa um endereço fictício.

---

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-012 | Depois do PUT na implantação, `google.script.run` de uma página aberta antes já roda o código novo | aberta | conferir na instalação de teste depois de publicar |
| ASM-013 | `script.google.com/home/usersettings` abre no navegador do celular | aberta | conferir no celular; se não abrir, o passo pede computador |
| ASM-014 | Baixar e conferir os arquivos de novo em cada etapa de escrita cabe no tempo das chamadas do Apps Script | aberta | medir na instalação de teste |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| QF-001 | Ligar o GitHub Pages (pasta `docs/`) para publicar a página de entrada? | aberta | |

---

## Grafo de execução

```plano
limite: 4
justificativa: 10 tarefas; o gargalo é a revisão de 4 diffs de UI e de instalador por onda

### T-012 — Etapas do instalador e voltar atrás [concluida]
- refs: AC-028, AC-032, AC-033
- depende: -
- escreve: instalador/Codigo.gs, testes/instalador.test.mjs, testes/instalador-mock.mjs
- possui: ContratoEtapas
- le: -
- contexto: instalador/Codigo.gs, testes/instalador.test.mjs
- prova: os testes cobrem cada etapa no caminho feliz, a lixeira na falha de criarProjeto e publicarApp, e voltarVersao repondo conteúdo e implantação
- verifica: node --test testes/instalador.test.mjs
- executor: pleno
- decidir: baixar de novo ou reaproveitar os arquivos entre etapas, mantendo a conferência SHA-256 antes de toda escrita

### T-013 — Gerador de QR code [concluida]
- refs: AC-030
- depende: -
- escreve: instalador/Qr.html, testes/qr.test.mjs
- possui: ContratoQr
- le: -
- contexto: testes/htmlservice.test.mjs
- prova: qrMatriz de um endereço /exec de 110 caracteres devolve matriz com os três padrões de posição, faixa de tempo e bits de formato válidos
- verifica: node --test testes/qr.test.mjs testes/htmlservice.test.mjs
- executor: pleno
- decidir: como reduzir a qrcodegen ao modo byte e à correção M sem barra dupla fora de comentário

### T-014 — Cartão de Atualizações e folha à mão [concluida]
- refs: AC-034, AC-038
- depende: -
- escreve: src/App.html, src/Estilos.html
- possui: -
- le: -
- contexto: -
- prova: no preview, Ajustes › Atualizações com versão nova mostra um botão principal e os blocos recolhidos; a folha à mão em toque avisa do computador e conta n de m
- verifica: node --test testes/htmlservice.test.mjs
- executor: pleno
- decidir: o desenho do selo de estado e dos blocos recolhidos (details/summary ou botão) no PC e no celular

### T-015 — Página Antes de começar [concluida]
- refs: AC-039
- depende: -
- escreve: docs/index.html, docs/.nojekyll
- possui: -
- le: -
- contexto: instalador/Index.html, docs/INSTALAR.md
- prova: a página abre por file:// em 320 e 1440 px sem requisição externa e com o link do instalador
- verifica: test -s docs/index.html && ! grep -nE '(src|href)="https?:[^"]*\.(css|js|woff2?|png|svg)' docs/index.html
- executor: pleno
- decidir: o desenho das ilustrações dos quatro passos em HTML/CSS, sem imitar a marca do Google

### T-016 — Trilha de passos do instalador [concluida]
- refs: AC-025, AC-026, AC-027, AC-029
- depende: T-012, T-013
- escreve: instalador/Index.html, testes/preview-instalador.mjs
- possui: -
- le: ContratoEtapas, ContratoQr
- contexto: instalador/Index.html, testes/preview.mjs
- prova: o preview do instalador com cenário sem-api mostra "Passo 2 de 4"; ao disparar visibilitychange com a API ligada, avança para o nome
- verifica: node --test testes/htmlservice.test.mjs
- executor: pleno
- decidir: o mock de google.script.run por cenário no preview e o layout da trilha em 390 e 1440 px

### T-017 — Faixa, app percebe a atualização e O que mudou [concluida]
- refs: AC-035, AC-036, AC-037
- depende: T-014
- escreve: src/App.html, src/Estilos.html, src/Codigo.gs
- possui: ContratoVersaoServidor
- le: -
- motivo_depende: mesmo arquivo do cartão de Atualizações
- contexto: -
- prova: no preview, fechar a faixa e recarregar não a mostra de novo; com versaoServidor maior que a da página, ao voltar à aba aparece "Atualizado para X · Recarregar"
- verifica: npm test
- executor: pleno
- decidir: onde guardar versão vista e faixa fechada (localStorage por planilha) e quando consultar versaoServidor

### T-018 — Progresso, sucesso e atualizar no instalador [concluida]
- refs: AC-028, AC-029, AC-030, AC-031, AC-032, AC-033
- depende: T-016
- escreve: instalador/Index.html, testes/e2e-instalador.mjs
- possui: -
- le: ContratoEtapas, ContratoQr
- motivo_depende: mesmo arquivo da trilha
- contexto: testes/preview-instalador.mjs
- prova: o e2e do instalador cobre instalar com sucesso, falha em criarProjeto, sucesso com QR no PC e sem QR no celular, atualizar e voltar atrás
- verifica: CHROME_PATH=/usr/bin/google-chrome node testes/e2e-instalador.mjs
- executor: pleno
- decidir: como a lista de etapas e a barra se comportam com prefers-reduced-motion e onde fica a confirmação de voltar atrás

### T-019 — E2E das atualizações no app [concluida]
- refs: AC-034, AC-035, AC-036, AC-037, AC-038
- depende: T-017
- escreve: testes/e2e.mjs
- possui: -
- le: ContratoVersaoServidor
- contexto: -
- prova: casos novos do e2e passam com E2E_SO=Atualiza e os casos antigos de atualização seguem verdes
- verifica: CHROME_PATH=/usr/bin/google-chrome E2E_SO=Atualiza node testes/e2e.mjs
- executor: pleno
- decidir: como simular versão nova, faixa fechada e versaoServidor maior no mock do e2e

### T-020 — Documentação e scripts de teste [concluida]
- refs: AC-025, AC-034, AC-039
- depende: T-015, T-018, T-019
- escreve: docs/INSTALAR.md, docs/ATUALIZAR.md, docs/USAR.md, docs/ARQUITETURA.md, docs/SEGURANCA.md, README.md, package.json
- possui: -
- le: ContratoEtapas, ContratoVersaoServidor
- motivo_depende: a documentação descreve as telas prontas
- contexto: docs/INSTALAR.md, docs/ATUALIZAR.md
- prova: os guias descrevem a trilha, o progresso, voltar atrás, a faixa e a página de entrada; npm test inclui qr.test.mjs
- verifica: npm test
- executor: mecanico

### T-021 — Versão 3.6.0 [concluida]
- refs: AC-034
- depende: T-020
- escreve: versao.json, CHANGELOG.md
- possui: -
- le: -
- motivo_depende: a versão só sai depois da 3.5.0 no main e da documentação
- contexto: CHANGELOG.md
- prova: versao.json em 3.6.0 com hashes que conferem e CHANGELOG com a seção 3.6.0
- verifica: node --test testes/versao.test.mjs
- executor: mecanico
```
