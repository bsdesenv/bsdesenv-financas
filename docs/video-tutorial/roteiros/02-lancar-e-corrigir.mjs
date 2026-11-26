// Vídeo 2: lançar pela barra do topo, usar o formulário completo, parcelar no cartão e corrigir no extrato.
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/ui-03-novo-lancamento.png, ui-26-parcelar, ui-04-extrato).
import { capas } from '../comum.mjs'
import { ajustarTela, irTela, moverAviso, fecharAviso, fecharFolha, nav } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Lançar e<br>corrigir',
  subtitulo: 'Anotar um gasto em segundos e consertar quando errar.',
  encerramento: 'Próximo vídeo: contas que se repetem e o que falta pagar.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'Lançamento rápido', topicos: ['Uma linha', 'O aviso'] },
  { titulo: 'Novo lançamento', topicos: ['Valor e categoria', 'Data e descrição', 'Salvar'] },
  { titulo: 'Parcelar no cartão', topicos: ['Pago com', 'As parcelas', 'A fatura'] },
  { titulo: 'Corrigir no extrato', topicos: ['Buscar', 'Editar', 'Apagar e desfazer'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai lançar um gasto no Finanças e aprender a corrigir quando errar.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'Lançar é anotar o que saiu ou entrou. O app soma tudo na hora e atualiza o disponível do mês.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem quatro passos: o lançamento rápido; o formulário completo; parcelar no cartão; e, por fim, corrigir no extrato.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: lançamento rápido
  capaDoPasso(0),
  { capitulo: 'Uma linha', falas: [
    { texto: 'No computador, a barra do topo é um lançamento rápido. Escreva o valor, a categoria e a descrição numa linha.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(h.page.locator('#quick'))
        await h.digitar(h.page.locator('#quick'), '32,90 mercado padaria do zé')
      } },
    { texto: 'Aperte Enter. O app reconhece Mercado, grava com a data de hoje e mostra o aviso.',
      acao: async (h) => {
        await h.pagina.keyboard.press('Enter')
        await h.esperar(700)
        await moverAviso(h)
      } },
  ] },
  { capitulo: 'O aviso', falas: [
    { texto: 'O aviso diz o valor e a categoria e oferece Desfazer. Se algo saiu errado, basta clicar.',
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
    { texto: 'Para escolher categoria, data ou conferir antes de salvar, use o Novo lançamento no topo.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(h.page.locator('[data-acao="novo"]').filter({ visible: true }).first())
        await h.esperar(700)
        await h.mover(h.page.locator('#nv-texto'))
        await h.mover(h.page.locator('.segmentado').first())
      } },
    { texto: 'Digite o valor como se escreve. Aqui, cento e vinte reais em Transporte.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#nv-texto'), '120,00')
        await h.clicar(h.page.locator('#nv-cats [data-f="cat"]').filter({ hasText: 'Transporte' }).first())
        await h.mover(h.page.locator('#nv-entendi'))
      } },
  ] },
  { capitulo: 'Data e descrição', falas: [
    { texto: 'A data já vem como hoje. Ontem, Outra data e o botão Parcelar ficam na mesma linha.',
      acao: async (h) => {
        await h.mover(h.page.locator('#nv-datas [data-f="data"][data-v="ontem"]'))
        await h.mover(h.page.locator('#nv-datas [data-f="data"][data-v="outra"]'))
        await h.mover(h.page.locator('#nv-datas [data-f="parcelar"]'))
      } },
    { texto: 'Escolho Ontem e escrevo a descrição. A descrição é opcional, mas ajuda a achar depois.',
      acao: async (h) => {
        await h.clicar(h.page.locator('#nv-datas [data-f="data"][data-v="ontem"]'))
        await h.digitar(h.page.locator('#nv-desc'), 'Recarga do bilhete')
        await h.mover(h.page.locator('#nv-sug'))
      } },
  ] },
  { capitulo: 'Salvar', falas: [
    { texto: 'O botão mostra o total que vai salvar. Clique em Salvar e o aviso confirma.',
      acao: async (h) => {
        await h.clicar(h.page.locator('#nv-salvar'))
        await h.esperar(700)
        await moverAviso(h)
      } },
    { texto: 'O lançamento entra no extrato e no mesmo dia de ontem, não no dia de hoje.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await h.mover(h.page.locator('.g-ultimos .linha-lanc').first())
        await fecharAviso(h)
      } },
  ] },

  // ── Passo 3: parcelar no cartão
  capaDoPasso(2),
  { capitulo: 'Pago com', falas: [
    { texto: 'Uma compra grande pode ir no cartão. No Novo lançamento, escolha o cartão em Pago com.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(h.page.locator('[data-acao="novo"]').filter({ visible: true }).first())
        await h.esperar(600)
        await h.digitar(h.page.locator('#nv-texto'), '1200,00')
        await h.clicar(h.page.locator('#nv-cats [data-f="cat"]').filter({ hasText: 'Compras' }).first())
        await h.mover(h.page.locator('#nv-cartao'))
      } },
    { texto: 'Ao escolher Cartão Azul, o app avisa em que fatura a compra entra e quando ela vence.',
      acao: async (h) => {
        await h.page.selectOption('#nv-cartao', { label: 'Cartão Azul' })
        await h.esperar(500)
        await h.mover(h.page.locator('#nv-fatura'))
      } },
  ] },
  { capitulo: 'As parcelas', falas: [
    { texto: 'Clique em Parcelar. Em quantas vezes aceita de 2 a 48; aqui, dez vezes.',
      acao: async (h) => {
        await h.clicar(h.page.locator('#nv-datas [data-f="parcelar"]'))
        await h.esperar(400)
        await h.digitar(h.page.locator('#nv-n'), '10')
        await h.mover(h.page.locator('#nv-modo-rot'))
      } },
    { texto: 'A prévia mostra o valor de cada parcela, a primeira e a última, e o total da compra.',
      acao: async (h) => {
        await h.mover(h.page.locator('#nv-previa'))
        await h.mover(h.page.locator('#nv-desc'))
      } },
    { texto: 'Escrevo Geladeira e salvo. O aviso confirma a compra parcelada no cartão.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#nv-desc'), 'Geladeira')
        await h.clicar(h.page.locator('#nv-salvar'))
        await h.esperar(700)
        await moverAviso(h)
      } },
  ] },
  { capitulo: 'A fatura', falas: [
    { texto: 'A primeira parcela entra na fatura de dezembro. No Mês, o quadro Cartões de crédito mostra a fatura.',
      acao: async (h) => {
        await fecharAviso(h)
        await irTela(h, 'mes')
        await h.clicar(h.page.locator('[data-acao="mes-prox"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('[data-acao="fatura-abrir"]').first())
      } },
    { texto: 'Abro a fatura: a Geladeira aparece junto com o Notebook que já estava parcelado.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="fatura-abrir"]').first())
        await h.esperar(700)
        await h.mover(h.page.locator('.folha .fc-lista'))
        await h.mover(h.page.locator('.folha .total-rodape'))
      } },
    { texto: 'A fatura já está contada nos gastos do mês; o quadro só mostra quanto vence. Volto para hoje.',
      acao: async (h) => {
        await fecharFolha(h)
        await h.clicar(h.page.locator('[data-acao="mes-hoje"]'))
        await h.esperar(700)
      } },
  ] },

  // ── Passo 4: corrigir no extrato
  capaDoPasso(3),
  { capitulo: 'Buscar', falas: [
    { texto: 'No Extrato, a busca procura no ano inteiro por descrição, categoria ou valor. Digite padaria do zé.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'extrato')
        await h.digitar(h.page.locator('#busca'), 'padaria do zé')
        await h.esperar(600)
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.linha-lanc').first())
      } },
    { texto: 'Com a busca ativa, o resumo diz quantos lançamentos o ano tem e soma as saídas e as rendas.',
      acao: async (h) => {
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('[data-foco="escopo-ano"]'))
        await h.mover(h.page.locator('[data-foco="escopo-mes"]'))
      } },
  ] },
  { capitulo: 'Editar', falas: [
    { texto: 'Clique no lançamento para abrir a edição. Mudo o valor para trinta e cinco e noventa.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.linha-lanc').first())
        await h.esperar(600)
        await h.digitar(h.page.locator('#ed-valor'), '35,90')
        await h.mover(h.page.locator('#ed-desc'))
      } },
    { texto: 'Salvar grava a correção. O aviso oferece Desfazer, caso tenha sido engano.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-f="salvar"]').last())
        await h.esperar(600)
        await moverAviso(h)
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await fecharAviso(h)
      } },
  ] },
  { capitulo: 'Apagar e desfazer', falas: [
    { texto: 'Para apagar um lançamento, abra a Recarga do bilhete e clique em Apagar.',
      acao: async (h) => {
        await h.page.locator('#busca').fill('Recarga do bilhete')
        await h.esperar(600)
        await h.clicar(h.page.locator('.linha-lanc').first())
        await h.esperar(600)
        await h.mover(h.page.locator('[data-f="apagar"]'))
      } },
    { texto: 'Ele some da lista e o aviso traz Desfazer, para o caso de ter sido engano.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-f="apagar"]').last())
        await h.esperar(600)
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await h.mover(h.page.locator('#avisos .aviso-acao'))
      } },
    { texto: 'Clico em Desfazer e o lançamento volta para a lista.',
      acao: async (h) => {
        await h.clicar(h.page.locator('#avisos .aviso-acao').last())
        await h.esperar(600)
        await h.mover(h.page.locator('.linha-lanc').first())
      } },
  ] },

  { falas: [
    { texto: 'Pronto! Você já sabe lançar, parcelar e corrigir. No próximo vídeo, as contas que se repetem todo mês.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
