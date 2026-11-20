/* Receita: references/publicacao.md, seção 5. O arquivo inteiro é a `function` de um evaluate_script do
 * chrome-devtools-mcp, na página de envio do Studio (`studio.youtube.com/channel/<ID>/videos/upload?d=ud`),
 * depois do upload_file. Instala window.__yt: preencher(titulo, descricao, [playlists]) → "OK <link>",
 * "AINDA ENVIANDO" (chamar salvar() depois) ou "FALHA ..." (parar sem navegar). Textos do Studio em pt-BR. */
() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const esperar = async (fn, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(300) } return null }
  const visivel = (e) => e && e.getClientRects().length > 0
  const porTexto = (sel, re, raiz = document) => [...raiz.querySelectorAll(sel)].find((e) => visivel(e) && re.test((e.getAttribute('aria-label') || e.innerText || '').trim()))
  const progresso = () => (document.querySelector('ytcp-uploads-dialog ytcp-video-upload-progress')?.innerText || '').replace(/\s+/g, ' ')
  window.__yt = {
    async abrir() {
      const criar = porTexto('ytcp-button, button, ytcp-icon-button', /^Criar$/i)
      if (!criar) return 'FALHA: botão Criar não achado'
      criar.click()
      const item = await esperar(() => porTexto('tp-yt-paper-item', /Enviar vídeos/i))
      if (!item) return 'FALHA: item Enviar vídeos não achado'
      item.click()
      return (await esperar(() => visivel(document.querySelector('ytcp-uploads-file-picker')))) ? 'OK: faça upload_file no botão Selecionar arquivos' : 'FALHA: seletor não abriu'
    },
    async preencher(titulo, descricao, playlists) {
      const d = document.querySelector('ytcp-uploads-dialog')
      const caixa = await esperar(() => d.querySelector('#title-textarea #textbox'), 90000)
      if (!caixa) return 'FALHA: campo de título não apareceu'
      // Envio recusado (limite diário, direitos) não cria o vídeo: o link fica em "Criando o link..." e o
      // aviso sai em .error-short. Salvar nesse estado perde o envio sem erro, então para antes.
      const criado = await esperar(() => d.querySelector('ytcp-video-info a')?.href || d.querySelector('.error-short')?.textContent.trim(), 60000)
      if (!criado || !/^https?:/.test(criado)) return 'FALHA: envio recusado: ' + (criado || 'link do vídeo não saiu em 60 s')
      const escrever = (el, txt) => { el.focus(); document.execCommand('selectAll', false, null); document.execCommand('insertText', false, txt) }
      escrever(caixa, titulo); await sleep(500)
      escrever(d.querySelector('#description-textarea #textbox'), descricao); await sleep(500)
      const marcadas = await window.__yt.playlists(playlists)
      if (typeof marcadas === 'string') return marcadas
      return window.__yt.finalizar(marcadas)
    },
    async playlists(nomes) {
      const d = document.querySelector('ytcp-uploads-dialog')
      const itens = () => [...document.querySelectorAll('ytcp-checkbox-group label[id^=checkbox-item]')].filter(visivel)
      // o Studio às vezes carrega a lista vazia ("Nenhuma playlist disponível"): fecha e reabre
      for (let t = 0; t < 4 && !itens().length; t++) {
        const vazia = porTexto('tp-yt-paper-dialog', /Nenhuma playlist disponível/i)
        if (vazia) { porTexto('button', /^Concluir$/i, vazia)?.click(); await sleep(2500) }
        d.querySelector('ytcp-video-metadata-playlists ytcp-text-dropdown-trigger').click()
        await esperar(() => itens().length || porTexto('tp-yt-paper-dialog', /Nenhuma playlist disponível/i), 15000)
      }
      if (!itens().length) return 'FALHA: lista de playlists não abriu (vazia 4 vezes)'
      const marcadas = []
      for (const nome of nomes) {
        const item = itens().find((l) => l.innerText.trim().includes(nome))
        if (!item) return 'FALHA: playlist não achada: ' + nome
        const cb = item.querySelector('[role=checkbox]')
        if (cb.getAttribute('aria-checked') !== 'true') { cb.click(); await sleep(400) }
        marcadas.push(nome.replace(/^.*? · /, '') + '=' + cb.getAttribute('aria-checked'))
      }
      const concluido = porTexto('button', /^Concluir$/i)
      if (!concluido) return 'FALHA: botão Concluído das playlists não achado'
      concluido.click(); await sleep(800)
      return marcadas
    },
    async finalizar(marcadas) {
      const d = document.querySelector('ytcp-uploads-dialog')
      d.querySelector('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').click(); await sleep(400)
      const link = d.querySelector('ytcp-video-info a')?.href || ''
      for (let i = 0; i < 3; i++) { d.querySelector('#next-button').click(); await sleep(1200) }
      const priv = await esperar(() => d.querySelector('tp-yt-paper-radio-button[name="PRIVATE"]'))
      if (!priv) return 'FALHA: passo Visibilidade não abriu'
      priv.click(); await sleep(500)
      if (!(await esperar(() => !/\d+\s?%/.test(progresso()), 170000))) return 'AINDA ENVIANDO: chame window.__yt.salvar() depois. ' + progresso()
      return window.__yt.salvar(link, marcadas)
    },
    async salvar(link = '', marcadas = []) {
      const d = document.querySelector('ytcp-uploads-dialog')
      if (/\d+\s?%/.test(progresso())) return 'AINDA ENVIANDO: chame window.__yt.salvar() de novo. ' + progresso()
      link = link || d.querySelector('ytcp-video-info a')?.href || ''
      d.querySelector('#done-button').click()
      const fechar = await esperar(() => porTexto('ytcp-button, button, ytcp-icon-button', /^Fechar$/i), 30000)
      if (fechar) fechar.click()
      return 'OK ' + link + ' | playlists: ' + marcadas.join(', ')
    },
  }
  return 'helper instalado'
}
