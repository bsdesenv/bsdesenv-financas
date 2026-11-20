// Vídeo 3: a tela Mês (acompanhar), o modo Planejar e a meta de economia no Início.
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/05-mes.png, 06-planejar.png).
import { capas } from '../comum.mjs'
import { ajustarTela, irTela, moverAviso, fecharAviso } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Planejar<br>o mês',
  subtitulo: 'Definir o plano de cada categoria e guardar a meta.',
  encerramento: 'Próximo vídeo: Extrato e planilha.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'A tela Mês', topicos: ['Os três números', 'Os grupos', 'O ritmo'] },
  { titulo: 'Definir os planos', topicos: ['O campo de plano', 'Usar sugestão', 'Copiar e médias'] },
  { titulo: 'A meta de economia', topicos: ['O plano de Guardar', 'Confirmar a transferência'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai planejar o mês no Finanças e guardar a meta de economia.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'Planejar é dizer quanto pretende gastar em cada categoria e quanto quer guardar antes de gastar.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem três passos: a tela Mês; definir os planos; e, por fim, a meta de economia.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: a tela Mês
  capaDoPasso(0),
  { capitulo: 'Os três números', falas: [
    { texto: 'Esta é a tela Mês, no modo Acompanhar. No topo ficam a renda, os gastos do mês e a sobra.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'mes')
        await h.mover(h.page.locator('.kpis-mes > div').nth(0))
        await h.mover(h.page.locator('.kpis-mes > div').nth(1))
        await h.mover(h.page.locator('.kpis-mes > div').nth(2))
      } },
    { texto: 'A sobra é o mesmo número do disponível no Início: a renda menos o que foi lançado e o previsto.',
      acao: async (h) => {
        await h.mover(h.page.locator('.kpis-mes > div').nth(2))
      } },
  ] },
  { capitulo: 'Os grupos', falas: [
    { texto: 'As categorias aparecem em três grupos: fixos, variáveis e rendas.',
      acao: async (h) => {
        await h.mover(h.page.locator('.grupo-titulo').filter({ hasText: 'Fixos' }).first())
        await h.mover(h.page.locator('.grupo-titulo').filter({ hasText: 'Variáveis' }).first())
        await h.mover(h.page.locator('.grupo-titulo').filter({ hasText: 'Rendas' }).first())
      } },
    { texto: 'Cada linha mostra o gasto e o plano. Em Guardar, o plano é a meta e o valor lançado é a transferência.',
      acao: async (h) => {
        const guardar = h.page.locator('.linha-cat').filter({ hasText: 'Guardar' }).first()
        await h.mover(guardar)
        await h.mover(h.page.locator('.linha-cat').filter({ hasText: 'Mercado' }).first())
      } },
  ] },
  { capitulo: 'O ritmo', falas: [
    { texto: 'A marca nas barras dos variáveis é o dia de hoje. Assim dá para ver o que está acima do ritmo do mês.',
      acao: async (h) => {
        await h.mover(h.page.locator('.dica-ritmo'))
        const mercado = h.page.locator('.linha-cat').filter({ hasText: 'Mercado' }).first()
        await h.mover(mercado.locator('.barra'))
        await h.mover(h.page.locator('.linha-cat').filter({ hasText: 'Lazer' }).first())
      } },
  ] },

  // ── Passo 2: definir os planos
  capaDoPasso(1),
  { capitulo: 'O campo de plano', falas: [
    { texto: 'Clique em Planejar para editar os planos do mês.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(h.page.locator('[data-acao="modo-mes"][data-modo="planejar"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('.kpis-mes > div').nth(0))
        await h.mover(h.page.locator('.kpis-mes > div').nth(2))
      } },
    { texto: 'Cada categoria tem um campo de plano. O campo vazio quer dizer sem previsto para aquela categoria.',
      acao: async (h) => {
        await h.mover(h.page.locator('#pl-mercado'))
        await h.mover(h.page.locator('.mes > p.sub').first())
      } },
    { texto: 'Enquanto a categoria não tem lançamento, o plano entra nas contas como previsto; depois, só o realizado conta.',
      acao: async (h) => {
        await h.mover(h.page.locator('#pl-mercado'))
        await h.mover(h.page.locator('.mes > p.sub').first())
      } },
  ] },
  { capitulo: 'Usar sugestão', falas: [
    { texto: 'Ao lado do campo, a sugestão é a média dos três meses anteriores daquela categoria.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="plano-sugestao"][data-cat="mercado"]'))
      } },
    { texto: 'A sugestão só vira plano quando você usa. Clique em Usar sugestão para aplicar.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="plano-sugestao"][data-cat="mercado"]'))
        await h.esperar(600)
        await moverAviso(h)
        await h.mover(h.page.locator('#pl-mercado'))
      } },
    { texto: 'O aviso mostra o plano novo e permite desfazer. Vou desfazer para manter o valor que já estava.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-acao'))
        await h.clicar(h.page.locator('#avisos .aviso-acao'))
        await h.esperar(600)
        await h.mover(h.page.locator('#pl-mercado'))
      } },
  ] },
  { capitulo: 'Copiar e médias', falas: [
    { texto: 'Também dá para digitar o valor direto no campo. Vou colocar 350 em Lazer e sair do campo.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#pl-lazer'), '350,00')
        await h.pagina.keyboard.press('Tab')
        await h.esperar(1200)
        await h.mover(h.page.locator('.kpis-mes > div').nth(1))
        await h.mover(h.page.locator('.kpis-mes > div').nth(2))
      } },
    { texto: 'Os botões do topo copiam o mês anterior ou preenchem todos os campos com as médias de uma vez.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="plano-copiar"]'))
        await h.mover(h.page.locator('[data-acao="plano-media"]'))
        await h.mover(h.page.locator('[data-acao="plano-limpar"]'))
      } },
  ] },

  // ── Passo 3: a meta de economia
  capaDoPasso(2),
  { capitulo: 'O plano de Guardar', falas: [
    { texto: 'A meta de economia é o plano de Guardar. Ela fica no Início, no cartão Meta de economia.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'inicio')
        await h.mover(h.page.locator('#h-meta'))
        await h.mover(h.page.locator('[data-foco="meta-guardar"]'))
      } },
    { texto: 'Enquanto a transferência não é lançada, a meta entra no disponível como plano sem lançamento.',
      acao: async (h) => {
        await h.mover(h.page.locator('#h-meta'))
        await h.mover(h.page.locator('.heroi-legenda'))
      } },
  ] },
  { capitulo: 'Confirmar a transferência', falas: [
    { texto: 'O botão Confirmar lança a transferência com a data de hoje, como um gasto na categoria Guardar.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="meta-confirmar"]'))
        await h.clicar(h.page.locator('[data-foco="meta-confirmar"]'))
        await h.esperar(700)
        await moverAviso(h)
      } },
    { texto: 'O aviso confirma o valor guardado; a meta deixa de ser previsto e passa a ser realizado.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await h.mover(h.page.locator('#h-meta'))
        await h.mover(h.page.locator('.kpi').nth(3), { parcial: true })
      } },
    { texto: 'No disponível, o valor sai de planos sem lançamento e entra em já saiu; o total continua o mesmo quando a transferência é igual à meta.',
      acao: async (h) => {
        await h.mover(h.page.locator('.heroi-legenda'))
        await h.mover(h.page.locator('.numero-heroi'))
        await fecharAviso(h)
      } },
  ] },

  { falas: [
    { texto: 'Pronto! Agora você sabe planejar o mês e guardar a meta. No próximo vídeo, você vai ver o extrato e a planilha.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
