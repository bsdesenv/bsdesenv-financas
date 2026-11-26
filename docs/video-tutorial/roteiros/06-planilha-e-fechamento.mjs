// Vídeo 6: a Planilha do ano (mapa de calor, célula, CSV), a impressão do mês e o fechamento com a sobra levada.
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/ui-08-planilha.png, ui2-30-fechamento).
import { capas } from '../comum.mjs'
import { ajustarTela, irTela, moverAviso, fecharAviso, fecharFolha, acao, modoImpressao } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Planilha e<br>fechamento',
  subtitulo: 'O ano inteiro numa tabela e o mês passado fechado.',
  encerramento: 'Próximo vídeo: ajustes, cartões e backup.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'A planilha do ano', topicos: ['A tabela', 'Mapa de calor', 'Exportar o CSV'] },
  { titulo: 'Lançar na célula', topicos: ['O mês da coluna', 'Lançar aqui'] },
  { titulo: 'Imprimir o mês', topicos: ['A prévia', 'Sem menus'] },
  { titulo: 'Fechar o mês', topicos: ['As pendências', 'Não aconteceu', 'Levar a sobra'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai ver o ano inteiro na Planilha, imprimir o mês e fechar um mês passado.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'Fechar o mês guarda a sobra realizada e pode levá-la como renda para o mês seguinte.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem quatro passos: a planilha do ano; lançar na célula; imprimir o mês; e, por fim, fechar o mês.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: a planilha do ano
  capaDoPasso(0),
  { capitulo: 'A tabela', falas: [
    { texto: 'A Planilha mostra o ano inteiro: cada linha é uma categoria e cada coluna, um mês.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'planilha')
        await h.page.evaluate(() => { const y = document.querySelector('.planilha-caixa').getBoundingClientRect().top + window.scrollY; window.scrollTo(0, y - 24) })
        await h.esperar(500)
        await h.mover(h.page.locator('.planilha thead'), { parcial: true })
      } },
    { texto: 'As colunas de meses fechados trazem o que foi lançado; novembro está marcado e dezembro ainda é previsto.',
      acao: async (h) => {
        await h.mover(h.page.locator('.planilha thead .mes-sel, .planilha thead th').filter({ hasText: 'Nov' }).first())
        await h.mover(h.page.locator('.planilha tbody tr').filter({ hasText: 'Mercado' }).first())
      } },
    { texto: 'No rodapé, o Total de saídas, a Renda e a Sobra de cada mês, e a coluna Ano soma tudo.',
      acao: async (h) => {
        await h.page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); const c = document.querySelector('.planilha-caixa'); if (c) c.scrollTop = c.scrollHeight })
        await h.esperar(600)
      } },
  ] },
  { capitulo: 'Mapa de calor', falas: [
    { texto: 'No mapa de calor, o laranja marca o mês acima da média da categoria e o roxo, abaixo.',
      acao: async (h) => {
        await h.page.evaluate(() => { const y = document.querySelector('.planilha-caixa').getBoundingClientRect().top + window.scrollY; window.scrollTo(0, y - 24) })
        await h.esperar(400)
        await h.mover(h.page.locator('[data-foco="calor-1"]'))
        await h.mover(h.page.locator('.planilha .calor-marca').first())
      } },
    { texto: 'Em Valores, a tabela mostra só os números, sem as cores. O modo fica guardado neste aparelho.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="calor-0"]'))
        await h.esperar(500)
        await h.mover(h.page.locator('[data-foco="calor-0"]'))
        await h.clicar(h.page.locator('[data-foco="calor-1"]'))
        await h.esperar(500)
        await h.mover(h.page.locator('[data-foco="calor-1"]'))
      } },
  ] },
  { capitulo: 'Exportar o CSV', falas: [
    { texto: 'Exportar lançamentos baixa um CSV com os lançamentos do ano, para abrir no Excel ou no Sheets.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="exp-csv"]'))
      } },
  ] },

  // ── Passo 2: lançar na célula
  capaDoPasso(1),
  { capitulo: 'O mês da coluna', falas: [
    { texto: 'Clicar numa célula abre a categoria naquele mês. A coluna de dezembro mostra o que ainda é plano.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(h.page.locator('.planilha td[data-cat="lazer"][data-mes="12"]'))
        await h.clicar(h.page.locator('.planilha td[data-cat="lazer"][data-mes="12"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('.folha h2'))
        await h.mover(h.page.locator('.fc-novo'))
      } },
    { texto: 'Em Lançar aqui, escrevo quarenta e cinco reais e clico em Adicionar. O total da célula muda na hora.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#fc-valor'), '45,00')
        await h.clicar(h.page.locator('[data-f="adicionar"]'))
        await h.esperar(600)
        await moverAviso(h)
      } },
    { texto: 'Desfazer tira o lançamento, e a célula volta ao plano tracejado.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await h.clicar(h.page.locator('#avisos .aviso-acao').last())
        await h.esperar(500)
        await fecharAviso(h)
        await fecharFolha(h)
        await h.mover(h.page.locator('.planilha td[data-cat="lazer"][data-mes="12"]'))
      } },
  ] },

  // ── Passo 3: imprimir o mês
  capaDoPasso(2),
  { capitulo: 'A prévia', falas: [
    { texto: 'Na tela Mês, Imprimir este mês prepara a página sem menus nem botões, só com os números.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'mes')
        await h.page.evaluate(() => { window.print = () => {} })
        await h.rolar(h.page.locator('[data-acao="imprimir"]'), 'center')
        await h.clicar(h.page.locator('[data-acao="imprimir"]'))
        await h.esperar(400)
        await h.pagina.emulateMedia({ media: 'print' })
        await modoImpressao(h, true)
        await h.mover(h.page.locator('.kpis-mes'), { parcial: true })
      } },
  ] },
  { capitulo: 'Sem menus', falas: [
    { texto: 'A prévia mantém as cores claras e as categorias. No papel, a barra lateral e o topo não aparecem.',
      acao: async (h) => {
        await h.mover(h.page.locator('.grupo-titulo').filter({ hasText: 'Fixos' }).first(), { parcial: true })
        await h.mover(h.page.locator('.linha-cat').first(), { parcial: true })
      } },
    { texto: 'Voltando à tela normal, o app continua igual.',
      acao: async (h) => {
        await modoImpressao(h, false)
        await h.pagina.emulateMedia({ media: 'screen' })
        await h.esperar(500)
        await h.mover(h.page.locator('.lat-item[data-tela="inicio"]'))
      } },
  ] },

  // ── Passo 4: fechar o mês
  capaDoPasso(3),
  { capitulo: 'As pendências', falas: [
    { texto: 'No Início, o app avisa que outubro ainda tem pendências e oferece Fechar outubro.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(h.page.locator('[data-tela="inicio"]').first())
        await h.esperar(700)
        await h.mover(h.page.locator('.nota-info').filter({ hasText: 'Outubro' }).first())
        await h.mover(h.page.locator('[data-acao="fechar-mes"][data-foco="fechar-anterior"]'))
      } },
    { texto: 'Fechar outubro abre a folha com as contas que faltam pagar e os planos sem lançamento.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="fechar-mes"][data-foco="fechar-anterior"]'))
        await h.esperar(800)
        await h.mover(h.page.locator('.folha .fech-lista'), { parcial: true })
        await h.mover(h.page.locator('.fech-item').first(), { parcial: true })
      } },
    { texto: 'A folha lista só o que ficou pendente: contas a pagar e planos sem nenhum lançamento. Conta com gasto fecha sozinha.',
      acao: async (h) => {
        await h.mover(h.page.locator('.fech-item').filter({ hasText: 'Guardar' }).first(), { parcial: true })
        await h.mover(h.page.locator('.fech-item').filter({ hasText: 'Lazer' }).first(), { parcial: true })
      } },
  ] },
  { capitulo: 'Não aconteceu', falas: [
    { texto: 'Não aconteceu nas demais resolve de uma vez o que não vai ser pago. As contas de débito automático ficam para o lote delas.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-f="nao-todas"]'))
      } },
    { texto: 'Se alguma conta ficou para depois, é só tocar em Não aconteceu nela; Depois adia a decisão.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-f="nao-todas"]'))
      } },
  ] },
  { capitulo: 'Levar a sobra', falas: [
    { texto: 'A sobra realizada aparece no pé. A caixa marcada leva esse valor para novembro como renda “Sobra do mês anterior”.',
      acao: async (h) => {
        await h.page.locator('.folha').evaluate((el) => { const c = el.querySelector('.folha-corpo'); if (c) c.scrollTop = c.scrollHeight })
        await h.esperar(500)
        await h.mover(h.page.locator('#fech-levar'))
        await h.mover(h.page.locator('#fech-sobra'))
      } },
    { texto: 'Fecho outubro. O aviso confirma a sobra guardada e o valor levado; Desfazer reabre o mês se algo estiver errado.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-f="nao-todas"]'))
        await h.esperar(700)
        await h.clicar(h.page.locator('#fech-ok'))
        await h.esperar(700)
        await moverAviso(h)
      } },
  ] },
  { capitulo: 'A sobra no mês seguinte', falas: [
    { texto: 'Volto para novembro. A composição mostra a renda maior, e o extrato tem a sobra de outubro.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await fecharAviso(h)
        await h.mover(h.page.locator('.numero-heroi'))
        await h.clicar(h.page.locator('[data-acao="detalhe-reserva"]').first())
        await h.esperar(700)
        await h.mover(h.page.locator('.folha .conta-heroi'))
        await fecharFolha(h)
        await irTela(h, 'extrato')
        await h.digitar(h.page.locator('#busca'), 'Sobra')
        await h.esperar(700)
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.linha-lanc').first())
      } },
    { texto: 'Ela entra como renda na categoria Sobra do mês anterior, mas não conta como renda nova nos totais do ano.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.linha-lanc').first())
        await h.esperar(600)
        await h.mover(h.page.locator('#ed-cat'))
        await h.mover(h.page.locator('#ed-desc'))
        await fecharFolha(h)
      } },
  ] },

  { falas: [
    { texto: 'Pronto! O ano está na tabela, o mês impresso e outubro fechado. No próximo vídeo, ajustes, cartões e backup.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
