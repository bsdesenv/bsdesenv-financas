#!/bin/sh
# Valida o grafo de execucao de uma feature: dependencias, ondas, donos de arquivo e de contrato.
#
# Uso:
#   sh spec/_fontes/verificar-plano.sh                      # todas as features com bloco ```plano
#   sh spec/_fontes/verificar-plano.sh spec/features/x.md   # uma feature
#
# O bloco vive na secao "Grafo de execucao" da feature e e a fonte executavel das tarefas. O
# formato esta em spec/_fontes/feature.md. O script nao executa nada do plano: so prova que o
# grafo e aciclico, que os arquivos de cada onda sao disjuntos, que cada contrato tem um dono e
# que nenhum consumidor comeca antes do dono.
#
# Sai 0 com o resumo das ondas, ou 1 com uma linha FALHA por problema. Nao tem dependencia alem de
# awk POSIX: roda em qualquer projeto, sem yq, sem python.

set -u

dir=$(cd "$(dirname "$0")" && pwd)
case "$dir" in
  */spec/_fontes) raiz=$(cd "$dir/../.." && pwd) ;;
  *) raiz=$dir ;;
esac

validar() {
  awk -v arquivo="$1" '
function trim(s) {
  sub(/^[ \t\r]+/, "", s)
  sub(/[ \t\r]+$/, "", s)
  return s
}
function erro(msg) {
  erros[++nerros] = msg
}
function par(i, j) {
  return (i < j) ? i SUBSEP j : j SUBSEP i
}
function overlap(a, b) {
  a = trim(a); b = trim(b)
  sub(/^\.\//, "", a); sub(/^\.\//, "", b)
  if (a == b) return 1
  if (substr(a, length(a), 1) == "/" && index(b, a) == 1) return 1
  if (substr(b, length(b), 1) == "/" && index(a, b) == 1) return 1
  if (index(b, a "/") == 1) return 1
  if (index(a, b "/") == 1) return 1
  return 0
}
function flush(   i, n, p, c) {
  if (atual == 0) return
  if (refs[atual] == "") erro(tid[atual] ": falta refs")
  if (depende[atual] == "") erro(tid[atual] ": falta depende")
  if (escreve[atual] == "") erro(tid[atual] ": falta escreve")
  if (possui[atual] == "") erro(tid[atual] ": falta possui")
  if (le[atual] == "") erro(tid[atual] ": falta le")
  if (contexto[atual] == "") erro(tid[atual] ": falta contexto")
  if (prova[atual] == "") erro(tid[atual] ": falta prova")
  if (verifica[atual] == "") erro(tid[atual] ": falta verifica")
  if (executor[atual] == "") erro(tid[atual] ": falta executor")
  if (status[atual] !~ /^(pendente|em-andamento|concluida)$/)
    erro(tid[atual] ": status invalido: " status[atual])
  if (executor[atual] ~ /^(navegador|levantamento|explore)$/)
    erro(tid[atual] ": executor " executor[atual] " so le: tela vai no gate da onda, levantamento no PLAN")
  else if (executor[atual] != "" && executor[atual] !~ /^(sessao|sessão|principal|pleno|mecanico)$/)
    erro(tid[atual] ": executor invalido: " executor[atual])
  if (verifica[atual] == "-")
    erro(tid[atual] ": verifica nao pode ser -")
  if (prova[atual] ~ /TODO|similar a tarefa|similar à tarefa|ajustar conforme/)
    erro(tid[atual] ": prova com placeholder")
  if (verifica[atual] ~ /TODO|similar a tarefa|similar à tarefa|ajustar conforme/)
    erro(tid[atual] ": verifica com placeholder")
  if (contexto[atual] ~ /TODO|similar a tarefa|similar à tarefa|ajustar conforme/)
    erro(tid[atual] ": contexto com placeholder")
  if (motivo_depende[atual] ~ /TODO|similar a tarefa|similar à tarefa|ajustar conforme/)
    erro(tid[atual] ": motivo_depende com placeholder")
  # O degrau sai do que resta decidir: acima do mecanico, a tarefa nomeia a decisao. Tarefa
  # concluida fica de fora, para feature antiga nao ficar vermelha.
  if (decidir[atual] ~ /TODO|similar a tarefa|similar à tarefa|ajustar conforme/ || index(decidir[atual], "<") || index(decidir[atual], ">"))
    erro(tid[atual] ": decidir com placeholder")
  else if (executor[atual] ~ /^(sessao|sessão|principal|pleno)$/ && status[atual] != "concluida") {
    if (decidir[atual] == "")
      erro(tid[atual] ": executor " executor[atual] " sem decidir: tarefa que o plano ja desenhou e do mecanico")
    else if (decidir[atual] == "-" || tolower(decidir[atual]) ~ /^(nada|nenhum|nenhuma)([^a-z]|$)/)
      erro(tid[atual] ": decidir sem decisao: tarefa que o plano ja desenhou e do mecanico")
  }

  n = split(escreve[atual], p, ",")
  for (i = 1; i <= n; i++) {
    p[i] = trim(p[i])
    if (p[i] == "-") { erro(tid[atual] ": escreve nao pode ser -"); continue }
    if (index(p[i], "*") || index(p[i], "?") || index(p[i], "["))
      erro(tid[atual] ": escreve com glob: " p[i])
    if (p[i] ~ /^\//)
      erro(tid[atual] ": escreve com caminho absoluto: " p[i])
    if (p[i] ~ /(^|\/)\.\.(\/|$)/)
      erro(tid[atual] ": escreve com ..: " p[i])
    if (p[i] ~ / /)
      erro(tid[atual] ": escreve com espaco: " p[i])
    if (index(p[i], "<") || index(p[i], ">"))
      erro(tid[atual] ": escreve com lacuna: " p[i])
    w[atual, ++nw[atual]] = p[i]
  }

  n = split(possui[atual], p, ",")
  for (i = 1; i <= n; i++) {
    c = trim(p[i])
    if (c == "-") continue
    if (c ~ / /) erro(tid[atual] ": contrato com espaco: " c)
    if (c ~ /^@/) erro(tid[atual] ": possui nao aceita @: " c)
    if (index(c, "<") || index(c, ">")) erro(tid[atual] ": possui com lacuna: " c)
    if ((atual SUBSEP c) in ownseen) continue
    ownseen[atual, c] = 1
    if (c in owner) erro(tid[atual] ": contrato " c " ja tem dono em " tid[owner[c]])
    else owner[c] = atual
  }

  n = split(le[atual], p, ",")
  for (i = 1; i <= n; i++) {
    c = trim(p[i])
    if (c == "-") continue
    if (c ~ / /) erro(tid[atual] ": le com espaco: " c)
    if (index(c, "<") || index(c, ">")) erro(tid[atual] ": le com lacuna: " c)
    rd[atual, ++nrd[atual]] = c
  }

  n = split(contexto[atual], p, ",")
  for (i = 1; i <= n; i++) {
    c = trim(p[i])
    sub(/#.*$/, "", c)
    if (c != "-" && c != "") ctx[atual, ++nctx[atual]] = c
  }
  atual = 0
}
BEGIN {
  inbloco = 0; viu = 0; atual = 0; nt = 0; nerros = 0; limite = 0
  justificativa = ""; parada = ""; motivo = ""; aviso = ""; cerca = 0
}
{
  line = $0
  if (!inbloco) {
    if (cerca > 0) {
      if (line ~ /^```+[ \t\r]*$/) {
        s = line; n = 0
        while (substr(s, 1, 1) == "`") { n++; s = substr(s, 2) }
        if (n >= cerca) cerca = 0
      }
      next
    }
    if (line ~ /^```plano[ \t\r]*$/) { inbloco = 1; viu = 1; next }
    if (line ~ /^```+/) {
      s = line; n = 0
      while (substr(s, 1, 1) == "`") { n++; s = substr(s, 2) }
      if (n >= 3) { cerca = n; next }
    }
    # So o titulo define US e AC: o ID citado em prosa pode ser de outra feature.
    if (match(line, /^#+[ \t]+(US|AC)-[0-9]+/)) {
      s = substr(line, RSTART, RLENGTH)
      sub(/^#+[ \t]+/, "", s)
      corpo[s] = 1
    }
    next
  }
  if (line ~ /^```[ \t\r]*$/) { flush(); inbloco = 0; next }
  if (line ~ /^[ \t\r]*$/) next
  if (line ~ /^###[ \t]+T-[0-9]+/) {
    flush()
    nt++
    atual = nt
    rest = line
    sub(/^###[ \t]+/, "", rest)
    id = rest
    sub(/[ \t].*$/, "", id)
    tid[nt] = id
    status[nt] = ""
    if (match(rest, /\[[a-z-]+\][ \t\r]*$/)) {
      st = substr(rest, RSTART + 1)
      sub(/\].*$/, "", st)
      status[nt] = st
    }
    next
  }
  if (line ~ /^[ \t]*-[ \t]*[a-z_]+:/ || line ~ /^[a-z_]+:/) {
    sline = line
    sub(/^[ \t]*-[ \t]*/, "", sline)
    i = index(sline, ":")
    campo = substr(sline, 1, i - 1)
    valor = trim(substr(sline, i + 1))
    if (atual == 0) {
      if (campo == "limite") {
        if (++visto_h[campo] > 1) erro("campo duplicado no cabecalho: " campo)
        if (valor !~ /^[0-9]+$/) erro("limite nao e inteiro: " valor)
        else limite = valor + 0
      }
      else if (campo == "justificativa" || campo == "parada" || campo == "motivo_serial") {
        if (++visto_h[campo] > 1) erro("campo duplicado no cabecalho: " campo)
        if (campo == "justificativa") justificativa = valor
        else if (campo == "parada") parada = valor
        else motivo = valor
      }
      else erro("campo de cabecalho desconhecido: " campo)
    } else {
      if (campo !~ /^(refs|depende|escreve|possui|le|contexto|prova|verifica|executor|decidir|motivo_depende)$/) {
        erro(tid[atual] ": campo desconhecido: " campo)
      } else if (++visto_t[atual, campo] > 1) {
        erro(tid[atual] ": campo duplicado: " campo)
      } else if (campo == "refs") refs[atual] = valor
      else if (campo == "depende") depende[atual] = valor
      else if (campo == "escreve") escreve[atual] = valor
      else if (campo == "possui") possui[atual] = valor
      else if (campo == "le") le[atual] = valor
      else if (campo == "contexto") contexto[atual] = valor
      else if (campo == "prova") prova[atual] = valor
      else if (campo == "verifica") verifica[atual] = valor
      else if (campo == "executor") executor[atual] = valor
      else if (campo == "motivo_depende") motivo_depende[atual] = valor
      else if (campo == "decidir") decidir[atual] = valor
    }
    next
  }
  erro("linha fora do formato no bloco: " line)
}
END {
  flush()
  if (!viu) {
    nome = arquivo; sub(/^.*\//, "", nome)
    print "FALHA  " nome ": nenhum bloco plano"
    exit 1
  }
  if (nt == 0) erro("nenhuma tarefa no bloco")
  if (limite == 0) erro("limite ausente ou zero")
  if (justificativa == "") erro("justificativa ausente")
  if (limite > 8) aviso = "limite " limite " acima de 8: confirme a capacidade de revisao"
  if (justificativa ~ /TODO|similar a tarefa|similar à tarefa|ajustar conforme/ || index(justificativa, "<") || index(justificativa, ">"))
    erro("justificativa com placeholder")
  if (parada ~ /TODO|similar a tarefa|similar à tarefa|ajustar conforme/ || index(parada, "<") || index(parada, ">"))
    erro("parada com placeholder")
  if (motivo ~ /TODO|similar a tarefa|similar à tarefa|ajustar conforme/ || index(motivo, "<") || index(motivo, ">"))
    erro("motivo_serial com placeholder")

  for (i = 1; i <= nt; i++) {
    if (tid[i] in idx) erro("tarefa duplicada: " tid[i])
    else idx[tid[i]] = i
  }

  for (i = 1; i <= nt; i++) {
    n = split(refs[i], arr, ",")
    for (j = 1; j <= n; j++) {
      t = trim(arr[j])
      if (t == "-") { erro(tid[i] ": refs nao pode ser -"); continue }
      if (t !~ /^(US|AC)-[0-9]+$/) { erro(tid[i] ": ref invalido: " t); continue }
      if (!(t in corpo)) erro(tid[i] ": ref inexistente na feature: " t)
      else coberto[t] = 1
    }
    n = split(depende[i], arr, ",")
    for (j = 1; j <= n; j++) {
      d = trim(arr[j])
      if (d == "-") continue
      if (!(d in idx)) { erro(tid[i] ": dependencia inexistente: " d); continue }
      if (d == tid[i]) { erro(tid[i] ": autodependencia"); continue }
      dep[i, ++ndep[i]] = idx[d]
      anc[i, idx[d]] = 1
    }
  }

  for (i = 1; i <= nt; i++)
    for (k = 1; k <= ndep[i]; k++) {
      d = dep[i, k]
      just = 0
      for (x = 1; x <= nw[i] && just == 0; x++)
        for (y = 1; y <= nw[d] && just == 0; y++)
          if (overlap(w[i, x], w[d, y])) just = 1
      for (x = 1; x <= nrd[i] && just == 0; x++)
        # O `in` antes de ler: em awk, ler owner[@Externo] cria a chave vazia, e o laco de donos
        # abaixo reprovava o contrato externo de toda tarefa que depende por motivo_depende.
        if ((rd[i, x] in owner) && owner[rd[i, x]] == d) just = 1
      if (!just && motivo_depende[i] == "")
        erro(tid[i] ": depende de " tid[d] " sem contrato ou arquivo; justifique em motivo_depende")
    }

  for (k = 1; k <= nt; k++)
    for (i = 1; i <= nt; i++)
      if (i == k || anc[i, k])
        for (j = 1; j <= nt; j++)
          if (anc[k, j]) anc[i, j] = 1
  ciclo = 0
  for (i = 1; i <= nt; i++)
    if (anc[i, i]) { erro("ciclo envolvendo " tid[i]); ciclo = 1 }

  if (!ciclo) {
    for (i = 1; i <= nt; i++) onda[i] = 1
    for (iter = 1; iter <= nt; iter++)
      for (i = 1; i <= nt; i++)
        for (k = 1; k <= ndep[i]; k++)
          if (onda[dep[i, k]] + 1 > onda[i]) onda[i] = onda[dep[i, k]] + 1
    for (i = 1; i <= nt; i++) { largura[onda[i]]++; if (onda[i] > maxonda) maxonda = onda[i] }
    if (largura[1] == 1 && nt > 1 && motivo == "") erro("onda 1 com uma tarefa sem motivo_serial")
  }

  for (c in owner) {
    o = owner[c]
    if (nw[o] == 0) erro(tid[o] ": dono do contrato " c " nao escreve arquivo")
  }

  for (i = 1; i <= nt; i++)
    for (k = 1; k <= nrd[i]; k++) {
      c = rd[i, k]
      if (substr(c, 1, 1) == "@") continue
      if (!(c in owner)) { erro(tid[i] ": contrato sem dono no plano: " c " (use @" c " se for externo)"); continue }
      o = owner[c]
      if (o == i) continue
      if (!ciclo && anc[i, o] != 1)
        erro(tid[i] ": le " c " antes do dono " tid[o] " (dependencia ausente)")
      conflito[par(i, o)] = 1
      for (x = 1; x <= nw[i]; x++)
        for (y = 1; y <= nw[o]; y++)
          if (overlap(w[i, x], w[o, y]))
            erro(tid[i] ": le " c " e escreve arquivo do dono " tid[o] ": " w[i, x])
    }

  for (i = 1; i < nt; i++)
    for (j = i + 1; j <= nt; j++) {
      if (conflito[par(i, j)]) continue
      if (ciclo || anc[i, j] || anc[j, i]) continue
      achou = ""
      for (x = 1; x <= nw[i] && achou == ""; x++)
        for (y = 1; y <= nw[j] && achou == ""; y++)
          if (overlap(w[i, x], w[j, y])) achou = w[i, x]
      if (achou != "")
        erro(tid[i] " e " tid[j] " escrevem " achou " sem dependencia")
    }

  # Na mesma onda, o arquivo que a vizinha escreve chega pela metade ou velho a quem o le.
  if (!ciclo)
    for (i = 1; i <= nt; i++)
      for (j = 1; j <= nt; j++) {
        if (i == j || onda[i] != onda[j]) continue
        for (x = 1; x <= nctx[j]; x++) {
          achou = 0
          for (y = 1; y <= nw[i] && !achou; y++)
            if (overlap(ctx[j, x], w[i, y])) achou = 1
          if (achou) erro(tid[j] ": le " ctx[j, x] " no contexto, e " tid[i] " escreve isso na mesma onda")
        }
      }

  for (c in corpo)
    if (c ~ /^AC-/ && !(c in coberto))
      erro("AC sem tarefa: " c)

  nome = arquivo; sub(/^.*\//, "", nome)
  if (nerros > 0) {
    for (e = 1; e <= nerros; e++) print "FALHA  " nome ": " erros[e]
    print "plano vermelho: " nerros " falha(s) em " nome
    exit 1
  }

  printf "plano ok: %s: %d tarefas, %d ondas, onda 1 com %d (limite %d), caminho critico %d\n", nome, nt, maxonda, largura[1], limite, maxonda
  if (aviso != "") print "AVISO  " nome ": " aviso
  for (ondaAtual = 1; ondaAtual <= maxonda; ondaAtual++) {
    linha = "  onda " ondaAtual ":"
    count = 0
    for (i = 1; i <= nt; i++) {
      if (onda[i] != ondaAtual) continue
      if (count == limite) { linha = linha " |"; count = 0 }
      linha = linha " " tid[i]
      count++
    }
    print linha
  }

  # Feature em curso: a onda mais baixa com tarefa aberta e de onde se retoma, e a tarefa
  # em-andamento vem primeiro porque ja ocupa vaga do limite.
  for (i = 1; i <= nt; i++) {
    if (status[i] != "pendente") emcurso = 1
    if (status[i] != "concluida" && (retoma == 0 || onda[i] < retoma)) retoma = onda[i]
  }
  if (emcurso) {
    linha = retoma ? "  retomar na onda " retoma ":" : "  retomar: nada, todas concluidas"
    count = 0
    for (vez = 1; retoma && vez <= 2; vez++)
      for (i = 1; i <= nt; i++) {
        if (onda[i] != retoma || status[i] == "concluida") continue
        if ((vez == 1) != (status[i] == "em-andamento")) continue
        if (count == limite) { linha = linha " |"; count = 0 }
        linha = linha " " tid[i] (status[i] == "em-andamento" ? "(em-andamento)" : "")
        count++
      }
    print linha
  }
}' "$1"
}

falhas=0
if [ "$#" -gt 0 ]; then
  for alvo in "$@"; do
    case "$alvo" in
      /*) ;;
      *) alvo=$(cd "$(dirname "$alvo")" && pwd)/$(basename "$alvo") ;;
    esac
    if [ ! -f "$alvo" ]; then
      printf 'FALHA  arquivo nao encontrado: %s\n' "$alvo"
      falhas=$((falhas + 1))
      continue
    fi
    validar "$alvo" || falhas=$((falhas + 1))
  done
else
  achou=0
  for alvo in "$raiz"/spec/features/*.md; do
    [ -f "$alvo" ] || continue
    grep -q '^```plano' "$alvo" || continue
    achou=1
    validar "$alvo" || falhas=$((falhas + 1))
  done
  [ "$achou" -eq 1 ] || printf 'plano: nenhum grafo em spec/features\n'
fi

[ "$falhas" -eq 0 ]
