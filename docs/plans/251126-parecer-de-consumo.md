# Parecer de consumo: 25/11/2026

Status: proposto. Primeiro parecer do projeto (sem parecer anterior, sem linha de base).

## Números

- CUSTO POR ENTREGA: sem entrega na janela (nenhum commit `feat`, `fix` ou `refactor`; os commits `3.0.0` e `3.1.0` não usam o prefixo, então o indicador está cego). US$ 204.97 no Claude Code.
- Janela: 14 dias, que é o histórico inteiro. 2113 chamadas. US$ 137.21 delas (67%) caíram no último dia (`--dias 1`).
- Sem `DELTA`: não há `.claude/consumo-baseline.json`. Sem `RETRABALHO antes do kit`: não há `.claude/consumo-kit`.
- Ambiente de IA instalado em 25/11/2026 (`.claude/settings.json` criado 17:20; commits da spec 15:38 e 18:10). A janela inteira mede o estado anterior ao kit.
- Composição: leitura de cache 45.9%, gravação 29.3%, saída 24.8%.
- Qualidade: ERROS 52 (negação do ambiente 27, falha real 25), retrabalho não medido.
- Já fora da meta: LOTE 82.4% de respostas com 1 ferramenta (meta abaixo de 60%), DELEGACAO 45.1% (meta 50%).
- Sessão concentrada: `ffb824ed` responde por 49% do custo e 900 das 952 chamadas de subagente. Nenhuma regra de roteamento sai desta medida sozinha.
- Maiores itens: `general-purpose` US$ 28.62 (490 chamadas, 14%); RACIOCINIO em `max` US$ 23.81 (719 chamadas, 11.6%); regravação por pausa US$ 20.99 (11 chamadas, 10.2%); 36% das chamadas acima de 200k, pico 966k.

## O ciclo anterior

Sem parecer anterior, não há ciclo a fechar.

## Melhorias propostas

### 1. Medidor: corte por data (`--desde`) e aviso de marco ausente

- Evidência: `--dias 14` e histórico inteiro dão a mesma janela (2113 contra 2122 chamadas), e `--dias 1` mostra US$ 137.21 de US$ 204.97. O kit entrou hoje, então `general-purpose` (490 chamadas), `max` (719) e contexto acima de 200k estão todos na janela de antes do kit, e nada na saída separa o antes do depois. `.claude/consumo-kit` ausente: a linha `RETRABALHO antes do kit` não sai em nenhuma execução.
- Mudança: `claude/medir-consumo.py`, função `corte` (`.claude/medir-consumo.py:134`, hoje só lê `--dias`, senão o histórico inteiro): aceitar `--desde AAAA-MM-DD` como primeiro dia medido, e imprimir uma linha de aviso quando `kit_de_referencia` (`.claude/medir-consumo.py:641`, hoje devolve `None` em silêncio) não achar marco. Atualizar o uso na linha 4 do docstring e o teste `claude/medir-consumo.test.py`.
- Economia: não direta, US$ 0. Destrava a decisão sobre as alavancas já instaladas (ver "Em espera"), que pesam US$ 204.97 × 7 ÷ 14 × 0.363 (leitura de cache da principal) × 0.30 = ~US$ 11 por semana na do autocompact.
- Risco: nenhum na qualidade; só leitura do transcript, e o parecer segue sem ler transcript cru.
- Indicador: o teste do medidor passa, e o parecer seguinte consegue medir só depois de 25/11/2026. Reverter se `--dias` mudar de resultado.

## Em espera: alavancas que o kit já instalou hoje (não propostas)

Propor de novo o que já está feito é o erro que a skill manda evitar. A medida precisa de 100 chamadas depois do kit:

| Alavanca já instalada | Valor atual | Gasto na janela que ela ataca |
|---|---|---|
| `general-purpose` negado | `.claude/settings.json`, `permissions.deny`: `Agent(general-purpose)` | US$ 28.62, 490 chamadas |
| Esforço da principal | `.claude/settings.json`, `effortLevel`: `high` | `max` US$ 23.81, 719 chamadas |
| Janela de autocompact | `.claude/settings.json`, `env`: `CLAUDE_CODE_AUTO_COMPACT_WINDOW` = `200000` | 36% das chamadas acima de 200k |
| Aviso de lote | `.claude/hooks/aviso-lote.py`, `SEQUENCIA = 3` | LOTE 82.4% |
| Aviso de leitura grande | `.claude/hooks/aviso-leitura.py:18`, `LIMITE = 8000` | `resultado:Read` 33.4%, `resultado:Bash` 27.4% do contexto |
| Aviso de pausa | `.claude/hooks/aviso-contexto.py`, `TTL_MINUTOS = 60` | regravação por pausa US$ 20.99 |

Se no próximo parecer algum continuar alto com 100 chamadas depois do kit, a melhoria entra com a medida nova.

## Recusadas

- Baixar `CLAUDE_CODE_AUTO_COMPACT_WINDOW` de 200000: sem número que mostre que a janela atual foi respeitada (o kit entrou hoje); mexer antes arrisca perder contexto no meio de tarefa sem medida.
- Subir o limiar de qualquer `aviso-*`: todos nasceram hoje e não têm calibração.
- Atacar `ERROS`: negação do ambiente (`ls` 5, `cat` 4, `python3` 4) é atrito com a trava, não defeito de entrega, e o `allow` com `ls` e `cat` também é de hoje.

## Linha de base

Não regravar agora. Ela nem existe, e a regra só autoriza depois de uma correção aprovada que chegou pela atualização e 100 chamadas depois dela. Dois passos do projeto, não do kit, valem antes: gravar o commit de hoje em `.claude/consumo-kit` (dado do projeto, a atualização não o cria), e usar `feat`, `fix` ou `refactor` nos commits de entrega para o CUSTO POR ENTREGA deixar de ficar cego.
