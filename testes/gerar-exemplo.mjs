/**
 * Gera exemplos/dados-exemplo.json: um ano FICTÍCIO de lançamentos (2026, até
 * 18 de novembro), usado nos testes, nos prints do README e para quem quiser
 * experimentar o app importando um backup.
 *
 * Determinístico (semente fixa): rodar de novo produz o mesmo arquivo.
 *   node testes/gerar-exemplo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function semente(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = semente(2026);
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const escolha = (l) => l[Math.floor(rnd() * l.length)];
const arred = (v) => Math.round(v * 100) / 100;

const categorias = [
  ['moradia', 'Moradia', 'fixo'], ['contas-casa', 'Contas da casa', 'fixo'], ['internet-celular', 'Internet e celular', 'fixo'],
  ['plano-saude', 'Plano de saúde', 'fixo'], ['assinaturas', 'Assinaturas', 'fixo'],
  ['mercado', 'Mercado', 'variavel'], ['transporte', 'Transporte', 'variavel'], ['restaurantes', 'Restaurantes e delivery', 'variavel'],
  ['saude', 'Saúde e farmácia', 'variavel'], ['lazer', 'Lazer', 'variavel'], ['compras', 'Compras', 'variavel'],
  ['pets', 'Pets', 'variavel'], ['outros', 'Outros', 'variavel'],
  ['salario', 'Salário', 'renda'], ['renda-extra', 'Renda extra', 'renda'],
];
// [qtd mín, qtd máx, valor mín, valor máx, descrições, dia fixo]
const regra = {
  moradia: [1, 1, 1850, 1850, ['Aluguel'], 5], 'contas-casa': [2, 3, 60, 220, ['Luz', 'Água', 'Gás']],
  'internet-celular': [1, 2, 60, 110, ['Internet', 'Celular']], 'plano-saude': [1, 1, 420, 420, ['Mensalidade'], 20],
  assinaturas: [2, 3, 20, 45, ['Streaming', 'Música', 'Nuvem']],
  mercado: [6, 10, 40, 260, ['Feira', 'Mercado do bairro', 'Atacado', 'Padaria', '']],
  transporte: [4, 7, 30, 180, ['Combustível', 'App de transporte', 'Estacionamento', 'Ônibus']],
  restaurantes: [4, 8, 25, 110, ['Almoço', 'Delivery', 'Lanche', 'Jantar']],
  saude: [1, 3, 20, 160, ['Farmácia', 'Consulta', '']], lazer: [1, 4, 30, 220, ['Cinema', 'Passeio', 'Show', '']],
  compras: [1, 3, 40, 380, ['Roupas', 'Casa', 'Presente', '']], pets: [1, 2, 70, 180, ['Ração', 'Veterinário']],
  outros: [0, 2, 10, 120, ['']], salario: [1, 1, 7900, 7900, ['Salário'], 5], 'renda-extra': [0, 1, 300, 1100, ['Freela']],
};

const HOJE = { mes: 11, dia: 18 };
const lancamentos = [];
let n = 0;
for (let mes = 1; mes <= HOJE.mes; mes++) {
  for (const [id] of categorias) {
    const [qa, qb, va, vb, descs, diaFixo] = regra[id];
    let q = entre(qa, qb);
    if (id === 'renda-extra' && mes > 6) q = 0; // a renda extra acabou no meio do ano
    if (mes === HOJE.mes && !['moradia', 'salario'].includes(id)) q = Math.floor(q / 2);
    if (mes === HOJE.mes && id === 'plano-saude') q = 0; // ainda vai vencer
    for (let i = 0; i < q; i++) {
      n++;
      const dia = diaFixo || entre(1, mes === HOJE.mes ? HOJE.dia : 28);
      const valor = va === vb ? va : arred(va + rnd() * (vb - va));
      lancamentos.push({ id: 'ex' + String(n).padStart(4, '0'), mes, dia: rnd() < 0.1 ? null : dia, categoriaId: id, descricao: escolha(descs), valor });
    }
  }
}

// Plano: novembro e dezembro, pela média de cada categoria
const orcamento = {};
for (const [id, , grupo] of categorias) {
  if (id === 'renda-extra') continue;
  const [qa, qb, va, vb] = regra[id];
  const media = arred(((qa + qb) / 2) * ((va + vb) / 2));
  if (media) orcamento[id] = { 11: grupo === 'renda' ? va : media, 12: grupo === 'renda' ? va : media };
}

const dados = {
  versao: 2,
  app: 'bsdesenv-financas',
  nome: 'Casa (exemplo)',
  exportadoEm: '2026-11-18T12:00:00.000Z',
  categorias: categorias.map(([id, nome, grupo], i) => ({ id, nome, grupo, ordem: i + 1 })),
  anos: { 2026: { lancamentos, orcamento } },
};
const destino = path.join(RAIZ, 'exemplos', 'dados-exemplo.json');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, JSON.stringify(dados, null, 1) + '\n');
console.log(`${lancamentos.length} lançamentos fictícios → ${path.relative(RAIZ, destino)}`);
