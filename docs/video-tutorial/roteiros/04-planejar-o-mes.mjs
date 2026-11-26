// Vídeo 4: a tela Planejar (planos por categoria, sugestão, copiar, médias) e a liberação da sobra no disponível.
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/ui-06-planejar.png, ui-02-composicao).
import { capas } from '../comum.mjs'
import { ajustarTela, irTela, moverAviso, fecharAviso, fecharFolha, acao } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Planejar<br>o mês',
  subtitulo: 'Definir o plano de cada categoria e liberar a sobra.',
  encerramento: 'Próximo vídeo: extrato e importação.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'A tela Planejar', topicos: ['Os três números', 'Os grupos', 'Como funciona'] },
  { titulo: 'Definir os planos', topicos: ['O campo de plano', 'Usar sugestão', 'Copiar e médias'] },
  { titulo: 'A meta de economia', topicos: ['O campo da meta', 'Usar sugestão', 'Guardar'] },
  { titulo: 'Liberar a sobra', topicos: ['A composição', 'Liberar', 'Desfazer'] },
]
const capaDoPasso = capas(PARTES)

const desfazer = async (h) => {
  const b = h.page.locator('#avisos .aviso-acao').last()
  if (await b.count()) await h.clicar(b)
  await h.esperar(500)
}

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai planejar o mês no Finanças e fazer a sobra voltar para o disponível.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'Planejar é dizer quanto pretende gastar em cada categoria e quanto quer guardar antes de gastar.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem quatro passos: a tela Planejar; definir os planos; a meta de economia; e, por fim, liberar a sobra.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: a tela Planejar
  capaDoPasso(0),
  { capitulo: 'Os três números', falas: [
    { texto: 'Esta é a tela Mês no modo Planejar. No topo, a renda planejada, as saídas planejadas e a sobra do plano.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'mes')
        await h.clicar(h.page.locator('[data-acao="modo-mes"][data-modo="planejar"]').first())
        await h.esperar(700)
        await h.mover(h.page.locator('.kpis-mes > div').nth(0))
        await h.mover(h.page.locator('.kpis-mes > div').nth(1))
        await h.mover(h.page.locator('.kpis-mes > div').nth(2))
      } },
    { texto: 'A sobra do plano é o que sobra da renda depois de todos os planos e da meta de guardar.',
      acao: async (h) => {
        await h.mover(h.page.locator('.kpis-mes > div').nth(2))
      } },
  ] },
  { capitulo: 'Os grupos', falas: [
    { texto: 'As categorias aparecem em Fixos, Variáveis e Rendas, como no Mês. Cada linha tem o plano atual e a sugestão dos últimos meses.',
      acao: async (h) => {
        await h.mover(h.page.locator('.grupo-titulo').filter({ hasText: 'Fixos' }).first())
        await h.mover(h.page.locator('.grupo-titulo').filter({ hasText: 'Variáveis' }).first())
        await h.mover(h.page.locator('.grupo-titulo').filter({ hasText: 'Rendas' }).first())
      } },
    { texto: 'Em Guardar, o plano é a meta de economia do mês. Em Moradia, é o aluguel que se repete.',
      acao: async (h) => {
        await h.mover(h.page.locator('.linha-plano').filter({ hasText: 'Guardar' }).first())
        await h.mover(h.page.locator('.linha-plano').filter({ hasText: 'Moradia' }).first())
      } },
  ] },
  { capitulo: 'Como funciona', falas: [
    { texto: 'Como os planos entram nos cálculos abre a explicação: o que falta de cada plano fica reservado no disponível.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.planejar-nota summary, details summary').filter({ hasText: 'Como os planos entram nos cálculos' }).first())
        await h.esperar(500)
        await h.mover(h.page.locator('.planejar-nota p, details p').filter({ hasText: 'disponível' }).first())
      } },
  ] },

  // ── Passo 2: definir os planos
  capaDoPasso(1),
  { capitulo: 'O campo de plano', falas: [
    { texto: 'Para mudar um plano, digite no campo da categoria. Aqui, trezentos e oitenta em Contas da casa.',
      acao: async (h) => {
        await h.semCapa()
        await h.digitar(h.page.locator('#pl-contas-casa'), '380,00')
        await h.page.locator('#pl-contas-casa').blur()
        await h.esperar(600)
        await h.mover(h.page.locator('#pl-contas-casa'))
      } },
    { texto: 'A palavra salvo aparece e os números do topo mudam na hora. O plano vale só para este mês.',
      acao: async (h) => {
        await h.mover(h.page.locator('.linha-plano').filter({ hasText: 'Contas da casa' }).locator('.plano-salvo'))
        await h.mover(h.page.locator('.kpis-mes > div').nth(2))
      } },
  ] },
  { capitulo: 'Usar sugestão', falas: [
    { texto: 'Usar sugestão aplica a média dos três meses fechados anteriores. Em Mercado, a sugestão é mil trezentos e sessenta e cinco.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="plano-sugestao"][data-cat="mercado"]'))
        await h.clicar(h.page.locator('[data-acao="plano-sugestao"][data-cat="mercado"]'))
        await h.esperar(600)
        await moverAviso(h)
      } },
    { texto: 'O aviso traz Desfazer. Clico para voltar ao plano anterior.',
      acao: async (h) => {
        await desfazer(h)
        await fecharAviso(h)
      } },
  ] },
  { capitulo: 'Copiar e médias', falas: [
    { texto: 'Copiar de outubro oferece copiar o plano ou o que foi lançado. Mostro as duas opções e cancelo.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="plano-copiar"]'))
        await h.esperar(500)
        await h.mover(h.page.locator('[data-acao="plano-copiar-plano"]'))
        await h.mover(h.page.locator('[data-acao="plano-copiar-real"]'))
        await h.clicar(h.page.locator('[data-acao="plano-copiar-cancelar"]'))
        await h.esperar(500)
      } },
    { texto: 'Preencher com as médias mostra antes o que vai mudar; um segundo toque aplica. Limpar o mês também pede confirmação.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="plano-media"]'))
        await h.clicar(h.page.locator('[data-acao="plano-media"]'))
        await h.esperar(600)
        await h.mover(h.page.locator('[data-acao="plano-media"]'))
        await h.mover(h.page.locator('[data-acao="plano-limpar"]'))
        await h.clicar(h.page.locator('[data-acao="plano-limpar"]'))
        await h.esperar(500)
        await h.mover(h.page.locator('[data-acao="plano-limpar"]'))
        await h.clicar(h.page.locator('[data-acao="plano-limpar"]'))
        await h.esperar(500)
        await moverAviso(h)
        await desfazer(h)
        await fecharAviso(h)
      } },
  ] },

  // ── Passo 3: a meta de economia
  capaDoPasso(2),
  { capitulo: 'O campo da meta', falas: [
    { texto: 'No Início, a Meta de economia é o plano da categoria Guardar. Digite o valor e saia do campo.',
      acao: async (h) => {
        await fecharAviso(h)
        await h.semCapa()
        await h.clicar(h.page.locator('[data-tela="inicio"]').first())
        await h.esperar(700)
        await h.digitar(h.page.locator('[data-foco="meta-guardar"]'), '900,00')
        await h.page.locator('[data-foco="meta-guardar"]').blur()
        await h.esperar(600)
        await h.mover(h.page.locator('[data-foco="meta-guardar"]'))
      } },
    { texto: 'O app mostra a meta do mês e o quanto já foi guardado. O que falta fica reservado no disponível.',
      acao: async (h) => {
        await h.mover(h.page.locator('.plano-meta .legenda-barra'))
        await h.mover(h.page.locator('[data-foco="meta-sugestao"]'))
      } },
  ] },
  { capitulo: 'Usar sugestão', falas: [
    { texto: 'A sugestão da meta é oitenta por cento da sobra média dos três meses fechados. Aplico e desfaço.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="meta-sugestao"]'))
        await h.esperar(600)
        await moverAviso(h)
        await desfazer(h)
        await fecharAviso(h)
      } },
  ] },
  { capitulo: 'Guardar', falas: [
    { texto: 'Guardar lança a transferência que falta para a meta. É a mesma ação do bloco O que falta pagar.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="confirmar"][data-foco="conf-guardar"]'))
      } },
  ] },

  // ── Passo 4: liberar a sobra
  capaDoPasso(3),
  { capitulo: 'A composição', falas: [
    { texto: 'Quando o mês encolhe, a sobra volta pelo botão Liberar. Ver composição mostra cada plano reservado.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(acao(h, 'detalhe-reserva'))
        await h.esperar(700)
        await h.mover(h.page.locator('.folha .conta-heroi'))
      } },
  ] },
  { capitulo: 'Liberar', falas: [
    { texto: 'Liberar devolve o que faltava ao disponível e o plano continua gravado. O aviso traz Desfazer.',
      acao: async (h) => {
        await fecharFolha(h)
        await h.clicar(h.page.locator('[data-acao="encerrar"][data-foco="quit-internet-celular"]'))
        await h.esperar(700)
        await moverAviso(h)
      } },
    { texto: 'O disponível sobe e o valor liberado fica à vista. Clico em Desfazer para reabrir a reserva.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await desfazer(h)
        await fecharAviso(h)
      } },
  ] },
  { falas: [
    { texto: 'Pronto! O plano do mês está no jeito. No próximo vídeo, o extrato e a importação do banco.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
