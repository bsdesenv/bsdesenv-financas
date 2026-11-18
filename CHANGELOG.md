# Changelog

## 2.0.1 — 2026-11-18

### Corrigido
- Celular: na tela de lançar, as categorias ficavam espremidas e cortadas entre o valor e o teclado quando a barra do navegador ocupava parte da tela; em celulares pequenos, o botão Salvar chegava a sair da tela. Agora valor, categorias, teclado e Salvar ficam sempre inteiros: Gasto/Renda subiu para o topo, os dois botões de salvar ficam lado a lado e as teclas se ajustam à altura disponível. Em telas baixas (ou com "Outra data" aberta), as categorias ficam numa linha que rola para o lado.

## 2.0.0 — 2026-11-18

Reescrita completa da interface e da sincronização. Os dados continuam nas mesmas abas, com o mesmo formato: quem usa a versão 1 só troca o código (veja [docs/ATUALIZAR.md](docs/ATUALIZAR.md)).

### Novo
- Interface para celular e computador: navegação embaixo no celular e menu lateral no computador.
- Lançamento rápido: teclado de valor como o do banco, categorias mais usadas primeiro, data em "hoje", sugestões de descrição. No computador, aceita frases como "32,90 mercado padaria".
- Início com "livre para gastar até o fim do mês", ritmo, projeção do fechamento, contas a vencer e avisos.
- Tela **Mês** para acompanhar e planejar cada categoria (copiar do mês anterior, usar médias).
- **Planilha** do ano com mapa de calor, projeção do mês corrente, painel de lançamento na célula e navegação pelas setas.
- Primeiro acesso guiado, com modelos de categorias (Essencial, Família, Autônomo, Do zero).
- "Desfazer" em lançar, editar, apagar e em outras ações.
- Backup completo em JSON, importação (juntar ou substituir) e exportação em CSV.
- Modo escuro (automático, claro ou escuro). Botão Voltar do celular fecha painéis. Atalhos `N`, `Ctrl+K` e `/`.

### Corrigido em relação à versão 1
- Celular e computador abertos ao mesmo tempo apagavam o trabalho um do outro. Agora o servidor aplica operações sobre o estado atual da planilha.
- Edição que falhava ao gravar se perdia ao reabrir o app. Agora fica numa fila no aparelho e é reenviada.
- Um arquivo com `anos: {}` apagava todo o histórico. Agora a importação exige confirmação e valida item por item.
- "1.500" era lido como R$ 1,50, e "100-20" virava só 100.
- "Restaurar dados" travava o app.
- As fontes declaradas não eram aplicadas (nome da família errado).
- Textos secundários reprovavam o contraste mínimo (WCAG AA).
- O foco do teclado se perdia depois de editar um campo, e a busca recriava o campo a cada tecla.
- No celular: a coluna de valores do extrato e partes dos ajustes ficavam fora da tela.

### Segurança
- Permissão restrita à planilha onde o script está instalado (`@OnlyCurrentDoc`).
- Removido `XFrameOptionsMode.ALLOWALL`.
- Texto que viraria fórmula é gravado como texto. Ids validados.
