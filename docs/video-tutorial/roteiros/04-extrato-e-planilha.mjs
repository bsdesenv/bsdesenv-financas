// Vídeo 4: ler e filtrar o extrato e usar a planilha do ano (mapa de calor, célula e lançamento direto).
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/08-planilha.png, 09-celula.png).
import { capas } from '../comum.mjs'
import { ajustarTela, irTela, moverAviso, fecharAviso, fecharFolha } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Extrato e<br>planilha',
  subtitulo: 'Achar um lançamento e ver o ano inteiro numa tabela.',
  encerramento: 'Próximo vídeo: Ajustes e backup.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'O extrato', topicos: ['Buscar', 'Filtrar', 'Abrir um lançamento'] },
  { titulo: 'A planilha do ano', topicos: ['Mapa de calor', 'Lançar na célula', 'Teclado e totais'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai achar um lançamento no Extrato e ver o ano inteiro na Planilha do Finanças.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'O Extrato é a lista completa; a Planilha é a mesma base vista por categoria e por mês.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem dois passos: o Extrato; e, por fim, a Planilha do ano.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: o extrato
  capaDoPasso(0),
  { capitulo: 'Buscar', falas: [
    { texto: 'Esta é a tela Extrato, com todos os lançamentos do mês agrupados por dia.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'extrato')
        await h.mover(h.page.locator('#busca'))
        await h.mover(h.page.locator('#extrato-resumo'))
      } },
    { texto: 'A busca procura no ano inteiro, por descrição, categoria ou valor. Digite padaria.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#busca'), 'padaria')
        await h.esperar(500)
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.linha-lanc').first())
      } },
    { texto: 'Quando há busca, o resumo diz quantos lançamentos o ano tem e soma os gastos e as rendas.',
      acao: async (h) => {
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.dia-titulo').first())
      } },
  ] },
  { capitulo: 'Filtrar', falas: [
    { texto: 'Os filtros separam gastos e rendas; o seletor ao lado escolhe uma categoria.',
      acao: async (h) => {
        await h.page.locator('#busca').fill('')
        await h.esperar(400)
        await h.clicar(h.page.locator('[data-acao="filtro"][data-filtro="rendas"]'))
        await h.esperar(500)
        await h.mover(h.page.locator('.linha-lanc').first())
        await h.clicar(h.page.locator('[data-acao="filtro"][data-filtro="gastos"]'))
        await h.esperar(500)
        await h.mover(h.page.locator('.linha-lanc').first())
      } },
    { texto: 'No seletor, escolha Mercado para ver só uma categoria. Depois volte para Todas as categorias.',
      acao: async (h) => {
        await h.page.locator('select[data-mudar="filtro-cat"]').selectOption('mercado')
        await h.esperar(500)
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.linha-lanc').first())
        await h.page.locator('select[data-mudar="filtro-cat"]').selectOption('')
        await h.clicar(h.page.locator('[data-acao="filtro"][data-filtro="tudo"]'))
        await h.esperar(500)
      } },
  ] },
  { capitulo: 'Abrir um lançamento', falas: [
    { texto: 'Clique num lançamento para abrir a edição. Aqui dá para mudar ou apagar; no vídeo Lançar e corrigir mostramos o passo a passo.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.linha-lanc').first())
        await h.esperar(600)
        await h.mover(h.page.locator('.folha h2'))
        await h.mover(h.page.locator('#ed-valor'))
        await h.mover(h.page.locator('.folha [data-f="apagar"]'))
      } },
  ] },

  // ── Passo 2: a planilha
  capaDoPasso(1, async (h) => { await fecharFolha(h) }),
  { capitulo: 'Mapa de calor', falas: [
    { texto: 'A Planilha mostra o ano inteiro: categorias nas linhas e meses nas colunas.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'planilha')
        await h.mover(h.page.locator('.planilha-ferramentas .segmentado'))
        await h.mover(h.page.locator('.planilha-ferramentas .legenda'))
      } },
    { texto: 'Cada célula mostra o lançado. Sem lançamento, o plano aparece tracejado como previsto.',
      acao: async (h) => {
        await h.mover(h.page.locator('td.cel[data-cat="mercado"][data-mes="11"]'))
        await h.mover(h.page.locator('td.cel[data-cat="lazer"][data-mes="11"]'))
      } },
    { texto: 'No mapa de calor, o laranja marca o que ficou acima da média da categoria e o lilás o que ficou abaixo.',
      acao: async (h) => {
        await h.mover(h.page.locator('td.cel[data-cat="mercado"][data-mes="10"]'))
        await h.mover(h.page.locator('td.cel[data-cat="lazer"][data-mes="5"]'))
      } },
    { texto: 'Para ver os valores sem cor, clique em Valores; para voltar, clique em Mapa de calor.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="calor"][data-calor="0"]'))
        await h.esperar(500)
        await h.mover(h.page.locator('td.cel[data-cat="mercado"][data-mes="10"]'))
        await h.clicar(h.page.locator('[data-acao="calor"][data-calor="1"]'))
        await h.esperar(500)
      } },
  ] },
  { capitulo: 'Lançar na célula', falas: [
    { texto: 'Clique numa célula para ver os lançamentos dela e lançar direto ali.',
      acao: async (h) => {
        await h.clicar(h.page.locator('td.cel[data-cat="transporte"][data-mes="11"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('.folha h2'))
        await h.mover(h.page.locator('#fc-resumo'))
        await h.mover(h.page.locator('#fc-lista'))
      } },
    { texto: 'Digite o valor e a descrição. O dia em branco usa hoje; clique em Adicionar.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#fc-valor'), '25,00')
        await h.digitar(h.page.locator('#fc-desc'), 'Estacionamento')
        await h.mover(h.page.locator('#fc-dia'))
        await h.mover(h.page.locator('.folha [data-f="adicionar"]'))
        await h.clicar(h.page.locator('.folha [data-f="adicionar"]'))
        await h.esperar(600)
        await moverAviso(h)
      } },
    { texto: 'O lançamento entra na célula e no total do mês; o aviso permite desfazer.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-acao'))
        await h.mover(h.page.locator('#fc-total'))
        await h.mover(h.page.locator('#fc-lista .linha-lanc').last())
      } },
  ] },
  { capitulo: 'Teclado e totais', falas: [
    { texto: 'Com uma célula em foco, as setas andam pela tabela e Enter abre a célula.',
      acao: async (h) => {
        await fecharAviso(h)
        await fecharFolha(h)
        await h.page.locator('td.cel[data-cat="mercado"][data-mes="11"]').focus()
        await h.pagina.keyboard.press('ArrowRight')
        await h.esperar(300)
        await h.pagina.keyboard.press('ArrowLeft')
        await h.esperar(300)
        await h.pagina.keyboard.press('Enter')
        await h.esperar(600)
        await h.mover(h.page.locator('.folha h2'))
        await fecharFolha(h)
      } },
    { texto: 'No rodapé, Total de saídas, Renda e Sobra somam exatamente o que está nas células.',
      acao: async (h) => {
        await h.mover(h.page.locator('.planilha tfoot tr').nth(0), { parcial: true })
        await h.mover(h.page.locator('.planilha tfoot tr').nth(1), { parcial: true })
        await h.mover(h.page.locator('.planilha tfoot tr').nth(2), { parcial: true })
      } },
    { texto: 'Exportar CSV baixa os lançamentos para abrir no Excel ou no Google Sheets.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="exp-csv"]'))
      } },
  ] },

  { falas: [
    { texto: 'Pronto! Agora você sabe achar um lançamento e ler o ano na planilha. No próximo vídeo, os Ajustes e o backup.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
