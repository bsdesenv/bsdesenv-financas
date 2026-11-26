// Gera a base simulada de uma corrida de vídeo, já no formato das abas (o mesmo que o servidor de vídeo lê).
// Determinística na semente; os meses acompanham a data de hoje para o vídeo nunca gravar um mês fechado como se fosse atual.
// Nomes, descrições e valores são inventados. Nada aqui lê dado real nem toca a planilha do dev.
//
// O que a base traz, além dos lançamentos do ano corrente:
//  - planos em todos os meses, com pendências em outubro (para o fechamento do mês);
//  - recorrências ("Todo mês") pagas e em aberto no mês corrente;
//  - um cartão de crédito com compras na fatura do mês e um notebook parcelado em 6 vezes;
//  - agosto e setembro fechados, para a Planilha mostrar meses fechados.
//
// Uso: node base-simulada.mjs <id> <arquivo-de-saida>
import fs from 'node:fs'
import path from 'node:path'

const [id, destino] = process.argv.slice(2)
if (!/^[a-z0-9-]{1,80}$/.test(id || '')) {
  console.error('base-simulada: id inválido')
  process.exit(2)
}
if (!destino) {
  console.error('base-simulada: falta o arquivo de saída')
  process.exit(2)
}

function semente(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = semente(2026)
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const escolha = (l) => l[Math.floor(rnd() * l.length)]
const arred = (v) => Math.round(v * 100) / 100
const hoje = new Date()
const ANO = hoje.getFullYear()
const MES = hoje.getMonth() + 1
const DIA = hoje.getDate()
const diasNoMes = new Date(ANO, MES, 0).getDate()

const categorias = [
  ['guardar', 'Guardar', 'fixo'],
  ['moradia', 'Moradia', 'fixo'], ['contas-casa', 'Contas da casa', 'fixo'], ['internet-celular', 'Internet e celular', 'fixo'],
  ['plano-saude', 'Plano de saúde', 'fixo'], ['assinaturas', 'Assinaturas', 'fixo'],
  ['mercado', 'Mercado', 'variavel'], ['transporte', 'Transporte', 'variavel'], ['restaurantes', 'Restaurantes e delivery', 'variavel'],
  ['saude', 'Saúde e farmácia', 'variavel'], ['lazer', 'Lazer', 'variavel'], ['compras', 'Compras', 'variavel'],
  ['pets', 'Pets', 'variavel'], ['outros', 'Outros', 'variavel'],
  ['salario', 'Salário', 'renda'], ['renda-extra', 'Renda extra', 'renda'],
]
const grupoDe = (idCat) => categorias.find((c) => c[0] === idCat)[2]

// [qtd mín, qtd máx, valor mín, valor máx, descrições, dia fixo]
const regra = {
  guardar: [1, 1, 850, 850, ['Transferência'], 6],
  moradia: [1, 1, 1850, 1850, ['Aluguel'], 5], 'contas-casa': [2, 3, 60, 220, ['Luz', 'Água', 'Gás']],
  'internet-celular': [1, 2, 60, 110, ['Internet', 'Celular']], 'plano-saude': [1, 1, 420, 420, ['Mensalidade'], 20],
  assinaturas: [2, 3, 20, 45, ['Streaming', 'Música', 'Nuvem']],
  mercado: [6, 10, 40, 260, ['Feira', 'Mercado do bairro', 'Atacado', 'Padaria', '']],
  transporte: [4, 7, 30, 180, ['Combustível', 'App de transporte', 'Estacionamento', 'Ônibus']],
  restaurantes: [4, 8, 25, 110, ['Almoço', 'Delivery', 'Lanche', 'Jantar']],
  saude: [1, 3, 20, 160, ['Farmácia', 'Consulta', '']], lazer: [1, 4, 30, 220, ['Cinema', 'Passeio', 'Show', '']],
  compras: [1, 3, 40, 380, ['Roupas', 'Casa', 'Presente', '']], pets: [1, 2, 70, 180, ['Ração', 'Veterinário']],
  outros: [0, 2, 10, 120, ['']], salario: [1, 1, 7900, 7900, ['Salário'], 5], 'renda-extra': [0, 1, 300, 1100, ['Freela']],
}

const CARD = { id: 'k7f3a9c2b1d', nome: 'Cartão Azul', fechamento: 5, vencimento: 12, limite: 8000, ativo: 1 }
const CARD_ANTIGO = { id: 'k9a8b7c6d5', nome: 'Cartão Antigo', fechamento: 10, vencimento: 17, limite: null, ativo: 0 }

const lancamentos = []
let n = 0
const novoId = () => 'sim' + String(++n).padStart(4, '0')
for (let mes = 1; mes <= MES; mes++) {
  for (const [idCat] of categorias) {
    // Outubro fica com pendências de propósito: sem Lazer, Pets e Guardar, o fechamento tem o que mostrar.
    if (mes === 10 && ['lazer', 'pets', 'guardar'].includes(idCat)) continue
    const [qa, qb, va, vb, descs, diaFixo] = regra[idCat]
    let q = entre(qa, qb)
    // No mês corrente, o retrato é do dia de hoje: menos lançamentos e nenhum no futuro.
    if (mes === MES && !['moradia', 'salario'].includes(idCat)) q = Math.floor(q / 2)
    if (mes === MES && idCat === 'plano-saude') q = 0
    if (mes === MES && idCat === 'guardar') q = 0 // a transferência do mês fica pendente, para o vídeo confirmá-la
    if (mes === MES && idCat === 'renda-extra') q = 0
    if (mes === MES && diaFixo && diaFixo > DIA) q = 0
    for (let i = 0; i < q; i++) {
      const dia = diaFixo || entre(1, mes === MES ? DIA : 28)
      const valor = va === vb ? va : arred(va + rnd() * (vb - va))
      lancamentos.push({ id: novoId(), mes, dia: rnd() < 0.08 ? null : dia, categoriaId: idCat, descricao: escolha(descs), valor })
    }
  }
}

// Cobertura do plano: uma categoria variável sem plano no mês, com lançamento.
const jaTemOutros = lancamentos.some((l) => l.mes === MES && l.categoriaId === 'outros')
if (!jaTemOutros) lancamentos.push({ id: novoId(), mes: MES, dia: Math.min(DIA, 10), categoriaId: 'outros', descricao: 'Presente', valor: 89.9 })
// Aviso de plano estourado: Mercado fecha acima do plano do mês corrente, sem exagero.
const planoMercado = arred(1200)
const somaMercado = arred(lancamentos.filter((l) => l.mes === MES && l.categoriaId === 'mercado').reduce((a, l) => a + l.valor, 0))
if (somaMercado <= planoMercado) lancamentos.push({ id: novoId(), mes: MES, dia: Math.min(DIA, 22), categoriaId: 'mercado', descricao: 'Mercado', valor: arred(planoMercado - somaMercado + 80) })

// Compras no cartão na fatura do mês corrente: as de até o dia do fechamento.
const cardDoMes = (cat, desc, valor, dia) => {
  const id = CARD.id + '_' + novoId()
  lancamentos.push({ id, mes: MES, dia, categoriaId: cat, descricao: desc, valor })
}
const primeiro = (cat, desc) => lancamentos.find((l) => l.mes === MES && l.categoriaId === cat && l.descricao === desc)
for (const [cat, desc] of [['restaurantes', 'Jantar'], ['mercado', 'Padaria'], ['transporte', 'Estacionamento']]) {
  const l = primeiro(cat, desc)
  if (l && (l.dia ?? 99) <= CARD.fechamento) l.id = CARD.id + '_' + l.id
}
cardDoMes('mercado', 'Compra do mês', 289.90, 3)

// Notebook parcelado em 6 vezes no cartão, de setembro a fevereiro.
for (let i = 0; i < 6; i++) {
  const k = MES - 2 + i
  const ano = ANO + Math.floor((k - 1) / 12)
  const mes = ((k - 1) % 12) + 1
  lancamentos.push({
    id: `${CARD.id}_pnote00001-${String(i + 1).padStart(2, '0')}`,
    ano, mes, dia: CARD.vencimento, categoriaId: 'compras', descricao: `Notebook (${i + 1}/6)`, valor: 350,
  })
}

// Planos de todos os meses, iguais aos valores que a tela mostra como referência.
const planos = {
  guardar: 850, moradia: 1850, 'contas-casa': 350, 'internet-celular': 127.50, 'plano-saude': 420, assinaturas: 81.25,
  mercado: 1200, transporte: 577.50, restaurantes: 405, saude: 180, lazer: 312.50, compras: 420, pets: 187.50, outros: 0,
  salario: 7900, 'renda-extra': 800,
}
const orcamento = []
const proximoMes = MES === 12 ? 1 : MES + 1
const comRecorrencia = new Set(['moradia', 'contas-casa', 'internet-celular', 'plano-saude', 'assinaturas', 'salario', 'renda-extra'])
for (let mes = 1; mes <= 12; mes++) {
  for (const [idCat] of categorias) {
    if (!planos[idCat]) continue
    // O mês seguinte das categorias com recorrência nasce sem plano gravado: o plano vem do "Todo mês".
    if (mes === proximoMes && comRecorrencia.has(idCat)) continue
    orcamento.push([ANO, idCat, mes, planos[idCat]])
  }
}

// Recorrências: somam o plano de cada categoria no mês; o que não foi lançado fica em "O que falta pagar".
const recorrencias = [
  ['r-moradia', 'moradia', 'Aluguel', 1850, 5, 202601, '', 1, 0],
  ['r-luz', 'contas-casa', 'Luz', 140, 10, 202601, '', 1, 1],
  ['r-agua', 'contas-casa', 'Água', 120, 28, 202601, '', 1, 1],
  ['r-gas', 'contas-casa', 'Gás', 90, 28, 202601, '', 1, 0],
  ['r-internet', 'internet-celular', 'Internet e celular', 127.50, 15, 202601, '', 1, 1],
  ['r-saude', 'plano-saude', 'Mensalidade', 420, 20, 202601, '', 1, 0],
  ['r-musica', 'assinaturas', 'Música', 42.60, 6, 202601, '', 1, 1],
  ['r-streaming', 'assinaturas', 'Streaming', 38.65, 6, 202601, '', 1, 1],
  ['r-salario', 'salario', 'Salário', 7900, 5, 202601, '', 1, 0],
  ['r-freela', 'renda-extra', 'Freela', 800, 28, 202601, '', 1, 0],
]

// Sobra realizada de um mês: renda recebida menos as saídas lançadas.
function sobraDoMes(mes) {
  let total = 0
  for (const l of lancamentos) {
    if (l.mes !== mes || l.ano && l.ano !== ANO) continue
    total += grupoDe(l.categoriaId) === 'renda' ? l.valor : -l.valor
  }
  return arred(total)
}

const config = [
  ['nome', 'Finanças da casa'],
  ['revisao', '42'],
  ['atualizadoEm', new Date().toISOString()],
  ['tema', 'auto'],
  ['categoriaGuardar', 'guardar'],
  [`fechado:${ANO}-08`, sobraDoMes(8).toFixed(2)],
  [`fechado:${ANO}-09`, sobraDoMes(9).toFixed(2)],
]

const dados = {
  lancamentos: [['id', 'ano', 'mes', 'dia', 'categoriaId', 'descricao', 'valor'], ...lancamentos.map((l) => [l.id, l.ano || ANO, l.mes, l.dia ?? '', l.categoriaId, l.descricao, l.valor])],
  categorias: [['id', 'nome', 'grupo', 'ordem'], ...categorias.map(([idCat, nome, grupo], i) => [idCat, nome, grupo, i + 1])],
  orcamento: [['ano', 'categoriaId', 'mes', 'valor'], ...orcamento],
  config: [['chave', 'valor'], ...config],
  recorrencias: [['id', 'categoriaId', 'descricao', 'valor', 'dia', 'inicio', 'fim', 'ativa', 'automatico'], ...recorrencias],
  cartoes: [['id', 'nome', 'fechamento', 'vencimento', 'limite', 'ativo'], ...[CARD, CARD_ANTIGO].map((c) => [c.id, c.nome, c.fechamento, c.vencimento, c.limite === null ? '' : c.limite, c.ativo])],
}

const pasta = path.dirname(destino)
fs.mkdirSync(pasta, { recursive: true })
fs.writeFileSync(destino, JSON.stringify(dados) + '\n')
console.log(`base ${id}: ${lancamentos.length} lançamentos simulados em ${ANO}-${String(MES).padStart(2, '0')} (dia ${DIA} de ${diasNoMes}); ${recorrencias.length} recorrências; 2 cartões`)
