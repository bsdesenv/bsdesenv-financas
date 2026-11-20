// Peças reutilizáveis nos roteiros e a geometria dos perfis. Os roteiros importam daqui `capas`, `fechar` e `loginSenha`.
import CONFIG, { PERFIL } from './config.mjs'

const NUMERO = ['um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito']

// Os dois formatos de vídeo. Em ambos o app mora num iframe de LARGURA × ALTURA (px de CSS) ampliado ESCALA vezes dentro da
// moldura que o gravar.mjs desenha; o que muda é onde fica a legenda:
//   celular  app de 360 px em retrato, ampliado 3×, com a legenda numa FAIXA própria abaixo dele (1080 × 1920).
//   web      app de 1600 × 900 ampliado 1,2×, sem faixa: a legenda vem sobreposta ao pé do app (1920 × 1080).
// Como o app mora num iframe, a barra de baixo fixa e as folhas inferiores do Quasar (position: fixed) ficam presas à área
// do app. No celular a legenda é uma faixa fora dele e esses elementos nunca vão para baixo dela; no web a legenda sobreposta
// cobre o pé do app (visual.md, "Legenda"). `LEGENDA_H` é a altura da legenda sobreposta, em px do vídeo.
export const PERFIS = {
  celular: { LARGURA: 360, ALTURA: 520, FAIXA: 120, ESCALA: 3, SOBREPOSTA: false, LEGENDA_H: 0, FONTE_LEGENDA: 44, EXPLORAR: { width: 360, height: 740 } },
  web: { LARGURA: 1600, ALTURA: 900, FAIXA: 0, ESCALA: 1.2, SOBREPOSTA: true, LEGENDA_H: 170, FONTE_LEGENDA: 40, EXPLORAR: { width: 1600, height: 900 } },
}

// Geometria em px de SAÍDA. O config.mjs pode sobrescrever LARGURA, ALTURA, FAIXA e ESCALA, mas o normal é só escolher o perfil.
export function geometria() {
  const p = PERFIS[PERFIL]
  if (!p) throw new Error(`PERFIL inválido em config.mjs: '${PERFIL}' (use ${Object.keys(PERFIS).map((k) => `'${k}'`).join(' ou ')})`)
  const g = { ...p }
  for (const k of ['LARGURA', 'ALTURA', 'FAIXA', 'ESCALA']) if (CONFIG[k] !== undefined) g[k] = CONFIG[k]
  const W = Math.round(g.LARGURA * g.ESCALA)
  const APP_H = Math.round(g.ALTURA * g.ESCALA)
  const FAIXA_H = Math.round(g.FAIXA * g.ESCALA)
  const H = APP_H + FAIXA_H
  // a legenda: faixa abaixo do app, ou caixa sobreposta ao pé dele. O legendas.py recorta exatamente esta região.
  const legendaH = g.SOBREPOSTA ? g.LEGENDA_H : FAIXA_H
  const legendaY = g.SOBREPOSTA ? H - legendaH : APP_H
  return { ...g, PERFIL, ESC: g.ESCALA, W, H, APP_H, FAIXA_H, legendaH, legendaY }
}

// Capa de cada passo. `antes` (opcional) roda ATRÁS da capa — troca de usuário, preparação de dados — e depois
// a capa fica mais 2,5 s na tela para não cortar. A voz diz "Passo dois: <título>."; a legenda não aparece na capa.
//   const capaDoPasso = capas(PARTES)
//   capaDoPasso(0)
//   capaDoPasso(2, async (h) => { await h.trocarUsuario('outra.pessoa@example.com', 'senha'); await h.rota('pessoas') })
export const capas = (PARTES) => (i, antes) => ({
  parte: i,
  falas: [{
    texto: `Passo ${i + 1} de ${PARTES.length} — ${PARTES[i].titulo}`,
    fala: `Passo ${NUMERO[i]}: ${PARTES[i].titulo}.`,
    acao: async (h) => { await h.capaParte(i); if (antes) { await antes(h); await h.esperar(2500) } },
  }],
})

// Fecha o que está por cima: a folha inferior ou o diálogo de cima (q-dialog). Botão de fechar (ícone "close"),
// senão Cancelar/Fechar/Voltar, senão Esc.
export async function fechar(h) {
  const topo = h.page.locator('.q-dialog').last()
  const x = topo.locator('.q-btn').filter({ visible: true }).filter({ has: h.page.locator('i.q-icon', { hasText: /^close$/ }) }).last()
  const cancelar = topo.locator('.q-btn').filter({ visible: true }).filter({ hasText: /^\W*(cancelar|fechar|voltar)\s*$/i }).last()
  if (await x.count()) await h.clicar(x)
  else if (await cancelar.count()) await h.clicar(cancelar)
  else await h.esc()
  await h.esperar(500)
}

// Login digitado na tela do app: e-mail, senha e o botão de entrar. Os rótulos vêm do config.mjs (LOGIN). Sem token: só senha.
export async function loginSenha(h, email, senha) {
  const L = CONFIG.LOGIN
  await h.digitar(h.campo(L.email), email)
  await h.digitar(h.campo(L.senha), senha)
  await h.clicar(h.botao(L.entrar))
  await h.page.waitForURL((u) => !u.href.includes('/login'), { timeout: 30000 })
  await h.esperar(2500)
  for (const b of await h.page.locator('.q-notification .q-btn').all()) await b.click().catch(() => {})
}
