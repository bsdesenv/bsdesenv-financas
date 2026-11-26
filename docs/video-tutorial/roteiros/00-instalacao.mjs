// Vídeo 00: a instalação pelo instalador da bsdesenv, da página "Antes de começar" ao primeiro acesso no computador
// e no celular. É um vídeo especial: a tela é a UI real do instalador e do app, capturada por capturar-instalador.mjs;
// a montagem é a de `instalacao/montar.mjs`.
import { capas } from '../comum.mjs'

export const VIDEO_INFO = {
  titulo: 'Instalar o<br>Finanças',
  subtitulo: 'Do primeiro clique ao app no celular, em cinco passos.',
  encerramento: 'Pronto! O app está instalado. Siga a série para usar.',
  login: { modo: 'publico', rota: '/' },
}

export const PARTES = [
  { titulo: 'Antes de começar', topicos: ['O que vai acontecer', 'O aviso do Google', 'O que é criado'] },
  { titulo: 'Autorizar', topicos: ['O instalador', 'As permissões', 'A volta sozinha'] },
  { titulo: 'Ligar a API', topicos: ['A chave', 'Uma vez só', 'Conferir sozinho'] },
  { titulo: 'Nome e instalar', topicos: ['O nome da planilha', 'O progresso', 'O QR code'] },
  { titulo: 'Primeiro acesso', topicos: ['Nome e modelo', 'Seu mês', 'No celular'] },
]
const capaDoPasso = capas(PARTES)

