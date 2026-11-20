// Vídeo 2: lançar pela barra do topo, lançar pelo formulário completo e corrigir no extrato.
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/03-novo-lancamento.png, 04-extrato.png).
import { capas } from '../comum.mjs'
import { ajustarTela, irTela, moverAviso, fecharAviso } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Lançar e<br>corrigir',
  subtitulo: 'Anotar um gasto em segundos e consertar quando errar.',
  encerramento: 'Próximo vídeo: Planejar o mês.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'Lançamento rápido', topicos: ['Uma linha', 'O aviso'] },
  { titulo: 'Novo lançamento', topicos: ['Valor e categoria', 'Data e descrição', 'Salvar'] },
  { titulo: 'Corrigir no extrato', topicos: ['Buscar', 'Editar', 'Apagar e desfazer'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai lançar um gasto e aprender a corrigir um lançamento no Finanças.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'Lançar é anotar o que saiu da conta; o app soma tudo e atualiza o disponível na hora.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem três passos: o lançamento rápido; o novo lançamento; e, por fim, corrigir no extrato.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: lançamento rápido
  capaDoPasso(0),
  { capitulo: 'Uma linha', falas: [
    { texto: 'No computador, a barra do topo é um lançamento rápido. Escreva o valor, a categoria e a descrição numa linha.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(h.page.locator('#quick'))
        await h.digitar(h.page.locator('#quick'), '32,90 mercado padaria')
      } },
    { texto: 'Aperte Enter. O app reconhece Mercado, grava com a data de hoje e mostra o aviso.',
      acao: async (h) => {
        await h.pagina.keyboard.press('Enter')
        await h.esperar(700)
        await moverAviso(h)
      } },
  ] },
  { capitulo: 'O aviso', falas: [
    { texto: 'O aviso diz o valor e a categoria, e oferece Desfazer. Se algo saiu errado, basta clicar.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await h.mover(h.page.locator('#avisos .aviso-acao'))
      } },
    { texto: 'Repare que o gasto já aparece nos últimos lançamentos e o disponível diminui.',
      acao: async (h) => {
        await h.mover(h.page.locator('.g-ultimos .linha-lanc').first())
        await h.mover(h.page.locator('.numero-heroi'))
        await fecharAviso(h)
      } },
  ] },

  // ── Passo 2: novo lançamento
  capaDoPasso(1),
  { capitulo: 'Valor e categoria', falas: [
    { texto: 'Para escolher categoria, data ou descrição com calma, use Novo lançamento.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(h.page.locator('[data-foco="novo-topo"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('.folha h2'))
        await h.mover(h.page.locator('#nv-texto'))
      } },
    { texto: 'O campo de valor também aceita tudo numa linha, como 45,50 restaurantes almoço.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#nv-texto'), '45,50 restaurantes almoço')
        await h.mover(h.page.locator('#nv-entendi'))
      } },
    { texto: 'O app entendeu o valor, escolheu Restaurantes e delivery e preencheu a descrição.',
      acao: async (h) => {
        await h.mover(h.page.locator('#nv-cats .chip[aria-pressed="true"]'))
        await h.mover(h.page.locator('#nv-desc'))
      } },
  ] },
  { capitulo: 'Data e descrição', falas: [
    { texto: 'A data já vem como Hoje. Se precisar, escolha Ontem ou Outra data.',
      acao: async (h) => {
        await h.mover(h.page.locator('#nv-datas'))
        await h.mover(h.page.locator('#nv-datas [data-v="ontem"]'))
        await h.mover(h.page.locator('#nv-datas [data-v="outra"]'))
      } },
    { texto: 'A descrição fica opcional, mas ajuda a achar o lançamento depois.',
      acao: async (h) => {
        await h.mover(h.page.locator('#nv-desc'))
      } },
  ] },
  { capitulo: 'Salvar', falas: [
    { texto: 'Confira o que o app entendeu e clique em Salvar.',
      acao: async (h) => {
        await h.mover(h.page.locator('#nv-entendi'))
        await h.clicar(h.page.locator('#nv-salvar'))
        await h.esperar(700)
        await moverAviso(h)
      } },
    { texto: 'O lançamento entra na lista e o aviso oferece Desfazer, como no lançamento rápido.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-acao'))
        await h.mover(h.page.locator('.g-ultimos .linha-lanc').first())
      } },
  ] },

  // ── Passo 3: corrigir no extrato
  capaDoPasso(2, async (h) => { await fecharAviso(h) }),
  { capitulo: 'Buscar', falas: [
    { texto: 'Para corrigir um lançamento, abra o Extrato.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'extrato')
        await h.mover(h.page.locator('#busca'))
      } },
    { texto: 'A busca procura no ano inteiro, por descrição, categoria ou valor. Digite almoço.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#busca'), 'almoço')
        await h.esperar(500)
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.linha-lanc').first())
      } },
  ] },
  { capitulo: 'Editar', falas: [
    { texto: 'Clique no lançamento para abrir a edição.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.linha-lanc').first())
        await h.esperar(600)
        await h.mover(h.page.locator('.folha h2'))
        await h.mover(h.page.locator('#ed-valor'))
        await h.mover(h.page.locator('#ed-cat'))
      } },
    { texto: 'Mude o valor, a categoria, a data ou a descrição; depois clique em Salvar.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#ed-valor'), '49,90')
        await h.digitar(h.page.locator('#ed-desc'), 'Almoço de sábado')
        await h.mover(h.page.locator('#ed-desc'))
        await h.clicar(h.page.locator('.folha [data-f="salvar"]'))
        await h.esperar(700)
        await moverAviso(h)
      } },
    { texto: 'O aviso Lançamento alterado também tem Desfazer, e a lista já mostra o valor novo.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-acao'))
        await h.mover(h.page.locator('.linha-lanc').first())
        await fecharAviso(h)
      } },
  ] },
  { capitulo: 'Apagar e desfazer', falas: [
    { texto: 'Se o lançamento não deveria existir, abra de novo e clique em Apagar.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.linha-lanc').first())
        await h.esperar(600)
        await h.mover(h.page.locator('.folha [data-f="apagar"]'))
        await h.clicar(h.page.locator('.folha [data-f="apagar"]'))
        await h.esperar(600)
        await moverAviso(h)
      } },
    { texto: 'O aviso permite desfazer. Clique em Desfazer e o lançamento volta para a lista.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-acao'))
        await h.clicar(h.page.locator('#avisos .aviso-acao'))
        await h.esperar(700)
        await h.mover(h.page.locator('.linha-lanc').first())
      } },
  ] },

  { falas: [
    { texto: 'Pronto! Agora você sabe lançar e corrigir. No próximo vídeo, você vai planejar o mês.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
