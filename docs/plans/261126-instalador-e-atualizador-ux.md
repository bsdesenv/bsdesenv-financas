# Instalador e atualizador: proposta de UX/UI

> Análise de 26/11/2026. Proposta, nada executado. Vale para PC e celular.

## 1. Como está hoje

Instalador (`instalador/Index.html`, `instalador/Codigo.gs`):

- `Index.html` — um cartão por vez: Autorizar → Ligar a API → Nome + Instalar → Pronto. Não mostra o caminho inteiro nem em que passo a pessoa está.
- `appsscript.json` — `executeAs: USER_ACCESSING`: a primeira tela é do Google ("não verificado"), antes de qualquer explicação nossa.
- `desenharAutorizar` / `desenharApi` — a volta é manual ("Já autorizei", "Já liguei").
- `trabalhando()` — spinner com "Leva uns 20 segundos". `instalar()` é uma chamada só, sem progresso real.
- Tela "Pronto!" — dois botões e um aviso. O segundo "não verificado" (o do app) é só citado.
- Erros — texto vermelho solto. Não diz o que foi desfeito nem dá saída.
- Cabeçalho "Finanças · instalador / um projeto bsdesenv": sem ícone, sem os selos de confiança, sem prévia do que vai ser criado.
- Visual próprio, copiado do `Estilos.html`: tokens iguais, sem ícone nem favicon.

Atualizador (no app, `src/App.html`):

- `acoesAtualizacaoHtml` — até 3 botões no mesmo nível (Atualizar agora, Atualizar à mão…, Verificar agora) e um parágrafo explicando a diferença.
- `cartaoAtualizacoes` — o parágrafo de privacidade, longo, fica sempre aberto.
- Novidades em lista simples, sem destaque visual.
- Ida e volta: o app abre o instalador numa aba nova. Depois de atualizar, a pessoa volta e recarrega sozinha. O app não percebe que já foi atualizado.
- Voltar atrás — texto técnico ("Implantar › Gerenciar implantações…").
- A folha "à mão" (`abrirAtualizar`) mostra os passos do editor do Apps Script, que **não funciona no celular**. A folha não avisa isso.

## 2. O que a pesquisa diz

| Fonte | Princípio | Aplicação aqui |
|---|---|---|
| NN/g, onboarding de dispositivos | Assistente visual passo a passo, cada passo com imagem + texto | Trilha de passos com miniatura de cada tela do Google |
| Eleken / Lollypop, wizard UI | Mostrar o progresso e o total; fluxo curto; dá para retomar | "Passo 2 de 4"; o estado vem do servidor, então reabrir retoma |
| NN/g, esperas e interrupções | Em espera longa, mostrar o passo atual e o que falta | Lista de etapas reais ticando durante a instalação |
| Microsoft, barras de progresso | Etapas de duração variável: barra que avança por etapa | Barra por etapa, sem porcentagem inventada |
| Nielsen (UX Tigers), "labor illusion" | Ver o trabalho acontecendo deixa a espera mais leve | Narrar: "Conferindo SHA-256 de 5 arquivos…" |
| Carbon, "What's new" | Novidade discreta, descartada fica descartada, dá para rever depois | Aviso único por versão + "O que mudou" depois de atualizar |
| saasui, changelog | Aviso no próprio app, sem modal que bloqueia | Faixa discreta, nunca modal |
| Google, apps não verificados | O aviso protege contra apps enganosos; limite de 100 usuários | Explicar o aviso antes de ele aparecer, com a tela anotada |

## 3. Proposta

### 3.1 Página de entrada fora do Apps Script ("Antes de começar")

O primeiro contato hoje é a tela de aviso do Google, sem contexto. Proposta: uma página estática no GitHub Pages, sem permissão nenhuma, que vira o link público de instalação.

- Selos no topo: **Grátis · Código aberto · Não lê seus dados · Código conferido (SHA-256)**.
- Trilha do que vai acontecer: 4 passos, cada um com a miniatura da tela do Google e a parte que importa destacada ("Avançado", "Selecionar tudo").
- Tempo total: "uns 3 minutos".
- Botão **Começar a instalação** → instalador.
- Link secundário: "Prefere instalar à mão?"

### 3.2 Instalador como trilha de passos