export const ROTEIRO = [
  { abertura: true, falas: [
    { texto: 'Olá! Neste vídeo você vai instalar o Finanças na sua conta Google, do primeiro clique ao primeiro acesso.',
      slide: 'abertura', acao: async () => {} },
    { texto: 'O Finanças é um controle financeiro que roda numa planilha sua. A instalação é feita uma vez, no computador, e leva uns três minutos.',
      slide: 'abertura', acao: async () => {} },
  ] },
  { falas: [
    { texto: 'São cinco passos: antes de começar; autorizar; ligar a API; escolher o nome e instalar; e, por fim, o primeiro acesso.',
      slide: 'indice', acao: async () => {} },
  ] },

  // ── Passo 1: antes de começar
  capaDoPasso(0),
  { capitulo: 'O que vai acontecer', falas: [
    { texto: 'A página Antes de começar explica a instalação antes de abrir o instalador.',
      slide: 'antes-topo', acao: async () => {} },
    { texto: 'São quatro passos: autorizar o instalador, ligar a API uma vez, escolher o nome da planilha e instalar.',
      slide: 'antes-passos', acao: async () => {} },
  ] },
  { capitulo: 'O aviso do Google', falas: [
    { texto: 'O Google vai avisar que o app não foi verificado. É esperado: o código é aberto e o desenvolvedor é você mesmo.',
      slide: 'antes-aviso', acao: async () => {} },
    { texto: 'Você pode conferir o código no GitHub antes de autorizar. O instalador não lê seus dados nem outras planilhas.',
      slide: 'antes-aviso', acao: async () => {} },
  ] },
  { capitulo: 'O que é criado', falas: [
    { texto: 'Ele cria uma planilha no seu Drive, um projeto Apps Script vinculado a ela e um app da Web só seu.',
      slide: 'instalador-nome', acao: async () => {} },
  ] },

  // ── Passo 2: autorizar
  capaDoPasso(1),
  { capitulo: 'O instalador', falas: [
    { texto: 'Clique em Começar a instalação. O instalador abre no navegador e mostra o Passo 1 de 4.',
      slide: 'instalador-autorizar', acao: async () => {} },
    { texto: 'Na tela do Google, clique em Revisar permissões e escolha a sua conta.',
      slide: 'instalador-autorizar', acao: async () => {} },
  ] },
  { capitulo: 'As permissões', falas: [
    { texto: 'Marque todas as permissões, ou Selecionar tudo, e continue. Sem todas, o instalador não consegue criar o Finanças.',
      slide: 'instalador-autorizar', acao: async () => {} },
    { texto: 'Se aparecer o aviso de app não verificado, escolha Avançado e depois Acessar Finanças · instalador.',
      slide: 'antes-aviso', acao: async () => {} },
  ] },
  { capitulo: 'A volta sozinha', falas: [
    { texto: 'Ao voltar para a aba, o instalador confere sozinho e avança. Se não avançar, clique em Já autorizei.',
      slide: 'instalador-autorizar', acao: async () => {} },
  ] },

  // ── Passo 3: ligar a API
  capaDoPasso(2),
  { capitulo: 'A chave', falas: [
    { texto: 'Se o instalador pedir, ligue uma vez a chave API Google Apps Script nas configurações da conta.',
      slide: 'instalador-api', acao: async () => {} },
    { texto: 'Abra as configurações pelo botão, ligue a chave e volte. O instalador espera você e avança para o passo 3.',
      slide: 'instalador-api', acao: async () => {} },
  ] },

  // ── Passo 4: nome e instalar
  capaDoPasso(3),
  { capitulo: 'O nome da planilha', falas: [
    { texto: 'Escolha o nome da planilha. É o nome que aparece no seu Drive e onde os seus dados ficam.',
      slide: 'instalador-nome', acao: async () => {} },
    { texto: 'Confira O que será criado e clique em Continuar.',
      slide: 'instalador-nome', acao: async () => {} },
  ] },
  { capitulo: 'O progresso', falas: [
    { texto: 'Clique em Instalar o Finanças. Leva uns vinte segundos e cada etapa ganha um certo quando termina.',
      slide: 'instalador-instalar', acao: async () => {} },
    { texto: 'Conferir o código, criar a planilha, enviar o código e publicar. Se algo falhar, a tela diz em que etapa parou.',
      slide: 'instalador-progresso', acao: async () => {} },
  ] },
  { capitulo: 'O QR code', falas: [
    { texto: 'No fim, o instalador mostra o endereço do app e um QR code. Aponte a câmera do celular para abrir no aparelho.',
      slide: 'instalador-sucesso', acao: async () => {} },
    { texto: 'Guarde o endereço. No celular, use Adicionar à Tela de Início para ficar com o ícone do Finanças.',
      slide: 'instalador-sucesso', acao: async () => {} },
  ] },

  // ── Passo 5: primeiro acesso
  capaDoPasso(4),
  { capitulo: 'Nome e modelo', falas: [
    { texto: 'Abra o Finanças. No primeiro acesso, dê um nome ao controle e escolha um modelo de categorias.',
      slide: 'app-boasvindas', acao: async () => {} },
    { texto: 'O Essencial já vem com Guardar, as contas da casa, o mercado e o básico de rendas. Dá para mudar tudo depois.',
      slide: 'app-modelos', acao: async () => {} },
  ] },
  { capitulo: 'Seu mês', falas: [
    { texto: 'O passo Seu mês é opcional: você já deixa a renda, a moradia, a meta e um gasto antes de começar.',
      slide: 'app-seu-mes', acao: async () => {} },
    { texto: 'Se preferir, pule. O app abre no Início, com os números zerados, prontos para o primeiro lançamento.',
      slide: 'app-inicio', acao: async () => {} },
  ] },
  { capitulo: 'No celular', falas: [
    { texto: 'No celular, abra o mesmo endereço com a mesma conta Google. O aviso de app não verificado é o mesmo.',
      slide: 'celular-inicio', acao: async () => {} },
    { texto: 'No iPhone, use Safari, Compartilhar, Adicionar à Tela de Início. No Android, use o menu do Chrome, Adicionar à tela inicial.',
      slide: 'celular-inicio', acao: async () => {} },
  ] },

  { falas: [
    { texto: 'Pronto! O Finanças está instalado. No próximo vídeo, você vai conhecer a tela Início e ler o seu dinheiro no mês.',
      slide: 'encerramento', acao: async () => {} },
  ] },
]
