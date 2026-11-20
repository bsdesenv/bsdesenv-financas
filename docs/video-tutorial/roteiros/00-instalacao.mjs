// Vídeo 00: instalação do Finanças, do GitHub à primeira abertura. É um vídeo especial: a tela é a UI real do Google
// (GitHub, Sheets e Apps Script), capturada com as contas mascaradas; a montagem é a de `instalacao/montar.mjs`.
import { capas } from '../comum.mjs'

export const VIDEO_INFO = {
  titulo: 'Instalar o<br>Finanças',
  subtitulo: 'Do GitHub à primeira abertura, em cinco passos.',
  encerramento: 'Pronto! O app está instalado. Siga a série para usar.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'Baixar o projeto', topicos: ['O GitHub', 'Download ou clone', 'Os arquivos'] },
  { titulo: 'Criar a planilha', topicos: ['A planilha nova', 'O nome', 'Extensões'] },
  { titulo: 'Colar no Apps Script', topicos: ['O editor', 'Os quatro arquivos', 'Salvar'] },
  { titulo: 'Publicar', topicos: ['Nova implantação', 'App da Web', 'Autorizar'] },
  { titulo: 'Primeiro acesso', topicos: ['Abrir o endereço', 'Nome e modelo', 'A tela inicial'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai instalar o Finanças do zero, direto do GitHub, e abrir o app pela primeira vez.',
      slide: 'abertura', acao: async () => {} },
    { texto: 'O Finanças roda na sua conta Google, numa planilha sua. A instalação é feita uma vez, no computador.',
      slide: 'abertura', acao: async () => {} },
  ] },
  { falas: [
    { texto: 'São cinco passos: baixar o projeto; criar a planilha; colar no Apps Script; publicar; e, por fim, o primeiro acesso.',
      slide: 'indice', acao: async () => {} },
  ] },

  // ── Passo 1: baixar o projeto
  capaDoPasso(0),
  { capitulo: 'O GitHub', falas: [
    { texto: 'O projeto fica no GitHub. Você não precisa de conta: o repositório é público.',
      slide: 'github-repo', acao: async () => {} },
    { texto: 'Clique em Code. Para clonar, copie o endereço HTTPS; para baixar, use Download ZIP.',
      fala: 'Clique em Code. Para clonar, copie o endereço agá tê tê pê ésse; para baixar, use Download ZIP.',
      slide: 'github-code', acao: async () => {} },
  ] },
  { capitulo: 'Os arquivos', falas: [
    { texto: 'Tudo o que vai para o Apps Script está na pasta src: Codigo.gs e três arquivos HTML.',
      slide: 'github-src', acao: async () => {} },
    { texto: 'Abra Codigo.gs e clique no ícone de copiar. Repita com Index, Estilos e App.',
      slide: 'github-codigo', acao: async () => {} },
  ] },

  // ── Passo 2: criar a planilha
  capaDoPasso(1),
  { capitulo: 'A planilha nova', falas: [
    { texto: 'Abra sheets.new. O Google cria uma planilha nova, vazia.',
      slide: 'planilha-limpa', acao: async () => {} },
    { texto: 'Dê um nome no topo, como Finanças. Não precisa digitar nada na planilha.',
      slide: 'planilha-limpa', acao: async () => {} },
  ] },
  { capitulo: 'Extensões', falas: [
    { texto: 'No menu Extensões, escolha Apps Script. O editor abre numa aba nova.',
      slide: 'planilha-extensoes', acao: async () => {} },
  ] },

  // ── Passo 3: colar no Apps Script
  capaDoPasso(2),
  { capitulo: 'O editor', falas: [
    { texto: 'O editor já tem o arquivo Código.gs. Apague o exemplo e cole o Codigo.gs do projeto.',
      slide: 'apps-script-codigo', acao: async () => {} },
    { texto: 'Crie os arquivos HTML com o sinal de mais: Index, Estilos e App. Cole o conteúdo de cada um.',
      slide: 'apps-script-final', acao: async () => {} },
    { texto: 'Salve com Ctrl+S. A lista deve ficar com os quatro arquivos.',
      slide: 'apps-script-final', acao: async () => {} },
  ] },

  // ── Passo 4: publicar
  capaDoPasso(3),
  { capitulo: 'Nova implantação', falas: [
    { texto: 'Clique em Implantar e escolha Nova implantação.',
      slide: 'apps-script-implantacao', acao: async () => {} },
    { texto: 'Na engrenagem, selecione App da Web. Execute como Eu e Quem pode acessar Somente eu.',
      slide: 'apps-script-implantacao', acao: async () => {} },
  ] },
  { capitulo: 'Autorizar', falas: [
    { texto: 'Clique em Implantar. Na primeira vez, o Google pede a autorização.',
      slide: 'autorizar-consent2', acao: async () => {} },
    { texto: 'Confira a permissão, que é só para esta planilha, e clique em Continuar.',
      slide: 'autorizar-consent2', acao: async () => {} },
  ] },
  { capitulo: 'O endereço', falas: [
    { texto: 'Copie o endereço do app da Web, que termina em exec, e guarde. É por ele que você abre o app.',
      slide: 'apps-script-deploy-url', acao: async () => {} },
  ] },

  // ── Passo 5: primeiro acesso
  capaDoPasso(4),
  { capitulo: 'Abrir o endereço', falas: [
    { texto: 'Abra o endereço. No primeiro acesso, escolha um nome para o controle e o modelo de categorias.',
      slide: 'primeiro-acesso', acao: async () => {} },
    { texto: 'Eu escolho Essencial; ele já vem com Guardar, as contas da casa e as rendas. Clique em Começar.',
      slide: 'primeiro-acesso', acao: async () => {} },
  ] },
  { capitulo: 'A tela inicial', falas: [
    { texto: 'O app abre no Início. No começo, os números ficam zerados; você lança os gastos e o app calcula o disponível.',
      slide: 'app-inicio2', acao: async () => {} },
    { texto: 'No celular, abra o mesmo endereço com a mesma conta e use Adicionar à tela inicial.',
      slide: 'celular-inicio', acao: async () => {} },
  ] },

  { falas: [
    { texto: 'Pronto! O app está instalado. Agora siga a série para conhecer as telas e começar a usar.',
      slide: 'encerramento', acao: async () => {} },
  ] },
]