```
PC (≥ 900px): trilha à esquerda, passo atual à direita
┌───────────────────────────────────────────────────────────┐
│ [ícone] Finanças                      Código aberto · MIT │
├──────────────────┬────────────────────────────────────────┤
│ ✓ Autorizar      │  Passo 2 de 4                          │
│ ● Ligar a API    │  Ligue a API do Apps Script            │
│ ○ Escolher nome  │  [miniatura: chave ligada, destacada]  │
│ ○ Instalar       │  Uma vez só. É ela que deixa...        │
│                  │  [ Abrir as configurações ↗ ]          │
│ O que será       │  Esperando você voltar… (confere       │
│ criado:          │  sozinho quando a aba voltar)          │
│ · 1 planilha     │                                        │
│ · 1 projeto      │                                        │
└──────────────────┴────────────────────────────────────────┘

Celular: barra de progresso no topo, ação fixa embaixo
┌─────────────────────┐
│ Finanças   Passo 2/4│
│ ██████░░░░░░░░░░░░░ │
│                     │
│ Ligue a API do      │
│ Apps Script         │
│ [miniatura]         │
│ Uma vez só...       │
│                     │
│ ▸ Ver todos os passos│
├─────────────────────┤
│[Abrir configurações]│ ← zona do polegar, 48px
└─────────────────────┘
```

- **Confere sozinho ao voltar:** no `visibilitychange`/`focus`, chama `estado()` de novo. "Já autorizei" fica como plano B.
- **Painel "O que será criado":** planilha "<nome>", projeto vinculado, publicação. Mostra antes de instalar o que vai mudar no Drive.
- **Mesma identidade do app:** ícone, favicon (`setFaviconUrl`), tokens do `Estilos.html`.

### 3.3 Instalação com progresso real

```
Instalando o Finanças 3.4.0
✓ Código baixado e conferido (5 arquivos, SHA-256)
✓ Planilha "Finanças" criada
● Enviando o código ao projeto…
○ Publicando o app
████████████░░░░░░  Não feche esta página
```

Duas formas (ver Q1):

- **A (recomendada):** dividir `instalar()` em etapas chamadas pela página (`prepararInstalacao`, `criarPlanilha`, `enviarCodigo`, `publicar`). O progresso é real e o erro aponta a etapa. Custo: a limpeza em caso de falha (planilha para a lixeira) passa a valer entre chamadas, com um `desfazerInstalacao(id)`.
- **B:** a mesma lista avançando por tempo estimado, com uma chamada só. Mais barato, mas o progresso é encenado.

### 3.4 Tela de sucesso que leva ao uso

- Título "Pronto! O Finanças está no seu Drive", com o ícone em destaque.
- **Abrir o Finanças** como ação principal. "Abrir a planilha" vira link secundário.
- **Aviso do próximo passo:** miniatura do segundo aviso do Google, o do app ("o desenvolvedor é você"), para não assustar.
- **Levar para o celular:**
  - no PC: QR code do endereço do app, gerado na página sem serviço externo, e botão **Copiar endereço**;
  - no celular: instrução de "Adicionar à tela inicial" conforme o aparelho (iPhone: Compartilhar; Android: menu ⋮).

### 3.5 Erros que dizem o que fazer

Modelo fixo: **o que houve · o que foi desfeito · o que fazer**.

```
Não deu para publicar o app
A planilha criada foi para a lixeira. Nada ficou pela metade.
[ Tentar de novo ]   Instalar à mão
▸ Detalhe técnico (copiar para abrir um chamado no GitHub)
```

### 3.6 Atualizar: no app

- **Cartão de Atualizações em 3 blocos:**
  1. Estado: selo "Atualizado" (verde) ou "Nova versão 3.5.0" (acento), com a data.
  2. Novidades em cartões curtos; "Ver tudo o que mudou" continua.
  3. Uma ação principal só: **Atualizar para 3.5.0**. "Outras formas" (à mão, verificar agora) vai para um bloco recolhido.
- **Privacidade recolhida:** o parágrafo vira "Sobre e privacidade ▸".
- **Aviso discreto:** uma faixa na Visão geral, uma vez por versão ("Versão 3.5 disponível · Ver novidades · ✕"). Fechada, não volta; o ponto em Ajustes continua.
- **Fechar o ciclo:** quando a aba volta ao foco, o app pergunta ao servidor a versão. O servidor já roda o código novo depois da publicação. Se a versão do servidor for maior que a da página, mostra "Atualizado para 3.5 · Recarregar". Depois de recarregar, a folha "O que mudou" aparece uma vez.
- **"À mão" no celular:** a folha avisa "Precisa de um computador: o editor do Apps Script não funciona no celular" e oferece copiar o link para abrir no PC.
- **Progresso na folha à mão:** "3 de 5 arquivos copiados".

