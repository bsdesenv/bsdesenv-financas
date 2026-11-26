/**
 * Mede o custo do sincronizar sobre a planilha falsa (testes/gas-mock.mjs):
 * leituras, linhas lidas, gravações e linhas gravadas, para N lançamentos
 * e lotes de 1 e de 200 operações. O tempo real no Google não se mede aqui.
 * Rodar:  npm run medir:sincronizar
 * Os lançamentos são sintéticos; nenhum dado pessoal entra na medição.
 */
import { criarServidor } from './gas-mock.mjs';

const TAMANHOS = [1000, 5000, 20000, 50000];
const LOTES = [1, 200];

/** Planilha sintética: uma categoria e N lançamentos. */
function planilhaSintetica(n) {
  const lancamentos = [['id', 'ano', 'mes', 'dia', 'categoriaId', 'descricao', 'valor']];
  for (let i = 1; i <= n; i++) {
    lancamentos.push(['s' + i, 2026, 1 + (i % 12), 1 + (i % 28), 'mercado', 'Lançamento sintético', 10 + (i % 90)]);
  }
  return {
    categorias: [['id', 'nome', 'grupo', 'ordem'], ['mercado', 'Mercado', 'variavel', 1]],
    lancamentos,
    orcamento: [['ano', 'categoriaId', 'mes', 'valor']],
    config: [['chave', 'valor'], ['titular', 'Controle de teste'], ['atualizadoEm', ''], ['versao', '1']],
  };
}

/** Roda um sincronizar com `ops` lançamentos novos e devolve os contadores do mock. */
function medir(n, ops) {
  const { ctx, contagem, zerarContagem } = criarServidor(planilhaSintetica(n));
  const lote = Array.from({ length: ops }, (_, i) => ({
    t: 'lanc',
    l: { id: 'nova' + i, ano: 2026, mes: 2, dia: 3, categoriaId: 'mercado', descricao: 'Lançamento sintético', valor: 12.5 },
  }));
  zerarContagem();
  const r = JSON.parse(ctx.sincronizar(0, JSON.stringify(lote)));
  if (r.aplicadas !== ops) throw new Error(`Esperava ${ops} operações aplicadas, vieram ${r.aplicadas}.`);
  return {
    leituras: contagem.leituras,
    linhasLidas: contagem.linhasLidas,
    gravacoes: contagem.gravacoes,
    linhasGravadas: contagem.linhasGravadas,
  };
}

const fmt = (x) => x.toLocaleString('pt-BR');

console.log('Medição do sincronizar (planilha falsa; contagens do mock)');
console.log('');
console.log('N | operações | leituras | linhas lidas | gravações | linhas gravadas');
console.log('--- | --- | --- | --- | --- | ---');
for (const n of TAMANHOS) {
  for (const ops of LOTES) {
    const m = medir(n, ops);
    console.log(`${fmt(n)} | ${ops} | ${fmt(m.leituras)} | ${fmt(m.linhasLidas)} | ${fmt(m.gravacoes)} | ${fmt(m.linhasGravadas)}`);
  }
}
console.log('');
console.log('Regra: cada lote lê todas as abas e regrava por inteiro cada aba que mudou; o custo cresce com o número de linhas, não com o número de operações.');
