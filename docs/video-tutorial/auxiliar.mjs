// Peças do projeto para os roteiros: o ajuste de tela do perfil web e atalhos de navegação.
// A receita fica em comum.mjs; isto é o que o app do Finanças precisa por cima dela.

// No perfil web a legenda sobreposta cobre o pé do app. O ajuste é só de gravação:
//  - o aviso (toast) sobe para não ficar atrás da legenda;
//  - o rodapé das folhas laterais e da gaveta sobe, para Salvar/Apagar e o status ficarem à vista;
//  - a caixa da planilha encolhe, para o rodapé de totais não ficar atrás da legenda.
export const CSS_TELA = `
  body #avisos{bottom:168px !important}
  body:has(.fc-plano) #avisos{left:24px; right:auto}
  @media (min-width:1024px){
    .folha{padding-bottom:160px !important}
    .lateral{padding-bottom:160px !important}
  }
  .planilha-caixa{max-height:calc(100vh - 330px) !important}
  body{padding-bottom:210px !important}
  .ga-col{height:100% !important}
`

export async function ajustarTela(h) {
  await h.page.addStyleTag({ content: CSS_TELA })
  // O aviso do app fecha sozinho em 6,5 s; no vídeo a voz costuma passar disso. Só na gravação, o mesmo aviso fica
  // 20 s (o roteiro fecha com fecharAviso quando quer tirá-lo). Nada mais do app muda.
  await h.page.evaluate(() => {
    const st = window.setTimeout.bind(window)
    window.setTimeout = (fn, ms, ...a) => st(fn, ms === 6500 ? 20000 : ms === 2550 ? 60000 : ms, ...a)
  })
  await h.esperar(250)
}

export const nav = (h, tela) => h.page.locator(`.lat-item[data-tela="${tela}"]`).first()

export async function irTela(h, tela) {
  await h.clicar(nav(h, tela))
  await h.esperar(900)
}

export const cardCom = (h, id) => h.page.locator('section.cartao').filter({ has: h.page.locator('#' + id) }).first()

export const acao = (h, nome, extra = '') => h.page.locator(`[data-acao="${nome}"]${extra}`).filter({ visible: true }).first()

export async function fecharFolha(h) {
  const x = h.page.locator('.folha [data-f="fechar"]').last()
  if (await x.count()) await h.clicar(x)
  else await h.esc()
  await h.esperar(450)
}

export async function moverAviso(h) {
  const a = h.page.locator('#avisos .aviso').last()
  if (await a.count()) await h.mover(a, { parcial: true })
}

export async function fecharAviso(h) {
  const x = h.page.locator('#avisos .aviso-fechar').last()
  if (await x.count()) await h.clicar(x)
  await h.esperar(250)
}

/** Mostra a prévia de impressão do app sem abrir o diálogo: aplica as regras @media print do próprio app como estilo comum.
 *  É ajuste só de gravação (o navegador não deixa ver a mídia print dentro do iframe da moldura). */
export async function modoImpressao(h, ligado) {
  await h.page.evaluate((ligado) => {
    const id = 'gv-print-preview'
    document.getElementById(id)?.remove()
    if (!ligado) return
    const regras = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules] } catch { return [] } })
      .filter((r) => r.type === CSSRule.MEDIA_RULE && String(r.conditionText || '').includes('print'))
      .map((r) => r.cssText.replace(/^@media print\s*\{/, '').replace(/\}\s*$/, '')).join('\n')
    const st = document.createElement('style'); st.id = id; st.textContent = regras
    document.head.appendChild(st)
  }, ligado)
  await h.esperar(400)
}