### 3.7 Atualizar: no instalador

- **Confirmar o alvo:** "Atualizar **Finanças Casa** · 3.4.0 → 3.5.0" (o `estado()` já devolve `alvo.titulo`).
- **O que fica:** lista com ✓ — seus dados, o endereço do app, arquivos seus no projeto.
- Mesma lista de progresso real da instalação.
- **Voltar atrás em um clique:** botão "Voltar para a 3.4.0", que aponta a implantação para a versão anterior. O instalador já tem `script.deployments`, então não pede permissão nova. Ver Q3.
- Sucesso: **Voltar ao Finanças**, que abre o app já atualizado.

### 3.8 Base comum (PC e celular)

- Alvos de toque de 48px; ação principal fixa embaixo no celular (`env(safe-area-inset-bottom)`).
- Respeitar `prefers-reduced-motion` na animação dos passos.
- Foco no título a cada passo, como já é hoje, e `aria-live` na lista de progresso.
- Nada de biblioteca: o QR code em JS vanilla pequeno, ou fica de fora (Q2).
- Continua funcionando em qualquer navegador (`simplicidade-projeto-publico`).

## 4. Fases sugeridas

| Fase | Conteúdo | Camada | Esforço |
|---|---|---|---|
| 1 | Atualizador no app: cartão em 3 blocos, privacidade recolhida, aviso único, "fechar o ciclo", folha à mão no celular | `src/App.html`, `src/Estilos.html`, `src/Codigo.gs` (versão do servidor) | médio |
| 2 | Instalador: trilha de passos, confere ao voltar, painel "o que será criado", erros no modelo novo, ícone e tokens | `instalador/Index.html` | médio |
| 3 | Progresso real: dividir `instalar()`/`atualizar()` em etapas, `desfazerInstalacao`, voltar atrás em um clique | `instalador/Codigo.gs` + testes do instalador | alto |
| 4 | Sucesso com QR e tela inicial; página "Antes de começar" no GitHub Pages; `docs/INSTALAR.md` e `ATUALIZAR.md` com as telas novas | estático + docs | médio |

A fase 1 vai sozinha numa versão do app. As fases 2 e 3 trocam o instalador central (mesma implantação, testar com `REF_TESTE`).

## 5. Perguntas

- **Q1:** progresso real (A, divide o backend) ou estimado (B, só tela)? Recomendo A.
- **Q2:** QR code no sucesso do PC? Custa ~10 KB de JS vanilla no instalador. Sem ele, fica só "Copiar endereço".
- **Q3:** botão "Voltar para a versão anterior" no instalador? Usa permissão que o instalador já tem; precisa de teste com versão real.
- **Q4:** página "Antes de começar" no GitHub Pages? Ela vira o link público de instalação no README.

## 6. Suposições a verificar

- ASM-1: `script.google.com/home/usersettings` abre no navegador do celular. Se não abrir, o passo da API pede "faça no computador" também.
- ASM-2: depois de publicar a versão nova na mesma implantação, `google.script.run` de uma página antiga já roda o servidor novo (base do "fechar o ciclo").

## Fontes

- [NN/g — Smart device onboarding](https://www.nngroup.com/articles/smart-device-onboarding/)
- [NN/g — Designing for waits and interruptions](https://www.nngroup.com/articles/designing-for-waits-and-interruptions/)
- [UX Tigers — Progress indicators](https://www.uxtigers.com/post/progress-indicators)
- [Microsoft — Progress bars](https://learn.microsoft.com/en-us/windows/win32/uxguide/progress-bars)
- [Eleken — Wizard UI pattern](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [Lollypop — Wizard UI design](https://lollypop.design/blog/2026/january/wizard-ui-design/?p=23384)
- [Carbon — Show what's new](https://preview.carbondesignsystem.com/building-experiences/onboard/tutorials/show-whats-new-to-maintain-user-engagement)
- [saasui — Changelog UX patterns](https://www.saasui.design/blog/saas-changelog-product-updates-ux-patterns)
- [Google — Unverified apps](https://support.google.com/cloud/answer/7454865)
