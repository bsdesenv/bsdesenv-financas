# Redesign UX/UI para PC e mobile

**Objetivo:** modernizar a apresentação e reduzir esforço de leitura em telas financeiras, preservando integralmente cálculos, dados, navegação de negócio e fluxos de gravação.

**Direção visual:** “clareza financeira editorial” — superfícies quentes e neutras, verde profundo como acento de ação, tipografia legível com algarismos tabulares, cartões mais precisos e contraste/status compreensíveis sem depender apenas de cor.

**Arquitetura:** concentrar o redesign nas camadas de apresentação em `src/Index.html`, `src/Estilos.html` e pequenos aprimoramentos semânticos em `src/App.html`. Manter os dados, cálculos, persistência e handlers existentes. Conferir os fluxos pela suíte E2E e verificar reflow nos tamanhos de tela.

## Tarefa 1 — Sistema visual e estrutura responsiva

**Arquivos:** `src/Index.html`, `src/Estilos.html`

- [x] Trocar a tipografia de interface e definir tokens para claro/escuro, superfícies, texto, bordas, estados, sombras e raios.
- [x] Refinar cartões, cabeçalho, navegação lateral/inferior, botões, campos e listas com hierarquia e espaçamento consistentes.
- [x] Corrigir o cabeçalho em 1024–1279 px e evitar a distribuição excessiva de espaço entre cartões laterais no desktop.
- [x] Ajustar o cartão de resumo e os alvos de toque em 320–430 px sem ocultar valores ou estados essenciais.

## Tarefa 2 — Apresentação financeira e navegação acessível

**Arquivos:** `src/App.html`, `src/Estilos.html`

- [x] Garantir que os indicadores do mês continuem legíveis em telefones estreitos, reorganizando a grade abaixo de 380 px.
- [x] Dar ao painel rolável da planilha anual nome acessível, foco por teclado e indicação visual de rolagem horizontal.
- [x] Preservar valores BRL exatos, rótulos de realizado/plano/previsto e os comandos existentes para categoria e lançamento.

## Tarefa 3 — Verificação do redesign

**Arquivos:** `testes/e2e.mjs` (somente se a família de fonte carregada pelos prints precisar ser atualizada)

- [x] Executar `npm test` e a suíte E2E disponível.
- [x] Conferir visualmente Início, Extrato, Mês/Planejar, Planilha e Ajustes em 320, 390, 768, 1024 e 1440 px, em tema claro e escuro quando aplicável.
- [x] Verificar ausência de rolagem horizontal da página, legibilidade dos valores, foco visível, região rolável da tabela e funcionamento dos lançamentos/sincronização.
- [ ] Revisar `git diff` e `git status`, criar o commit da versão 2.6.0 e atualizar a implantação existente do Apps Script.

## Referências de pesquisa

- `reports/UX de finanças e mobile.md`
- `research_notes/UX de finanças e mobile/`
