// Vídeo 3: contas que se repetem (Todo mês), vencimentos e as ações de Confirmar, Liberar, Guardar e Recebi.
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/ui-01-inicio.png, ui4-05-nova-rec).
import { capas } from '../comum.mjs'
import { ajustarTela, irTela, moverAviso, fecharAviso, fecharFolha, acao } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Todo mês e<br>contas',
  subtitulo: 'Contas que se repetem, vencimentos e o que falta pagar.',
  encerramento: 'Próximo vídeo: planejar o mês.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'O que falta pagar', topicos: ['Vencimentos', 'Confirmar', 'Liberar'] },
  { titulo: 'Todo mês', topicos: ['A lista', 'Editar e pular', 'Nova conta'] },
  { titulo: 'O mês seguinte', topicos: ['O plano que se repete', 'Renda prevista'] },
]
const capaDoPasso = capas(PARTES)

const clicarDesfazer = async (h) => {
  const b = h.page.locator('#avisos .aviso-acao').last()
  if (await b.count()) await h.clicar(b)
  await h.esperar(500)
}

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai cuidar das contas que se repetem e do que ainda falta pagar no mês.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'Aluguel, internet e salário acontecem todo mês. O Finanças guarda isso uma vez e já monta o mês seguinte.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem três passos: o que falta pagar; o bloco Todo mês; e, por fim, o mês seguinte já pronto.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: o que falta pagar
  capaDoPasso(0),
  { capitulo: 'Vencimentos', falas: [
    { texto: 'No Início, O que falta pagar mostra as contas do mês em ordem de vencimento, com o dia em texto.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(h.page.locator('.g-pagar'), { parcial: true })
        await h.mover(h.page.locator('.item-vencer').filter({ hasText: 'Plano de saúde' }).first())
        await h.mover(h.page.locator('.iv-venc.atrasada').first())
      } },
    { texto: 'Conta com débito automático aparece como “debitada dia 6? Confirme”: ela nunca vira atrasada sem você conferir.',
      acao: async (h) => {
        await h.mover(h.page.locator('.item-vencer').filter({ hasText: 'Assinaturas' }).first())
        await h.mover(h.page.locator('.item-vencer').filter({ hasText: 'Contas da casa' }).first())
      } },
  ] },
  { capitulo: 'Confirmar', falas: [
    { texto: 'Confirmar lança o que falta. Em Assinaturas, o app lança os sessenta reais e vinte e três centavos.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="confirmar"][data-foco="conf-assinaturas"]'))
        await h.esperar(700)
        await moverAviso(h)
      } },
    { texto: 'O aviso confirma e oferece Desfazer. Clico para voltar ao estado anterior, só para mostrar.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await h.mover(h.page.locator('#avisos .aviso-acao'))
        await clicarDesfazer(h)
        await fecharAviso(h)
      } },
  ] },
  { capitulo: 'Liberar', falas: [
    { texto: 'Quando a conta veio mais barata, Liberar devolve ao disponível o que faltava, sem apagar o plano.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="encerrar"][data-foco="quit-contas-casa"]'))
        await h.clicar(h.page.locator('[data-acao="encerrar"][data-foco="quit-contas-casa"]'))
        await h.esperar(600)
        await moverAviso(h)
      } },
    { texto: 'O valor volta ao disponível. Desfazer reabre a reserva; dentro da categoria também existe Voltar a reservar.',
      acao: async (h) => {
        await clicarDesfazer(h)
        await fecharAviso(h)
      } },
  ] },
  { capitulo: 'Guardar e receber', falas: [
    { texto: 'Guardar é a meta de economia: o botão Guardar lança a transferência que falta.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="confirmar"][data-foco="conf-guardar"]'))
        await h.clicar(h.page.locator('[data-acao="confirmar"][data-foco="conf-guardar"]'))
        await h.esperar(600)
        await moverAviso(h)
      } },
    { texto: 'Na renda, Recebi marca o que entrou. Não vem tira a renda que não vai acontecer.',
      acao: async (h) => {
        await clicarDesfazer(h)
        await fecharAviso(h)
        await h.mover(h.page.locator('.g-pagar').getByText('A receber').first())
        await h.mover(h.page.locator('[data-acao="confirmar"][data-foco="conf-renda-extra"]'))
        await h.mover(h.page.locator('[data-acao="encerrar"][data-foco="nao-vem-renda-extra"]'))
      } },
  ] },

  // ── Passo 2: Todo mês
  capaDoPasso(1),
  { capitulo: 'A lista', falas: [
    { texto: 'Abra a categoria Contas da casa. No bloco Todo mês ficam as contas que se repetem, com valor, dia e débito automático.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'mes')
        await h.clicar(h.page.locator('.linha-cat').filter({ hasText: 'Contas da casa' }).first())
        await h.esperar(700)
        await h.rolar(h.page.locator('.fc-rec'))
        await h.mover(h.page.locator('.fc-rec .rc-item').first(), { parcial: true })
      } },
    { texto: 'Sem um plano gravado no mês, o plano da categoria é a soma dessas contas. O mês seguinte já nasce pronto.',
      acao: async (h) => {
        await h.mover(h.page.locator('#fc-plano-dica'))
        await h.mover(h.page.locator('.fc-rec .rc-item').nth(1), { parcial: true })
      } },
  ] },
  { capitulo: 'Editar e pular', falas: [
    { texto: 'Editar abre a conta: valor, descrição, dia, débito automático e o período em que ela vale.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.fc-rec [data-f="rec-editar"]').first())
        await h.esperar(600)
        await h.mover(h.page.locator('#rc-valor'))
        await h.mover(h.page.locator('#rc-desc'))
        await h.mover(h.page.locator('#rc-auto'))
        await h.mover(h.page.locator('#rc-ini'))
        await h.mover(h.page.locator('#rc-fim'))
      } },
    { texto: 'Não vem em Novembro pula só este mês. A conta continua valendo nos outros.',
      acao: async (h) => {
        await fecharFolha(h)
        await h.mover(h.page.locator('.fc-rec [data-f="rec-pular"]').first())
        await h.clicar(h.page.locator('.fc-rec [data-f="rec-pular"]').first())
        await h.esperar(600)
        await moverAviso(h)
      } },
    { texto: 'Ela aparece como pulada e o aviso traz Desfazer. Clico para voltar.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await clicarDesfazer(h)
        await fecharAviso(h)
      } },
  ] },
  { capitulo: 'Nova conta', falas: [
    { texto: 'Nova conta que se repete cadastra uma despesa nova. Em renda, o botão se chama Nova renda que se repete.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-f="rec-nova"]'))
        await h.clicar(h.page.locator('[data-f="rec-nova"]'))
        await h.esperar(600)
        await h.mover(h.page.locator('#rc-valor'))
      } },
    { texto: 'Preencha valor, descrição, dia do vencimento e se é débito automático. A partir de define o primeiro mês; Até, o último.',
      acao: async (h) => {
        await h.mover(h.page.locator('#rc-desc'))
        await h.mover(h.page.locator('#rc-dia'))
        await h.mover(h.page.locator('#rc-auto'))
        await h.mover(h.page.locator('#rc-ini'))
        await h.mover(h.page.locator('#rc-fim'))
      } },
    { texto: 'Por enquanto, cancelo. O que já existe continua igual.',
      acao: async (h) => { await fecharFolha(h) } },
  ] },

  // ── Passo 3: o mês seguinte
  capaDoPasso(2, async (h) => { await fecharFolha(h) }),
  { capitulo: 'O plano que se repete', falas: [
    { texto: 'No Planejar, a categoria que se repete mostra o valor e o símbolo de repetição, mesmo antes de você digitar.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(h.page.locator('[data-acao="modo-mes"][data-modo="planejar"]').first())
        await h.esperar(600)
        await h.clicar(h.page.locator('[data-acao="mes-prox"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('.linha-plano').filter({ hasText: 'Contas da casa' }).first())
        await h.mover(h.page.locator('.linha-plano').filter({ hasText: 'Internet e celular' }).first())
      } },
    { texto: 'O mês seguinte já chega com aluguel, internet, plano de saúde e salário. Você só ajusta o que mudou.',
      acao: async (h) => {
        await h.mover(h.page.locator('.linha-plano').filter({ hasText: 'Moradia' }).first())
        await h.mover(h.page.locator('.linha-plano').filter({ hasText: 'Salário' }).first())
      } },
    { texto: 'Volto para hoje para encerrar. As contas continuam guardadas na categoria.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="mes-hoje"]'))
        await h.esperar(700)
      } },
  ] },

  { falas: [
    { texto: 'Pronto! As contas do mês estão sob controle. No próximo vídeo, você vai definir os planos de cada categoria.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
