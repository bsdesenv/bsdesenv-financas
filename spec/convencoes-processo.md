# Convenções de processo: plano, parecer e destino de arquivo

> COMO se escreve o que **não** é código: plano, parecer, explicação técnica, e onde cada arquivo
> novo mora. Separado de `convencoes.md` porque só se lê na fase de plano.

---

## Estilo de plano, parecer e explicação técnica

- Título descritivo, sem emoji.
- Use tabelas para comparar opções, nunca para substituir prosa.
- Referências de código usam caminho e símbolo (`src/Codigo.gs::sincronizar()`), nunca linha.
- Plano de mudança reversível exige seção **Rollback** e uma **fase de remoção definitiva** do código morto criado.

### Onde grava: os dois artefatos

| | `docs/plans/<DDMMAA>-<nome>.md` | `spec/features/<nome-em-kebab>.md` |
|---|---|---|
| O que é | Registro datado do raciocínio de **uma sessão** | Estado vivo de **uma feature** |
| Muda depois de escrito? | Não. É histórico | Sim, até virar `implementada` |
| Ordenação | Cronológica, pela data no nome | Por nome de feature |
| Conteúdo | Problema, dados disponíveis, plano, rollback | US, AC, ASM, Q, grafo T e status |
| Quem cobra | O índice em `docs/plans/README.md` | `verificar-plano.sh` e `spec-analyze` |

**A feature é a dona do grafo; o plano não o repete.** O plano conta por que a mudança existe; a lista executável mora em `spec/features/<nome>.md`. Quando a feature muda depois do plano, o plano recebe uma nota datada. Quando as duas divergem, vale a feature.

**Todo plano, parecer e análise vai para `docs/plans/`, sempre, e antes de perguntar se pode executar.**

**Tarefa de 3 ou 4 fases ganha também o arquivo em `spec/features/`**, a partir de `spec/_fontes/feature.md`. Os dois se apontam.

Ao gravar um plano, acrescentar a linha correspondente ao índice `docs/plans/README.md`.

---

## Onde vai cada arquivo novo

| Tipo | Destino |
|---|---|
| Plano, parecer, análise | `docs/plans/<DDMMAA>-<nome>.md`. Sempre. Mais a linha no índice `docs/plans/README.md` |
| Spec de feature | `spec/features/<nome-em-kebab>.md` |
| Função de API do servidor | `src/Codigo.gs` |
| Tela/Componente de front | `src/App.html` ou novo `src/*.html` |
| Estilo novo | `src/Estilos.html` |
| Teste de domínio/servidor | `testes/*.test.mjs` |
| Teste e2e de fluxo | `testes/e2e.mjs` ou novo `testes/*.mjs` |
| Dados de exemplo/fixtures | `exemplos/` ou `testes/fixtures/` |
| Código removido que ainda pode ser consultado | `docs/mortos/` |

Arquivo que não se encaixa em nenhuma linha é sinal de que falta uma linha, não de que pode ir em qualquer lugar.
