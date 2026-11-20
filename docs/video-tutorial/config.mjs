// Configuração do bsdesenv-financas para a receita de vídeo tutorial.
// Perfil web: o app tem layout de desktop a partir de 1024 px (gaveta lateral, lançamento rápido e a planilha do ano).
// A geometria dos perfis está em comum.mjs.

export const PERFIL = 'web'

export default {
  // O servidor de desenvolvimento do projeto: docs/video-tutorial/servidor.mjs sobre a planilha falsa de testes/gas-mock.mjs.
  // Suba com `npm run video:servidor` antes de ensaiar ou produzir. Não é a produção nem a planilha do dev.
  BASE_URL: 'http://localhost:8787',

  // O app é uma página só (sem router): toda tela é trocada dentro de App.html.
  PREFIXO_ROTA: '/',
  ROTA_LOGIN: '/',

  // kicker das capas de abertura e encerramento
  KICKER: 'Finanças · tutorial',

  // Identidade visual do app (Estilos.html): indigo do acento, verde do disponível, âmbar do previsto e a faixa escura da
  // legenda. As capas são brancas; estas cores só aparecem nos detalhes.
  COR: { fundo: '#ffffff', destaque: '#4338CA', escuro: '#1E1B4B', realce: '#A5B4FC', texto: '#0E1525', suave: '#475467', apagado: '#8C98AA', chip: '#EEF0FF', borda: '#E4E8EE', faixa: '#0E1525' },

  // O logo do app é desenhado em CSS (três barras), não é uma imagem servida: a abertura sai sem logo.
  LOGO: undefined,

  // A fonte do app vem do Google Fonts em Index.html.
  FONTE: 'Inter',

  // Não é PWA: sem INSTALADO.

  // A navegação é a gaveta lateral no desktop e a barra do pé no celular; o roteiro usa os data-acao do app.
  SELETOR_ABA: undefined,

  // No perfil web a legenda sobreposta cobre o pé do app. A gaveta lateral tem o rodapé (Salvo, versão, planilha) no fim:
  // o roteiro sobe esse rodapé com CSS próprio, sem dar folga ao body. Nada fixo no pé para declarar aqui.
  FIXOS_NO_PE: [],

  // O app não tem login: abre direto na planilha da base.
  LOGIN: { email: '', senha: '', entrar: '' },

  // A voz neural acerta o português; as siglas e símbolos que ela lê mal ficam aqui (a legenda mantém a grafia).
  PRONUNCIA: [
    [/\bJSON\b/g, 'jêisson'],
    [/\bCSV\b/g, 'cê ésse vê'],
    [/\bPix\b/g, 'Pícs'],
    [/\bR\$\s?/g, 'reais '],
  ],
}
