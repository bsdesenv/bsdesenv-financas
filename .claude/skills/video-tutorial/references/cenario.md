# Cenário: o que o projeto garante e como a receita o chama

A receita não sabe qual banco o projeto usa nem como o isola. Ela chama o cenário por um contrato,
que o projeto implementa em `docs/video-tutorial/cenario.sh` a partir do esqueleto da receita. Banco,
mecanismo, dados e particularidades do app são do projeto; nada disso vai para a receita.

## O contrato

| Chamada | Efeito |
|---|---|
| `cenario.sh vagas` | imprime um inteiro ≥ 1. Mais de 1 só se o cenário escolhe a base pelo cabeçalho `X-Video-Base` |
| `cenario.sh preparar <id>` | `<id>` casa `^[a-z0-9-]{1,80}$`. Cria a base isolada da corrida, nova e com dados simulados. Nunca toca a base do dev. Sai com 0; o log vai só para a stderr |
| `cenario.sh ligar <id>` | as requisições da gravação passam a ir para a base `<id>`: todas, se há 1 vaga; só as que levam `X-Video-Base: <id>`, se há mais. Idempotente |
| `cenario.sh desligar` | o app volta inteiro para a base do dev. Idempotente. A receita só o chama sem vaga ocupada, inclusive no `trap EXIT` |
| `cenario.sh estado` | imprime `ligado` ou `desligado` |

- O cenário é dono de `docs/video-tutorial/base/`, que fica fora do git.
- A receita manda `X-Video-Base: <id>` em toda requisição (`extraHTTPHeaders`), também no `explorar.mjs`.
- Com 1 vaga, a gravação anda uma de cada vez e o `ensaiar.sh` segura uma trava por máquina. Com
  mais vagas, até esse número de corridas ao mesmo tempo, cada uma com a sua base. Legendas, montagem
  e conferência não usam vaga.
- Bloco que o cenário escreve em arquivo versionado (configuração de servidor, por exemplo) fica
  entre duas linhas de comentário de marca, `video-tutorial: inicio` e `video-tutorial: fim`, e o
  `pre-commit` barra o commit que adiciona a de início: o bloco ligado nunca entra no git.

## O que o cenário tem de garantir

1. **Base isolada e descartável**, nova a cada corrida, para o vídeo sair igual toda vez, sem sobra
   da gravação anterior. Nunca a base do dev, nunca a de produção.
2. **Dados simulados**: nomes, documentos, contatos e valores inventados, variados e coerentes, com
   todos os estados do fluxo aparecendo e datas espalhadas. Criados por meio das regras do próprio
   sistema (seeder ou serviços), para protocolo e histórico saírem como no uso real. Documento
   com dígito verificador válido quando o app o valida; e-mail em domínio reservado
   (`@example.com`); senha única, conhecida só no ambiente de gravação. Nenhum dado real de pessoa, nem lido
   para consulta.
3. **E-mail em `log`** (ou `array`) enquanto a base estiver ligada: nada sai de verdade.
4. **Nada se apaga.** O cenário não faz `DELETE`, `TRUNCATE` nem `DROP` na base do dev; a base nova
   é um arquivo ou esquema novo, e a velha é limpeza manual do usuário.
5. **Desligar é seguro:** depois de `desligar`, o diff do arquivo que o cenário editou sai vazio.
6. **Guarda de instalação ou de ambiente do app** (tela "instalar o app", aviso de modo de
   desenvolvimento) é contornada no navegador da gravação, nunca no app. O `config.mjs` tem os
   parâmetros (`INSTALADO`, `USER_AGENT`).

## O que o projeto decide, quando monta o cenário

A skill pergunta o que não achar no projeto: o banco e o jeito de isolá-lo, de onde vêm os dados
simulados (seeder existente ou novo), se a base é escolhida por requisição (vagas > 1) ou só liga
e desliga (1 vaga), o perfil de tela, e como o login aparece (campos e botão na tela, pelo `LOGIN`
do `config.mjs`; o login é sempre digitado na tela, nunca por token). Sem como isolar o banco da
corrida com segurança, o cenário não se escreve: parar e perguntar.

## Exemplo: backend PHP atrás do Apache

Uma implementação possível, para backend PHP servido pelo Apache, com o framework lendo a configuração de variáveis de ambiente:

- `vagas` devolve 3: a base é escolhida por requisição.
- `preparar` copia uma base-modelo SQLite para `base/<id>.sqlite`. A base-modelo é montada uma vez, com migrations e seeders de simulação, e refeita quando não é do dia ou quando migration ou seeder é mais novo que ela; a anterior é renomeada, não apagada. A cópia vai para nome temporário e entra por `mv`, sob `flock`, para um `preparar` concorrente nunca ler arquivo pela metade.
- `ligar` escreve, entre as marcas, no `.htaccess` da pasta pública, uma diretiva `SetEnvIf` sobre o cabeçalho `X-Video-Base` que, só naquela requisição, troca a conexão para SQLite no arquivo da corrida, o cache para memória (o limitador de requisições num cache em SQLite devolve erro sob gravação paralela), o e-mail para log e a fila para síncrona. Requisição sem o cabeçalho segue na base do dev. O arquivo novo é gerado, comparado com o atual e só escrito se mudou, por temporário na mesma pasta e `mv`.
- `desligar` tira o bloco; `estado` diz se ele está lá.
- O isolamento se prova por contagem: a escrita numa base muda a contagem dela e não a da outra, e a requisição sem cabeçalho no meio segue na base do dev. Login não prova nada, porque a base do dev pode ter o mesmo usuário simulado.
- Cabeçalho com base inexistente: o framework recusa a conexão SQLite sem arquivo, e nenhuma base vazia é criada.
- Se o env por requisição não chegar ao framework (configuração em cache, módulo do Apache ausente), `vagas` devolve 1 e `ligar` faz a troca global, com `SetEnv`.

## Ferramentas

Conferir antes de tudo, com `command -v`: `node`, `google-chrome` ou `chrome`, `ffmpeg`,
`ffprobe`, `pdftoppm`, `python3`. O que faltar se instala sem mexer no docker-dev nem na imagem dele:

- `~/.venv-video`: `python3 -m venv ~/.venv-video && ~/.venv-video/bin/pip install edge-tts numpy`.
  O `produzir.sh` usa esse Python (variável `PYTHON`) e o `edge-tts` do venv (`EDGE_TTS`).
- `ffmpeg` e `ffprobe`: pelo gerenciador de pacotes do sistema, se o usuário tem permissão. Sem root, um binário estático em `~/.local/bin`.
- `npm install` em `docs/video-tutorial/`: Playwright em versão fixa, e o navegador é o Chrome do
  sistema, que nenhum `playwright install` baixa.
- Dependência de sistema que a skill instalou é dita ao usuário no fim; ela não vai para o git.
