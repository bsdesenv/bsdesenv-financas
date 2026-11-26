// Vídeo 7: Ajustes (nome, tema, categorias, cartões), backup/CSV e importação, atualizações e diagnósticos.
// Rótulos e seletores vêm de docs/USAR.md e da exploração (explorar/ui-10-ajustes.png, ui7-*).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { capas } from '../comum.mjs'
import { ajustarTela, moverAviso, fecharAviso, fecharFolha } from '../auxiliar.mjs'
import { pastas } from '../pastas.mjs'

const BACKUP = join(pastas().video, 'backup-de-exemplo.json')
mkdirSync(dirname(BACKUP), { recursive: true })
writeFileSync(BACKUP, JSON.stringify({
  app: 'bsdesenv-financas',
  versao: 3,
  nome: 'Controle de exemplo',
  exportadoEm: '2026-11-01T12:00:00.000Z',
  categorias: [
    { id: 'guardar', nome: 'Guardar', grupo: 'fixo', ordem: 1 },
    { id: 'mercado', nome: 'Mercado', grupo: 'variavel', ordem: 2 },
  ],
  anos: { 2026: { lancamentos: [{ id: 'ex1', mes: 11, dia: 5, categoriaId: 'mercado', descricao: 'Feira', valor: 120 }], orcamento: { guardar: { 11: 500 } } } },
  config: { tema: 'auto', marcas: {}, fechados: {}, categoriaGuardar: 'guardar', categoriaSobra: '' },
}, null, 1))

export const VIDEO_INFO = {
  titulo: 'Ajustes e<br>backup',
  subtitulo: 'Deixar o app com a sua cara e guardar uma cópia dos dados.',
  encerramento: 'Fim da série. Reveja os vídeos na playlist.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'Geral e categorias', topicos: ['O nome', 'O tema', 'A lista de categorias'] },
  { titulo: 'Cartões de crédito', topicos: ['A lista', 'Novo cartão', 'Editar e arquivar'] },
  { titulo: 'Seus dados', topicos: ['Baixar o backup', 'Os CSVs', 'Importar um backup'] },
  { titulo: 'Atualizações e diagnósticos', topicos: ['Verificar agora', 'Diagnósticos'] },
]
const capaDoPasso = capas(PARTES)

