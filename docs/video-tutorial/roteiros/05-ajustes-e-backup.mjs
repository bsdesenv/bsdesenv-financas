// Vídeo 5: Ajustes (nome, tema, categorias) e o backup em JSON (baixar e importar).
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/10-ajustes.png).
import { readFile } from 'node:fs/promises'
import { capas } from '../comum.mjs'
import { ajustarTela, irTela, moverAviso, fecharAviso } from '../auxiliar.mjs'

export const VIDEO_INFO = {
  titulo: 'Ajustes e<br>backup',
  subtitulo: 'Deixar o app com a sua cara e guardar uma cópia dos dados.',
  encerramento: 'Fim da série. Reveja os vídeos na playlist.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'Nome e tema', topicos: ['O nome do controle', 'Claro, escuro ou automático'] },
  { titulo: 'As categorias', topicos: ['Renomear e reordenar', 'Criar e apagar'] },
  { titulo: 'O backup', topicos: ['Baixar o JSON', 'Importar de volta'] },
]
const capaDoPasso = capas(PARTES)

const cardSeusDados = (h) => h.page.locator('.ajustes section.cartao').filter({ hasText: 'Seus dados' }).first()

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai ajustar o Finanças e aprender a guardar uma cópia dos seus dados.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'Os Ajustes reúnem o nome do controle, o tema, as categorias e o backup.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem três passos: o nome e o tema; as categorias; e, por fim, o backup.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: nome e tema
  capaDoPasso(0),
  { capitulo: 'O nome do controle', falas: [
    { texto: 'Na tela Ajustes, o nome do controle aparece no topo e no menu.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'ajustes')
        await h.mover(h.page.locator('[data-foco="aj-nome"]'))
        await h.mover(h.page.locator('.lateral-marca strong'))
      } },
    { texto: 'Vou trocar por Nossa casa e sair do campo. O nome novo aparece na hora.',
      acao: async (h) => {
        await h.digitar(h.page.locator('[data-foco="aj-nome"]'), 'Nossa casa')
        await h.pagina.keyboard.press('Tab')
        await h.esperar(600)
        await h.mover(h.page.locator('.lateral-marca strong'))
      } },
  ] },
  { capitulo: 'Claro, escuro ou automático', falas: [
    { texto: 'Em Aparência, Automático segue o tema do sistema; Claro e Escuro fixam o tema do app.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-acao="tema"][data-tema="auto"]'))
        await h.mover(h.page.locator('[data-acao="tema"][data-tema="claro"]'))
        await h.mover(h.page.locator('[data-acao="tema"][data-tema="escuro"]'))
      } },
    { texto: 'Clique em Escuro para ver o app no tema escuro.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="tema"][data-tema="escuro"]'))
        await h.esperar(900)
        await h.mover(h.page.locator('.lateral-marca'))
        await h.mover(h.page.locator('.ajustes section.cartao').first(), { parcial: true })
      } },
    { texto: 'O tema vale para o app inteiro. Volto para o Claro para seguir o vídeo.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="tema"][data-tema="claro"]'))
        await h.esperar(900)
        await h.mover(h.page.locator('.ajustes section.cartao').first(), { parcial: true })
      } },
  ] },

  // ── Passo 2: as categorias
  capaDoPasso(1),
  { capitulo: 'Renomear e reordenar', falas: [
    { texto: 'Em Categorias, cada linha tem o nome, o grupo, as setas de ordem e a lixeira.',
      acao: async (h) => {
        await h.semCapa()
        const linha = h.page.locator('.linha-ajuste').first()
        await h.mover(linha.locator('input'), { parcial: true })
        await h.mover(linha.locator('select'))
        await h.mover(linha.locator('[data-acao="cat-mover"]').first())
        await h.mover(linha.locator('[data-acao="cat-mover"]').last())
      } },
    { texto: 'A ordem daqui é a ordem das listas e da planilha. As setas sobem e descem a categoria.',
      acao: async (h) => {
        await h.mover(h.page.locator('.linha-ajuste').nth(1), { parcial: true })
        await h.mover(h.page.locator('.linha-ajuste').nth(1).locator('[data-acao="cat-mover"]').last())
      } },
    { texto: 'Categorias que já têm lançamentos não podem ser apagadas; a lixeira fica desativada.',
      acao: async (h) => {
        await h.mover(h.page.locator('.linha-ajuste').first().locator('[data-acao="cat-apagar"]'))
      } },
  ] },
  { capitulo: 'Criar e apagar', falas: [
    { texto: 'Para criar, escreva o nome no campo Nova categoria, escolha o grupo e clique em Adicionar.',
      acao: async (h) => {
        await h.mover(h.page.locator('#nova-cat-nome'))
        await h.mover(h.page.locator('#nova-cat-grupo'))
        await h.mover(h.page.locator('[data-acao="cat-nova"]'))
      } },
    { texto: 'Para apagar uma categoria sem lançamentos, use a lixeira; o aviso ainda permite desfazer.',
      acao: async (h) => {
        await h.mover(h.page.locator('.linha-ajuste').first().locator('[data-acao="cat-apagar"]'))
      } },
  ] },

  // ── Passo 3: o backup
  capaDoPasso(2),
  { capitulo: 'Baixar o JSON', falas: [
    { texto: 'Em Seus dados ficam os botões do backup e da planilha.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(cardSeusDados(h), { parcial: true })
        await h.mover(cardSeusDados(h).locator('a.botao').first())
        await h.mover(h.page.locator('[data-foco="exp-json"]'))
        await h.mover(h.page.locator('[data-foco="exp-csv2"]'))
        await h.mover(h.page.locator('[data-foco="importar"]'))
      } },
    { texto: 'Baixar backup salva um arquivo JSON com as categorias, os lançamentos e os planos.',
      acao: async (h) => {
        const baixado = h.pagina.waitForEvent('download', { timeout: 30000 })
        await h.clicar(h.page.locator('[data-foco="exp-json"]'))
        const dl = await baixado
        h.__backup = { nome: dl.suggestedFilename() || 'financas-backup.json', buffer: await readFile(await dl.path()) }
        await h.esperar(700)
        await h.mover(h.page.locator('[data-foco="exp-json"]'))
      } },
    { texto: 'Exportar CSV gera a lista de lançamentos para abrir no Excel ou no Google Sheets.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="exp-csv2"]'))
        await h.mover(h.page.locator('.lat-rodape'))
      } },
  ] },
  { capitulo: 'Importar de volta', falas: [
    { texto: 'Importar backup abre um arquivo baixado antes, desta versão ou da anterior.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="importar"]'))
        await h.esperar(600)
        await h.mover(h.page.locator('.folha h2'))
        await h.mover(h.page.locator('#im-arquivo'))
      } },
    { texto: 'Escolho o arquivo que acabei de baixar. O app mostra quantas categorias, lançamentos e anos vieram.',
      acao: async (h) => {
        await h.page.locator('#im-arquivo').setInputFiles({ name: h.__backup.nome, mimeType: 'application/json', buffer: h.__backup.buffer })
        await h.page.locator('#im-previa .previa').waitFor({ timeout: 20000 })
        await h.mover(h.page.locator('#im-previa .previa'), { parcial: true })
      } },
    { texto: 'Dá para juntar com o que já existe ou substituir tudo. Vou juntar, que é o padrão, e clicar em Importar.',
      acao: async (h) => {
        await h.mover(h.page.locator('#im-previa .opcao').first())
        await h.mover(h.page.locator('#im-previa .opcao').last())
        await h.clicar(h.page.locator('#im-botao'))
        await h.page.locator('#avisos .aviso').filter({ hasText: 'Importação concluída' }).waitFor({ timeout: 30000 })
        await moverAviso(h)
      } },
    { texto: 'A importação é confirmada e a planilha fica com os dados do arquivo. O Google ainda guarda versões antigas em Arquivo, Histórico de versões.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-txt'))
        await h.mover(cardSeusDados(h), { parcial: true })
      } },
  ] },

  { falas: [
    { texto: 'Pronto! Você chegou ao fim da série do Finanças. Reveja os outros vídeos na playlist e bons lançamentos.',
      acao: async (h) => { await fecharAviso(h); await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
