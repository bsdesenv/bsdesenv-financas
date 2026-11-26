// Vídeo 1: a tela Início na versão 3.x. O disponível, a composição, o que falta pagar, o plano do mês, onde foi o
// dinheiro e o seletor de mês. Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/ui-01-inicio.png).
import { capas } from '../comum.mjs'
import { ajustarTela, acao, fecharFolha, moverAviso, fecharAviso, cardCom } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Primeiros<br>passos',
  subtitulo: 'Ler o disponível, o que falta pagar e o plano do mês.',
  encerramento: 'Próximo vídeo: lançar e corrigir um gasto.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'O disponível', topicos: ['O número grande', 'A composição', 'Revisar sobras'] },
  { titulo: 'O que falta pagar', topicos: ['Contas e vencimentos', 'Guardar', 'A receber'] },
  { titulo: 'O plano do mês', topicos: ['O ritmo', 'Meta de economia', 'Avisos'] },
  { titulo: 'Onde foi o dinheiro', topicos: ['As barras', 'Últimos lançamentos', 'Escolher o mês'] },
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
    { texto: 'O vídeo tem quatro passos: o disponível; o que falta pagar; o plano do mês; e, por fim, onde foi o dinheiro.',
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
    { texto: 'Abaixo dele, o app estima quanto isso dá por dia, já descontando as contas e os planos que ainda faltam.',
      acao: async (h) => {
        await h.mover(h.page.locator('.heroi-principal > .sub'))
        await h.mover(h.page.locator('.heroi-nota'))
      } },
    { texto: 'A lista explica a conta: renda do mês, o que já saiu, as contas a pagar, o que falta guardar e o que ainda está nos planos.',
      acao: async (h) => {
        await h.mover(h.page.locator('.heroi-composicao'), { parcial: true })
        await h.mover(h.page.locator('.heroi-composicao > div').filter({ hasText: 'Ainda nos planos' }))
      } },
  ] },
  { capitulo: 'A composição', falas: [
    { texto: 'O anel ao lado mostra a mesma divisão em porcentagem. Quanto maior a fatia verde, mais sobra para gastar.',
      acao: async (h) => {
        await h.mover(h.page.locator('.anel'))
      } },
    { texto: 'Ver composição abre a conta inteira. Embaixo, cada plano que ainda reserva dinheiro aparece com o botão Liberar.',
      acao: async (h) => {
        await h.clicar(acao(h, 'detalhe-reserva'))
        await h.esperar(600)
        await h.mover(h.page.locator('.folha h2'))
        await h.mover(h.page.locator('.folha .conta-heroi .total'))
        await h.mover(h.page.locator('.folha').getByText('Ainda nos planos').first())
        await h.mover(h.page.locator('.folha [data-f="liberar"]').first())
      } },
  ] },
  { capitulo: 'Revisar sobras', falas: [
    { texto: 'Perto do fim do mês, o Início lembra de revisar o que ainda está reservado: algum plano já acabou?',
      acao: async (h) => {
        await fecharFolha(h)
        await h.mover(h.page.locator('.heroi-revisar'))
        await h.mover(acao(h, 'revisar-sobras'))
      } },
    { texto: 'Revisar sobras abre a composição já nos planos restantes, pronta para liberar o que você não vai mais gastar.',
      acao: async (h) => {
        await h.clicar(acao(h, 'revisar-sobras'))
        await h.esperar(700)
        await h.mover(h.page.locator('.folha').getByText('Ainda nos planos').first())
        await h.mover(h.page.locator('.folha [data-f="liberar-todos"]'))
      } },
  ] },

  // ── Passo 2: o que falta pagar
  capaDoPasso(1, async (h) => { await fecharFolha(h) }),
  { capitulo: 'Contas e vencimentos', falas: [
    { texto: 'O cartão O que falta pagar reúne as contas fixas e a meta de guardar que ainda não foram lançadas.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(cardCom(h, 'h-vencer'), { parcial: true })
        await h.mover(h.page.locator('.g-pagar .grupo-titulo').first())
      } },
    { texto: 'Cada conta mostra a situação: vence dia 28, vence hoje ou atrasada desde o dia 20. Confirmar lança o que falta.',
      acao: async (h) => {
        await h.mover(h.page.locator('.item-vencer').filter({ hasText: 'Plano de saúde' }).first())
        await h.mover(h.page.locator('[data-acao="confirmar"][data-foco="conf-plano-saude"]'))
        await h.mover(h.page.locator('.item-vencer').filter({ hasText: 'Contas da casa' }).first())
      } },
    { texto: 'Se uma conta veio mais barata e você não vai gastar o resto, Liberar devolve ao disponível o que faltava.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="encerrar"][data-foco="quit-contas-casa"]'))
      } },
  ] },
  { capitulo: 'Guardar', falas: [
    { texto: 'Guardar tem um bloco próprio: é a sua meta de economia, e o botão Guardar lança a transferência.',
      acao: async (h) => {
        await h.mover(h.page.locator('.item-vencer').filter({ hasText: 'Guardar' }).first())
        await h.mover(h.page.locator('[data-acao="confirmar"][data-foco="conf-guardar"]'))
      } },
  ] },
  { capitulo: 'A receber', falas: [
    { texto: 'A receber mostra as rendas que ainda não entraram. Recebi lança o que chegou; Não vem tira o que não vai entrar.',
      acao: async (h) => {
        await h.mover(h.page.locator('.g-pagar').getByText('A receber').first())
        await h.mover(h.page.locator('.item-vencer').filter({ hasText: 'Renda extra' }).first())
        await h.mover(h.page.locator('[data-acao="confirmar"][data-foco="conf-renda-extra"]'))
      } },
  ] },

  // ── Passo 3: o plano do mês
  capaDoPasso(2),
  { capitulo: 'O ritmo', falas: [
    { texto: 'O Plano do mês mostra se o gasto está no ritmo do plano. A barra é só comparação: gastar dentro do plano não tira o disponível.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(cardCom(h, 'h-planos'), { parcial: true })
        await h.mover(h.page.locator('.plano-ritmo .barra'))
        await h.mover(h.page.locator('.plano-ritmo .legenda-barra'))
      } },
  ] },
  { capitulo: 'Meta de economia', falas: [
    { texto: 'Na Meta de economia, digite quanto quer guardar neste mês. A palavra salvo aparece ao gravar.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="meta-guardar"]'))
        await h.mover(h.page.locator('[data-foco="meta-sugestao"]'))
        await h.mover(h.page.locator('[data-foco="meta-limpar"]'))
      } },
    { texto: 'Usar sugestão aplica oitenta por cento da sua sobra média dos três meses fechados anteriores.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="meta-sugestao"]'))
      } },
  ] },
  { capitulo: 'Avisos', falas: [
    { texto: 'Embaixo, as categorias variáveis comparam gasto e plano. Mercado, Lazer e Compras passaram do plano neste mês.',
      acao: async (h) => {
        await h.mover(h.page.locator('.g-planos .linha-cat').filter({ hasText: 'Mercado' }).first())
        await h.mover(h.page.locator('.g-planos .linha-cat').filter({ hasText: 'Lazer' }).first())
      } },
    { texto: 'Os avisos apontam o que passou do plano; Ver lançamentos abre as contas que somaram a categoria.',
      acao: async (h) => {
        await h.mover(h.page.locator('.g-planos .aviso-item').first())
        const det = h.page.locator('.g-planos .aviso-detalhe summary').first()
        if (await det.count()) { await h.clicar(det); await h.esperar(500); await h.mover(h.page.locator('.g-planos .aviso-contas').first()) }
        await h.mover(h.page.locator('.g-planos [data-foco="ver-todas"]'))
      } },
  ] },

  // ── Passo 4: onde foi o dinheiro
  capaDoPasso(3),
  { capitulo: 'As barras', falas: [
    { texto: 'Onde foi mostra as maiores saídas do mês, com valor e porcentagem. Moradia e Mercado puxam a lista.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(cardCom(h, 'h-onde'), { parcial: true })
        await h.mover(h.page.locator('.g-onde .onde-linha').first())
        await h.mover(h.page.locator('.g-onde .onde-linha').nth(1))
      } },
  ] },
  { capitulo: 'Últimos lançamentos', falas: [
    { texto: 'Os últimos lançamentos ficam à mão. Ver extrato abre a lista completa, que tem um vídeo só dela.',
      acao: async (h) => {
        await h.mover(cardCom(h, 'h-ult'), { parcial: true })
        await h.mover(h.page.locator('.g-ultimos .linha-lanc').first())
        await h.mover(h.page.locator('[data-foco="ver-extrato"]'))
      } },
  ] },
  { capitulo: 'Escolher o mês', falas: [
    { texto: 'No topo, as setas andam mês a mês. Tocar no nome do mês abre a grade do ano, com Hoje e Copiar link deste mês.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="seletor-mes"]'))
        await h.esperar(600)
        await h.mover(h.page.locator('.folha .mes-opcao').first(), { parcial: true })
        await h.mover(h.page.locator('.folha [data-f="link"]'))
      } },
    { texto: 'Setembro já está fechado: tocar nele mostra a sobra realizada daquele mês, não mais o previsto.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.folha .mes-opcao[data-m="9"]'))
        await h.esperar(800)
        await h.mover(h.page.locator('#h-fecho'))
        await h.mover(h.page.locator('.numero-heroi'))
        await h.mover(h.page.locator('.chip-fechado'))
      } },
    { texto: 'Hoje volta para o mês atual, e o endereço do app acompanha o mês que você está vendo.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="mes-hoje"]'))
        await h.esperar(800)
        await h.mover(h.page.locator('.navmes-txt h1, [data-foco="seletor-mes"]').first())
      } },
  ] },

  { falas: [
    { texto: 'Pronto! Agora você já sabe ler o Início. No próximo vídeo, você vai lançar um gasto e corrigir quando errar.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
