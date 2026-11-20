// Gera a base simulada de uma corrida de vídeo (formato de backup da v2, lido por abasDoBackup do testes/gas-mock.mjs).
// Determinística na semente; os meses acompanham a data de hoje para o vídeo nunca gravar um mês fechado como se fosse atual.
// Nomes, descrições e valores são inventados. Nada aqui lê dado real nem toca a planilha do dev.
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

const lancamentos = []
let n = 0
for (let mes = 1; mes <= MES; mes++) {
  for (const [idCat] of categorias) {
    const [qa, qb, va, vb, descs, diaFixo] = regra[idCat]
    let q = entre(qa, qb)
    // No mês corrente, o retrato é do dia de hoje: menos lançamentos e nenhum no futuro.
    if (mes === MES && !['moradia', 'salario'].includes(idCat)) q = Math.floor(q / 2)
    if (mes === MES && idCat === 'plano-saude') q = 0
    if (mes === MES && idCat === 'guardar') q = 0 // a transferência do mês fica pendente, para o vídeo confirmá-la
    if (mes === MES && idCat === 'renda-extra') q = 0
    if (mes === MES && diaFixo && diaFixo > DIA) q = 0
    for (let i = 0; i < q; i++) {
      n++
      const dia = diaFixo || entre(1, mes === MES ? DIA : 28)
      const valor = va === vb ? va : arred(va + rnd() * (vb - va))
      lancamentos.push({ id: 'sim' + String(n).padStart(4, '0'), mes, dia: rnd() < 0.08 ? null : dia, categoriaId: idCat, descricao: escolha(descs), valor })
    }
  }
}

// Planos do mês corrente e do seguinte. Guardar é a meta; renda usa o valor cheio.
const orcamento = {}
for (const [idCat, , grupo] of categorias) {
  if (idCat === 'renda-extra') continue
  const [qa, qb, va, vb] = regra[idCat]
  const plano = idCat === 'guardar' ? 850 : grupo === 'renda' ? va : arred(((qa + qb) / 2) * ((va + vb) / 2))
  if (plano) orcamento[idCat] = { [MES]: plano, [MES === 12 ? 12 : MES + 1]: plano }
}
// Cobertura do plano: uma categoria variável sem plano no mês, com lançamento (o valor fica fora da barra).
delete orcamento.outros?.[MES]
const jaTemOutros = lancamentos.some((l) => l.mes === MES && l.categoriaId === 'outros')
if (!jaTemOutros) {
  n++
  lancamentos.push({ id: 'sim' + String(n).padStart(4, '0'), mes: MES, dia: Math.min(DIA, 10), categoriaId: 'outros', descricao: 'Presente', valor: 89.9 })
}

// Aviso de plano estourado: Mercado fecha acima do plano do mês corrente, sem exagero.
const planoMercado = orcamento.mercado?.[MES] || 0
const somaMercado = arred(lancamentos.filter((l) => l.mes === MES && l.categoriaId === 'mercado').reduce((a, l) => a + l.valor, 0))
if (planoMercado && somaMercado <= planoMercado) {
  n++
  lancamentos.push({ id: 'sim' + String(n).padStart(4, '0'), mes: MES, dia: Math.min(DIA, 14), categoriaId: 'mercado', descricao: 'Mercado', valor: arred(planoMercado - somaMercado + 80) })
}

const dados = {
  versao: 2,
  app: 'bsdesenv-financas',
  nome: 'Finanças da casa',
  exportadoEm: new Date().toISOString(),
  categorias: categorias.map(([idCat, nome, grupo], i) => ({ id: idCat, nome, grupo, ordem: i + 1 })),
  anos: { [ANO]: { lancamentos, orcamento } },
}

const pasta = path.dirname(destino)
fs.mkdirSync(pasta, { recursive: true })
fs.writeFileSync(destino, JSON.stringify(dados, null, 1) + '\n')
console.log(`base ${id}: ${lancamentos.length} lançamentos simulados em ${ANO}-${String(MES).padStart(2, '0')} (dia ${DIA} de ${diasNoMes})`)
