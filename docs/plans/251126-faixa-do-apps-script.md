# Análise: tirar a faixa "Este aplicativo foi criado por um usuário do Google Apps Script"

Status: descartado (25/11/2026). A faixa fica.

## Decisão

Critério do usuário: o projeto é público, então cada peça a mais pesa. Instalação e uso fáceis, código claro e segurança vêm antes. Cada pessoa usa um navegador e uma plataforma diferentes.

O caminho A falha nos três:

1. **Complexidade:** acrescenta uma peça hospedada (moldura), `ALLOWALL`, guarda de origem, repasse de atalhos e troca do `_top`.
2. **Segurança:** abre o app a ser embutido por qualquer site, e a guarda não vale em todo navegador.
3. **Diversidade:** o login no iframe depende de cookie de terceiro. Safari, iOS e Firefox bloqueiam, e o Chrome pode mudar.

B, C e D também não servem a todos. A faixa continua, e o `docs/INSTALAR.md` já explica que ela é normal.

## Como a faixa nasce (lido no JS do Google, 25/11/2026)

1. A página `/exec` é do Google (`script.google.com`). O app roda num iframe dela, em outro domínio (`*.googleusercontent.com`). O código do app não alcança a faixa: a origem é outra.
2. O servidor manda um sinal "mostrar faixa" no `goog.script.init(...)`. Na conta pessoal do usuário (gmail), o 4º argumento chega `true`.
3. O script `warden` do Google só desenha a faixa quando as duas condições valem:
   `(n = bx.j ? window.parent === window.top : window.self === window.top) && d && $B(e, h)`
   - `d` é o sinal do servidor.
   - `bx.j = !!facadeOrigin`: é o caminho de quem embute por uma "fachada" do Google (provavelmente o Google Sites). No `/exec` comum, `facadeOrigin` não vem.
   - Resultado: no `/exec` comum, a faixa só aparece quando a página é a janela de topo. Dentro de um iframe de outra página, ela não é desenhada.
4. Sem moldura, o Google manda `X-Frame-Options`, e outro site não consegue embutir o `/exec`. O `HtmlService.XFrameOptionsMode.ALLOWALL` tira esse cabeçalho.

## Caminhos

| Caminho | Tira a faixa? | Custo/risco |
|---|---|---|
| A. Página-moldura própria (GitHub Pages) com iframe do `/exec` + `ALLOWALL` | Sim, pela condição 3 | Ver riscos abaixo |
| B. Embutir num Google Sites | Provável (caminho `facadeOrigin`), não testado | Site por usuário; embed do Sites é feio no celular (relato de 2021) |
| C. Conta Google Workspace, dono e usuário no mesmo domínio | Relato de fórum: o servidor manda `d=false` | Pago; não serve para quem usa gmail |
| D. Diálogo dentro do Sheets (`showModalDialog`) | Sim | Não existe no app de celular do Sheets: inviável |
| E. Mexer na faixa pelo próprio app | Não | Bloqueado pela origem cruzada |

## Riscos do caminho A (frios)

1. **Cookie de terceiro.** O `/exec` está em `access: MYSELF` e precisa do login do Google dentro do iframe. Chrome (desktop e Android) ainda aceita cookie de terceiro por padrão. Safari/iOS (ITP) e Firefox bloqueiam: no iPhone, o app tende a cair numa tela de login que não abre em iframe. **Tem que ser testado no celular do usuário antes de qualquer decisão.**
2. **Clickjacking.** `ALLOWALL` deixa qualquer site embutir o app. Mitigação parcial: o app confere `location.ancestorOrigins` (Chrome/Safari; Firefox não tem) e se recusa a abrir fora da moldura oficial.
3. **Comportamento não documentado.** A condição `self === top` está no JS do Google, não na documentação. O Google pode mudar sem aviso; se mudar, volta a faixa, e o app continua funcionando.
4. **`<base target="_top">`** (`src/Index.html:4`) e os links `target="_top"` (`src/App.html:3491`) tiram a pessoa da moldura e a levam ao `/exec` puro, que mostra a faixa. Trocar para `_blank` ou para mensagem à moldura.
5. **Atalhos de URL.** O app lê `?tela=&ano=&mes=` (`src/App.html:4215`, `:4230`) e grava histórico (`:3811`). Na moldura, o endereço visível é o da moldura: ela precisa repassar a busca ao iframe, e "Copiar link deste mês" (`:3881`) precisa gerar o link da moldura.
6. **Várias contas logadas.** O `/exec` sem `/u/N/` pode cair na conta errada (visto no Chrome do VNC). A moldura deveria aceitar `authuser`.
7. **Instalador e "Recarregar"** apontam para o `urlApp` puro (`src/App.html:3458`, `:3292`).

## Prova prática

- Feita: leitura do DOM (`#warning`, `warning-banner-bar-hidden`) e do `warden_bin_i18n_warden__pt_br.js`, no app do usuário aberto no Chrome do VNC.
- Inconclusiva: moldura local com o `X-Frame-Options` retirado por CDP. O iframe carregou (HTTP 200, cabeçalho retirado), mas o mesmo endereço de implantação aberto direto também deu "Não foi possível abrir o arquivo". Ou a implantação mudou, ou é o conflito de contas. Nenhuma conclusão sai daí.

## Próximo passo proposto

1. Protótipo descartável: projeto Apps Script de teste com `ALLOWALL` e uma moldura estática mínima, aberta no computador (Chrome) e no celular do usuário (navegador que ele usa e app instalado na tela inicial).
2. Se abrir sem faixa e com login nos dois: plano de implementação (moldura em GitHub Pages da bsdesenv, guarda por `ancestorOrigins`, `_top` → `_blank`, repasse de atalhos, link da moldura no instalador e no "Copiar link").
3. Se o celular falhar no login: o caminho A morre, e sobra o C (Workspace) ou conviver com a faixa (o X fecha por sessão).