const secao = (h, nome) => h.page.locator('[data-acao="aj-secao"]').filter({ hasText: nome }).first()

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai ajustar o Finanças, cadastrar um cartão e guardar uma cópia dos seus dados.',
      acao: async (h) => { await ajustarTela(h); await h.capaAbertura() } },
    { texto: 'Os Ajustes reúnem o nome do controle, o tema, as categorias, os cartões, o backup e as atualizações.',
      acao: async () => {} },
  ] },
  { falas: [
    { texto: 'O vídeo tem quatro passos: geral e categorias; cartões; seus dados; e, por fim, atualizações e diagnósticos.',
      acao: async (h) => { await h.indice() } },
  ] },

  // ── Passo 1: geral e categorias
  capaDoPasso(0),
  { capitulo: 'O nome', falas: [
    { texto: 'Em Ajustes, o índice fica à esquerda e a seção à direita. Começamos em Geral.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(h.page.locator('[data-tela="ajustes"]').first())
        await h.esperar(700)
        await h.mover(h.page.locator('.aj-indice'))
        await h.mover(h.page.locator('#aj-nome'))
      } },
    { texto: 'O nome do controle aparece no menu. Troco para Nossa casa e saio do campo.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#aj-nome'), 'Nossa casa')
        await h.page.locator('#aj-nome').blur()
        await h.esperar(600)
        await h.mover(h.page.locator('.lateral-marca strong'))
      } },
  ] },
  { capitulo: 'O tema', falas: [
    { texto: 'Em Aparência, Automático segue o tema do sistema; Claro e Escuro fixam o tema do app.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="tema-auto"]'))
        await h.mover(h.page.locator('[data-foco="tema-claro"]'))
        await h.mover(h.page.locator('[data-foco="tema-escuro"]'))
      } },
    { texto: 'Clique em Escuro para ver o app inteiro no tema escuro. Depois volto para Automático.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="tema-escuro"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('.lateral-marca strong'))
        await h.clicar(h.page.locator('[data-foco="tema-auto"]'))
        await h.esperar(500)
      } },
  ] },
  { capitulo: 'A lista de categorias', falas: [
    { texto: 'Em Categorias, cada linha mostra a cor, o nome e quantos lançamentos ela tem. Os selos economia e sobra ficam onde se aplicam.',
      acao: async (h) => {
        await h.clicar(secao(h, 'Categorias'))
        await h.esperar(600)
        await h.mover(h.page.locator('.aj-conteudo, #tela').getByText('Fixos ·').first())
        await h.mover(h.page.locator('[data-acao="cat-editar"]').filter({ hasText: 'Guardar' }).first())
      } },
    { texto: 'Ordenar mostra setas e a alça para arrastar dentro do grupo. Concluir sai do modo.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="cat-ordenar"]'))
        await h.esperar(600)
        await h.clicar(h.page.locator('[data-foco="cat-ordenar"]'))
        await h.esperar(500)
      } },
    { texto: 'Nova em Fixos cria uma categoria. Aqui, Nome, Grupo e Adicionar; por enquanto, cancelo.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="cat-nova-fixo"]'))
        await h.esperar(600)
        await h.mover(h.page.locator('.folha input').first())
        await h.mover(h.page.locator('[data-f="grupo"]').first())
        await h.mover(h.page.locator('[data-f="criar"]'))
        await fecharFolha(h)
      } },
    { texto: 'Tocar numa categoria abre o painel. Não dá para apagar uma que tem lançamentos, e o motivo aparece embaixo.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="cat-editar"]').filter({ hasText: 'Mercado' }).first())
        await h.esperar(600)
        await h.mover(h.page.locator('.folha input').first())
        await h.mover(h.page.locator('[data-f="apagar"]'))
        await h.mover(h.page.locator('.folha .sub').filter({ hasText: 'lançamentos' }).first())
        await fecharFolha(h)
      } },
  ] },

  // ── Passo 2: cartões
  capaDoPasso(1),
  { capitulo: 'A lista', falas: [
    { texto: 'Em Cartões, o Cartão Azul aparece com fechamento, vencimento e limite. Embaixo ficam os arquivados.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(secao(h, 'Cartões'))
        await h.esperar(600)
        await h.mover(h.page.locator('.rc-item').first())
        await h.mover(h.page.locator('[data-acao="cartao-reativar"]').first())
      } },
    { texto: 'Editar abre os dias de fechamento e vencimento, o limite e o botão Arquivar. Este cartão tem compras: não se apaga, só se arquiva.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-acao="cartao-editar"]').first())
        await h.esperar(600)
        await h.mover(h.page.locator('#cc-fecha'))
        await h.mover(h.page.locator('#cc-vence'))
        await h.mover(h.page.locator('#cc-limite'))
        await h.mover(h.page.locator('[data-f="arquivar"]'))
        await fecharFolha(h)
      } },
  ] },
  { capitulo: 'Novo cartão', falas: [
    { texto: 'Novo cartão pede o nome, o dia em que a fatura fecha o dia do vencimento e, se quiser, o limite.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="cartao-novo"]'))
        await h.esperar(600)
        await h.mover(h.page.locator('#cc-nome'))
        await h.mover(h.page.locator('#cc-fecha'))
        await h.mover(h.page.locator('#cc-vence'))
        await h.mover(h.page.locator('#cc-limite'))
      } },
    { texto: 'Preencho Cartão Verde, fecha dia oito, vence dia quinze e limite de cinco mil. Criar cartão grava.',
      acao: async (h) => {
        await h.digitar(h.page.locator('#cc-nome'), 'Cartão Verde')
        await h.digitar(h.page.locator('#cc-fecha'), '8')
        await h.digitar(h.page.locator('#cc-vence'), '15')
        await h.digitar(h.page.locator('#cc-limite'), '5000')
        await h.clicar(h.page.locator('[data-f="salvar"]').last())
        await h.esperar(700)
        await moverAviso(h)
        await h.mover(h.page.locator('.rc-item').filter({ hasText: 'Cartão Verde' }).first())
      } },
    { texto: 'O cartão novo entra na lista e já aparece em Pago com, no Novo lançamento.',
      acao: async (h) => {
        await h.mover(h.page.locator('.rc-item').filter({ hasText: 'Cartão Verde' }).first())
        await h.mover(h.page.locator('.aj-indice'))
      } },
  ] },

  // ── Passo 3: seus dados
  capaDoPasso(2),
  { capitulo: 'Baixar o backup', falas: [
    { texto: 'Seus dados mostra onde tudo fica e os botões de backup. Baixar backup (JSON) guarda uma cópia completa.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(secao(h, 'Seus dados'))
        await h.esperar(600)
        await h.mover(h.page.locator('[data-foco="exp-json"]'))
      } },
    { texto: 'O último backup fica anotado neste aparelho. Os dois CSVs abrem no Excel ou no Sheets.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="exp-json"]'))
        await h.esperar(1200)
        await h.mover(h.page.getByText('Último backup').first())
      } },
  ] },
  { capitulo: 'Os CSVs', falas: [
    { texto: 'CSV dos lançamentos traz a lista completa; CSV da tabela traz a planilha do ano, como você vê na tela.',
      acao: async (h) => {
        await h.mover(h.page.locator('[data-foco="exp-json"]'))
        await h.mover(h.page.getByText('Último backup').first())
      } },
  ] },
  { capitulo: 'Importar um backup', falas: [
    { texto: 'Importar backup lê um JSON baixado aqui. O app mostra antes quantas categorias, lançamentos e anos vêm no arquivo.',
      acao: async (h) => {
        await h.page.locator('[data-foco="importar"]').click()
        await h.esperar(700)
        await h.page.locator('.folha input[type="file"]').setInputFiles(BACKUP)
        await h.esperar(900)
        await h.mover(h.page.locator('.folha .previa'))
      } },
    { texto: 'Dá para juntar com o que já existe ou substituir tudo, que pede a palavra SUBSTITUIR. Por enquanto, fecho.',
      acao: async (h) => {
        await h.page.locator('.folha').evaluate((el) => { const c = el.querySelector('.folha-corpo'); if (c) c.scrollTop = c.scrollHeight })
        await h.esperar(400)
        await h.page.locator('input[name="im-modo"][value="substituir"]').check()
        await h.esperar(400)
        await h.mover(h.page.locator('#im-confirma'))
        await fecharFolha(h)
      } },
  ] },

  // ── Passo 4: atualizações e diagnósticos
  capaDoPasso(3),
  { capitulo: 'Verificar agora', falas: [
    { texto: 'Em Atualizações, o app mostra a versão instalada e procura uma nova uma vez por dia.',
      acao: async (h) => {
        await h.semCapa()
        await h.clicar(secao(h, 'Atualizações'))
        await h.esperar(600)
        await h.pagina.context().route('**/versao.json', (rota) => rota.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ app: 'bsdesenv-financas', versao: '3.6.0', ref: 'main', data: '2026-11-26', novidades: [] }),
        }))
        await h.mover(h.page.locator('[data-foco="atu-auto"]'))
        await h.mover(h.page.locator('[data-foco="atu-sobre"]'))
        await h.mover(h.page.locator('[data-foco="atu-verificar"]'))
      } },
    { texto: 'Verificar agora confere na hora. Como esta é a versão mais nova, aparece Atualizado com a hora.',
      acao: async (h) => {
        await h.clicar(h.page.locator('[data-foco="atu-verificar"]'))
        await h.esperar(1500)
        await h.mover(h.page.locator('#atu-estado'))
      } },
  ] },
  { capitulo: 'Diagnósticos', falas: [
    { texto: 'Diagnósticos mostra versão, revisão, fila e os sinais da planilha. Só contagens e datas, sem nomes nem valores.',
      acao: async (h) => {
        await h.clicar(secao(h, 'Diagnósticos'))
        await h.esperar(600)
        await h.clicar(h.page.locator('[data-acao="diagnosticos"]'))
        await h.esperar(700)
        await h.mover(h.page.locator('.folha .diag-lista, .folha table').first())
        await h.mover(h.page.locator('.folha').getByText('Versão do app').first())
      } },
    { texto: 'Copiar diagnóstico leva esse resumo para a área de transferência, útil quando você pede ajuda.',
      acao: async (h) => {
        await h.mover(h.page.locator('.folha [data-f="copiar"]'))
        await h.clicar(h.page.locator('.folha [data-f="copiar"]'))
        await h.esperar(600)
        await moverAviso(h)
      } },
  ] },

  { falas: [
    { texto: 'Pronto! Você chegou ao fim da série. Reveja os vídeos na playlist sempre que precisar.',
      acao: async (h) => { await h.esperar(1200); await h.capaEncerramento() } },
  ] },
]
