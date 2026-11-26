// Vídeo 5: o Extrato (busca, escopo, filtros, resumo) e a importação de CSV/OFX do banco.
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/ui-04-extrato.png, ui6-01-importar-previa).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { capas } from '../comum.mjs'
import { ajustarTela, irTela, moverAviso, fecharAviso, fecharFolha } from '../auxiliar.mjs'
import { pastas } from '../pastas.mjs'

const ARQUIVO = join(pastas().video, 'extrato-do-banco.csv')
mkdirSync(dirname(ARQUIVO), { recursive: true })
writeFileSync(ARQUIVO, [
  'Data;Descrição;Valor',
  '20/11/2026;Padaria do bairro;-18,50',
  '21/11/2026;Farmácia Central;-64,20',
  '22/11/2026;Mercado Bom Preço;-132,90',
  '23/11/2026;Cinema do shopping;-48,00',
  '24/11/2026;Padaria do bairro;-18,50',
].join('\n'))

export const VIDEO_INFO = {
  titulo: 'Extrato e<br>importação',
  subtitulo: 'Achar um lançamento, filtrar e trazer o extrato do banco.',
  encerramento: 'Próximo vídeo: a planilha do ano e o fechamento.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'Buscar e filtrar', topicos: ['A busca', 'O escopo', 'Os filtros'] },
  { titulo: 'O resumo', topicos: ['Saídas e rendas', 'Abrir um lançamento'] },
  { titulo: 'Importar extrato', topicos: ['O arquivo', 'As colunas', 'A prévia'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai usar o Extrato do Finanças e importar o arquivo do seu banco.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'O Extrato é a lista completa dos lançamentos. A importação evita digitar linha por linha o que o banco já tem.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem três passos: buscar e filtrar; ler o resumo; e, por fim, importar o extrato do banco.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: buscar e filtrar
  capaDoPasso(0),
  { capitulo: 'A busca', falas: [
    { texto: 'Esta é a tela Extrato, com os lançamentos do mês agrupados por dia e o total de cada dia à direita.',
      acao: async (h) => {
        await h.semCapa()
        await irTela(h, 'extrato')
        await h.mover(h.page.locator('#busca'))
        await h.mover(h.page.locator('.dia-titulo').first())
      } },
    { texto: 'A busca procura por descrição, categoria ou valor. Digito mercado.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#busca'), 'mercado')
        await h.esperar(700)
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.linha-lanc').first())
      } },
  ] },
  { capitulo: 'O escopo', falas: [
    { texto: 'Quando há busca, dá para escolher entre No mês e No ano. O resumo diz quantos lançamentos o ano tem.',
      acao: async (h) => {
        await h.mover(h.page.locator('#extrato-filtros'))
        await h.mover(h.page.locator('[data-foco="escopo-mes"]'))
        await h.mover(h.page.locator('[data-foco="escopo-ano"]'))
      } },
    { texto: 'No ano inteiro, a busca encontra o mercado de outros meses e soma as saídas e as rendas encontradas.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="escopo-ano"]'))
        await h.esperar(600)
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.dia-titulo').first())
      } },
  ] },
  { capitulo: 'Os filtros', falas: [
    { texto: 'Os filtros separam Tudo, Saídas e Rendas. O seletor ao lado escolhe uma categoria.',
      acao: async (h) => {
        await h.page.locator('#busca').fill('')
        await h.esperar(500)
        await h.mover(h.page.locator('[data-foco="filtro-tudo"]'))
        await h.clicar(h.page.locator('[data-foco="filtro-rendas"]'))
        await h.esperar(600)
        await h.mover(h.page.locator('.linha-lanc').first())
      } },
    { texto: 'Com Rendas, só o salário aparece. Em Categoria, escolho Mercado para ver as compras do mês.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="filtro-tudo"]'))
        await h.esperar(400)
        await h.page.selectOption('[data-foco="filtro-cat"]', { label: 'Mercado' })
        await h.esperar(600)
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.linha-lanc').first())
        await h.page.selectOption('[data-foco="filtro-cat"]', '')
        await h.esperar(400)
      } },
  ] },

  // ── Passo 2: o resumo
  capaDoPasso(1),
  { capitulo: 'Saídas e rendas', falas: [
    { texto: 'O resumo do topo mostra quantos lançamentos o mês tem, o total das saídas e o das rendas.',
      acao: async (h) => {
        await h.semCapa()
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('#extrato-lista'))
      } },
  ] },
  { capitulo: 'Abrir um lançamento', falas: [
    { texto: 'Clicar num lançamento abre os detalhes: valor, categoria, data e descrição. É o mesmo lugar para corrigir.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.linha-lanc').first())
        await h.esperar(600)
        await h.mover(h.page.locator('#ed-valor'))
        await h.mover(h.page.locator('#ed-cat'))
        await h.mover(h.page.locator('#ed-data'))
      } },
    { texto: 'Duplicar repete o lançamento; Repetir no próximo mês e Repetir todo mês criam a próxima conta.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-f="duplicar"]'))
        await h.mover(h.page.locator('[data-f="prox-mes"]'))
        await h.mover(h.page.locator('[data-f="todo-mes"]'))
      } },
    { texto: 'Fecho sem alterar nada. Editar, apagar e desfazer ficaram no vídeo de lançamentos.',
      acao: async (h) => { await fecharFolha(h) } },
  ] },

  // ── Passo 3: importar
  capaDoPasso(2),
  { capitulo: 'O arquivo', falas: [
    { texto: 'Para trazer o extrato do banco, clique no botão de importar, ao lado da busca.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(h.page.locator('[data-acao="importar-extrato"]').filter({ visible: true }).first())
        await h.esperar(600)
        await h.mover(h.page.locator('.folha h2').last())
        await h.mover(h.page.locator('.folha input[type="file"]'))
      } },
    { texto: 'O banco oferece OFX ou CSV. Aqui, um CSV pequeno. O arquivo é lido no seu aparelho e não sai dele.',
      acao: async (h) => {
        await h.page.locator('.folha input[type="file"]').setInputFiles(ARQUIVO)
        await h.esperar(900)
        await h.mover(h.page.locator('.folha .ie-amostra'))
      } },
  ] },
  { capitulo: 'As colunas', falas: [
    { texto: 'O app reconhece as colunas de data, descrição e valor. Se o seu banco usar outro formato, basta trocar aqui.',
      acao: async (h) => {
        await h.mover(h.page.locator('.folha label').filter({ hasText: 'Data' }).first())
        await h.mover(h.page.locator('.folha label').filter({ hasText: 'Descrição' }).first())
        await h.mover(h.page.locator('.folha label').filter({ hasText: 'Valor' }).first())
      } },
    { texto: 'A categoria sugerida vem do seu histórico. Sem pista, vale a categoria padrão, e dá para trocar linha a linha.',
      acao: async (h) => {
        await h.mover(h.page.locator('.folha .ie-resumo'))
        await h.mover(h.page.locator('.folha .ie-linha').first())
        await h.mover(h.page.locator('.folha [data-f="backup"]'))
      } },
  ] },
  { capitulo: 'A prévia', falas: [
    { texto: 'A prévia diz quantas linhas entram, quantas ficam de fora e o total. Só entra o que estiver marcado.',
      acao: async (h) => {
        await h.mover(h.page.locator('.folha .ie-resumo'))
        await h.mover(h.page.locator('.folha [data-f="marcar-todas"]'))
        await h.mover(h.page.locator('.folha [data-f="importar"]'))
      } },
    { texto: 'Importo as cinco linhas. O aviso confirma e oferece Desfazer.',
      acao: async (h) => {
        await h.clicar(h.page.locator('.folha [data-f="importar"]'))
        await h.esperar(700)
        await moverAviso(h)
        await h.mover(h.page.locator('#avisos .aviso-txt'))
      } },
    { texto: 'As compras entram no extrato com a data do banco. Se algo vier errado, Desfazer apaga o lote inteiro.',
      acao: async (h) => {
        await h.mover(h.page.locator('#avisos .aviso-acao'))
        await fecharAviso(h)
        await h.mover(h.page.locator('#extrato-resumo'))
        await h.mover(h.page.locator('.linha-lanc').filter({ hasText: 'Padaria do bairro' }).first())
      } },
  ] },

  { falas: [
    { texto: 'Pronto! O extrato do banco está dentro do Finanças. No próximo vídeo, a planilha do ano e o fechamento do mês.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
