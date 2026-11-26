# Parecer: orquestração lenta na 3.3.0

Data: 26/11/2026 · Gatilho: "tem algo muito errado na orquestração de agentes ou testes"

## Medições (sessão da 3.3.0)

| Etapa | Tempo do subagente | Trabalho real |
|---|---|---|
| Ajustes em índice + categorias + ordenar (pleno) | 18 min, 62 ferramentas | grande, ok |
| Voltar do navegador (pleno, retomado) | ~7 min | pequeno |
| Extrato numa linha (pleno, retomado) | ~24 min | pequeno: CSS + 1 trecho de HTML |
| e2e inteiro, uma rodada | ~3,5 min (103 cenários, 193 s somados, em série) | — |

Na rodada do Extrato, ~20 dos 24 min foram 6 rodadas do e2e inteiro tentando provar que uma falha intermitente não era dele.

## Achados

1. **O e2e inteiro virou ferramenta de depuração.** Ele roda em série, num navegador só, ~3,5 min por vez. O prompt pedia "rode o e2e inteiro"; o agente repetiu a cada dúvida. Fui eu que pedi mais 3 rodadas completas.
2. **Falha intermitente sem dono.** "3.1.0 parcelas" falha às vezes no branch (4 de 6) e passou no `main` (1 de 1). Uma rodada só não prova nada. Sem saber se é instabilidade do teste ou regressão, cada agente gasta rodadas tentando decidir.
3. **Delegação fria para trabalho iterativo de tela.** O `CLAUDE.md` manda "delegar é o padrão" e o hook repete "delegue toda leitura" a cada turno. Em ajuste de tela, cada rodada relê o `App.html` (~4,6 mil linhas). Os três pedidos mexiam no mesmo arquivo, então não houve paralelismo, só ida e volta em série.
4. **Trava que desvia em silêncio.** O `trava-pleno.py` aceita o disparo e troca o agente por `mecanico` quando o `Decidir:` não está na mesma linha. Isso custou uma rodada lançada, parada e relançada. Negar com mensagem seria mais barato que desviar.
5. **Cerimônia de spec em ajuste de UI.** Feature com US/AC, plano e parecer para uma mudança de tela: barato em tokens, mas soma etapas.

## Premissa (do usuário, 26/11)

"A ideia em delegar é baratear custos: se a sessão está no Opus high ou superior e a tarefa é simples para um Haiku, deve-se delegar. Economia de tokens é a premissa." Com isso, o item 4 abaixo mudou: a delegação fica; o que muda é como se delega.

## Correções aplicadas (26/11)

1. `spec/roteamento.md` › Delegação: e2e filtrado na tarefa e inteiro uma vez no fim; falha intermitente isolada; ajuste pequeno vai a `mecanico` novo com `arquivo:linha`, não a `pleno` retomado; prints de revisão em escala 1, no máximo 1–2 na sessão principal.
2. ~~`trava-pleno.py` barra em vez de desviar~~ — desfeito no mesmo dia: a trava funciona bem nos outros projetos, e o erro foi meu (texto do `Decidir:` na linha de baixo). Hook e teste voltaram à versão do kit.
5. Falha de parcelas: causa não confirmada. O caso roda no PC, em página própria, então o `history.back()` do "‹ Ajustes" não o alcança. Medido isolado depois da limpeza: `main` 10 de 10; branch 22 de 22, mais uma rodada inteira verde (houve 1 falha em 6 antes, sem diagnóstico). Suspeita: as 4 falhas em 6 vieram de rodadas simultâneas, com a máquina carregada. O `semFolha` agora espera 10 s e diz qual folha ficou aberta. O "‹ Ajustes" segue desempilhando pelo histórico: o ouvinte desenha o índice e devolve o foco ao item.
3. e2e com saída curta (só falhas e resumo) para subagente: depois que a investigação da falha de parcelas fechar, porque mexe no mesmo arquivo.
4. Fora por ora: e2e em paralelo (ganha tempo, não token).

## Correções propostas (versão original)

1. **e2e com filtro no desenvolvimento, inteiro uma vez no fechamento.** Já anotado na memória; vale escrever em `spec/roteamento.md` para os agentes lerem.
2. **e2e em paralelo.** Dividir os cenários em 3–4 abas/contextos do mesmo Chrome (cada um com o seu gas-mock). Meta: rodada completa abaixo de 1 min.
3. **Isolar a falha de parcelas.** Rodar só esse caso 20× no `main` e no branch. Se falhar no `main`, é teste instável: corrigir a espera (`semFolha`) à parte, fora da entrega.
4. **Trabalho iterativo de tela na sessão principal.** Delegar leitura grande e tarefa longa e isolada. Ajuste de uma tela já especificado: faço direto. Ajustar a regra 5 do `CLAUDE.md` e o texto do hook de contexto.
5. **Trava nega em vez de desviar.** O `trava-pleno.py` devolve erro ("falta `Decidir: <texto>` na mesma linha"), e eu corrijo na hora.

Os itens 4 e 5 mexem em `.claude/` e no `CLAUDE.md` (fora do git): só com o seu ok.
