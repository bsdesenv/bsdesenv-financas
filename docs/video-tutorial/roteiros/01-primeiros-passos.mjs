// Vídeo 1: a tela Início. O que é o disponível, como a renda se divide, os números do mês, um mês fechado e o que
// planejar. Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/01-inicio.png).
import { capas } from '../comum.mjs'
import { ajustarTela, cardCom, acao, fecharFolha } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Primeiros<br>passos',
  subtitulo: 'Entender o disponível, os números do mês e o que planejar.',
  encerramento: 'Próximo vídeo: Lançar e corrigir um gasto.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'O disponível', topicos: ['O número grande', 'A composição'] },
  { titulo: 'Os números do mês', topicos: ['Os quatro cartões', 'Variáveis do mês', 'Últimos lançamentos'] },
  { titulo: 'O mês fechado', topicos: ['Outubro', 'Sobra realizada', 'Voltar para hoje'] },
  { titulo: 'Planejar e guardar', topicos: ['Ritmo do plano', 'Meta de economia', 'A vencer e avisos'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai conhecer a tela Início do Finanças e aprender a ler o seu dinheiro no mês.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'O Finanças é um controle financeiro que roda na sua planilha do Google: você lança os gastos e o app mostra quanto ainda pode gastar.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem quatro passos: o disponível; os números do mês; o mês fechado; e, por fim, planejar e guardar.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: o disponível
  capaDoPasso(0),
  { capitulo: 'O número grande', falas: [
    { texto: 'Esta é a tela Início. O número grande é o disponível para gastar até o fim do mês.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(h.page.locator('#h-livre'))
        await h.mover(h.page.locator('.numero-heroi'))
      } },
    { texto: 'Ele sai da renda menos o que já saiu e menos os planos das categorias que ainda não têm lançamento.',
      acao: async (h) => {
        await h.mover(h.page.locator('.heroi-bridge'))
        await h.mover(h.page.locator('.heroi-nota'))
      } },
    { texto: 'A linha do meio mostra a renda recebida e o que ainda está na conta; abaixo, o limite por dia até o fim do mês.',
      acao: async (h) => {
        await h.mover(h.page.locator('.heroi-bridge'))
        await h.mover(h.page.locator('.heroi-principal > .sub'))
      } },
  ] },
  { capitulo: 'A composição', falas: [
    { texto: 'O anel ao lado divide a renda do mês em três partes: já saiu, planos sem lançamento e disponível.',
      acao: async (h) => {
        await h.mover(h.page.locator('.anel'))
        await h.mover(h.page.locator('.heroi-legenda'))
      } },
    { texto: 'Planos sem lançamento são categorias com plano e nenhum gasto ainda; elas entram como previsto.',
      acao: async (h) => {
        await h.mover(h.page.locator('.heroi-legenda > div').filter({ hasText: 'Planos sem lançamento' }))
      } },
    { texto: 'Ver composição abre a conta inteira, com as categorias que ainda não têm lançamento.',
      acao: async (h) => {
        await h.clicar(acao(h, 'detalhe-reserva'))
        await h.esperar(600)
        await h.mover(h.page.locator('.folha h2'))
        await h.mover(h.page.locator('.folha .conta-heroi .total'))
        await h.mover(h.page.locator('.folha .conta-heroi .subtotal'))
      } },
    { texto: 'Embaixo, o app lista os planos sem lançamento e o plano que serve só para comparar o ritmo.',
      acao: async (h) => {
        await h.mover(h.page.locator('.folha .reserva-linha').first())
        await h.mover(h.page.locator('.folha h3').filter({ hasText: 'Plano usado no ritmo' }))
      } },
  ] },

  // ── Passo 2: os números do mês
  capaDoPasso(1, async (h) => { await fecharFolha(h) }),
  { capitulo: 'Os quatro cartões', falas: [
    { texto: 'Os quatro cartões resumem o mês: renda, o que já saiu, planos sem lançamento e o guardado.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(h.page.locator('.kpi').nth(0), { parcial: true })
        await h.mover(h.page.locator('.kpi').nth(1), { parcial: true })
      } },
    { texto: 'A renda mostra o que foi recebido; o guardado mostra a meta e quanto dela já foi transferido.',
      acao: async (h) => {
        await h.mover(h.page.locator('.kpi').nth(2), { parcial: true })
        await h.mover(h.page.locator('.kpi').nth(3), { parcial: true })
        await h.mover(h.page.locator('.kpi').nth(3).locator('.kpi-anel'))
      } },
  ] },
  { capitulo: 'Variáveis do mês', falas: [
    { texto: 'Variáveis do mês junta as categorias que mudam de valor, como mercado, transporte e restaurantes.',
      acao: async (h) => {
        await h.mover(cardCom(h, 'h-cats'), { parcial: true })
        await h.mover(h.page.locator('.g-cats .cats-resumo'))
      } },
    { texto: 'As barras comparam o gasto com o plano. A marca é o dia de hoje, então dá para ver o que está acima do ritmo.',
      acao: async (h) => {
        const mercado = h.page.locator('.g-cats .linha-cat').filter({ hasText: 'Mercado' }).first()
        await h.mover(mercado)
        await h.mover(mercado.locator('.barra'))
        await h.mover(h.page.locator('.g-cats .linha-cat').filter({ hasText: 'Transporte' }).first())
      } },
    { texto: 'O gráfico Para onde foi mostra as cinco maiores categorias variáveis do mês e a fatia de Outras.',
      acao: async (h) => {
        await h.mover(h.page.locator('.g-cats .grafico-variaveis'), { parcial: true })
      } },
  ] },
  { capitulo: 'Últimos lançamentos', falas: [
    { texto: 'Abaixo ficam os últimos lançamentos, com a descrição, a categoria e o valor.',
      acao: async (h) => {
        await h.mover(cardCom(h, 'h-ult'), { parcial: true })
        await h.mover(h.page.locator('.g-ultimos .linha-lanc').first())
      } },
    { texto: 'Ver extrato abre a lista completa, que tem um vídeo só dela.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="ver-extrato"]'))
      } },
  ] },

  // ── Passo 3: o mês fechado
  capaDoPasso(2),
  { capitulo: 'Outubro', falas: [
    { texto: 'Para ver um mês fechado, clique em Outubro no gráfico Sobra mês a mês.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(cardCom(h, 'h-ano'), { parcial: true })
        await h.mover(h.page.locator('.g-ano .legenda'))
        await h.clicar(h.page.locator('[data-acao="ir-mes"][data-mes="10"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('.navmes-txt h1'))
      } },
  ] },
  { capitulo: 'Sobra realizada', falas: [
    { texto: 'O topo muda para outubro, e o número grande vira a sobra realizada: a renda recebida menos os gastos lançados.',
      acao: async (h) => {
        await h.mover(h.page.locator('#h-fecho'))
        await h.mover(h.page.locator('.numero-heroi'))
      } },
    { texto: 'Nos meses fechados, os cartões usam o realizado e a legenda do gráfico diz quais meses já fecharam.',
      acao: async (h) => {
        await h.mover(h.page.locator('.kpi').nth(2), { parcial: true })
        await h.mover(h.page.locator('.g-ano .legenda'))
        await h.mover(h.page.locator('[data-acao="ir-mes"][data-mes="10"]'))
      } },
  ] },
  { capitulo: 'Voltar para hoje', falas: [
    { texto: 'Quando você está em outro mês, o botão Hoje aparece no alto, ao lado do nome do mês.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="mes-hoje"]'))
      } },
    { texto: 'Clique em Hoje para voltar ao mês atual.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="mes-hoje"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('.navmes-txt h1'))
      } },
  ] },

  // ── Passo 4: planejar e guardar
  capaDoPasso(3),
  { capitulo: 'Ritmo do plano', falas: [
    { texto: 'O Ritmo do plano compara o gasto das categorias de consumo com o plano delas.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(cardCom(h, 'h-ritmo'), { parcial: true })
        await h.mover(cardCom(h, 'h-ritmo').locator('.barra'))
      } },
    { texto: 'A barra é só ritmo: depois do primeiro lançamento, o plano não desconta o disponível; o que conta é o realizado.',
      acao: async (h) => {
        await h.mover(cardCom(h, 'h-ritmo').locator('.sub').last())
      } },
  ] },
  { capitulo: 'Meta de economia', falas: [
    { texto: 'Na Meta de economia, o plano de Guardar é a meta do mês; aqui ela ainda não foi transferida.',
      acao: async (h) => {
        await h.mover(h.page.locator('#h-meta'))
        await h.mover(h.page.locator('[data-foco="meta-confirmar"]'))
      } },
    { texto: 'O botão Usar sugestão aplica oitenta por cento da sobra média dos últimos três meses fechados.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="meta-sugestao"]'))
        await h.mover(h.page.locator('[data-foco="meta-guardar"]'))
      } },
  ] },
  { capitulo: 'A vencer e avisos', falas: [
    { texto: 'As contas fixas com plano e sem lançamento aparecem em A vencer este mês, cada uma com o botão Confirmar.',
      acao: async (h) => {
        await h.mover(cardCom(h, 'h-vencer'), { parcial: true })
        await h.mover(cardCom(h, 'h-vencer').locator('[data-acao="confirmar"]').first())
      } },
    { texto: 'A Cobertura do plano mostra o que ficou fora do plano; os Avisos mostram o que passou do plano ou está acelerado.',
      acao: async (h) => {
        await h.mover(cardCom(h, 'h-cobertura'), { parcial: true })
        await h.mover(cardCom(h, 'h-avisos'), { parcial: true })
        await h.mover(h.page.locator('.aviso-item').first())
      } },
  ] },

  { falas: [
    { texto: 'Pronto! Agora você sabe ler o Início. No próximo vídeo, você vai lançar e corrigir um gasto.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
