/* Receita: references/publicacao.md, seções 3 e 4. O arquivo inteiro é a `function` de um evaluate_script do
 * chrome-devtools-mcp. Instala window.__ytp: editar(titulo|null, descricao|null, [marcar], [desmarcar]) na página
 * `studio.youtube.com/video/<id>/edit`; ordenar([ids]) e ler() na página `www.youtube.com/playlist?list=<id>`,
 * com a playlist em ordem manual. Textos do Studio em pt-BR. */
() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const esperar = async (fn, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(300) } return null }
  const visivel = (e) => e && e.getClientRects().length > 0
  const porTexto = (sel, re, raiz = document) => [...raiz.querySelectorAll(sel)].find((e) => visivel(e) && re.test((e.getAttribute('aria-label') || e.innerText || '').trim()))
  window.__ytp = {
    // Studio, página studio.youtube.com/video/<id>/edit. titulo/descricao null = não mexe.
    async editar(titulo, descricao, marcar = [], desmarcar = []) {
      const caixa = await esperar(() => document.querySelector('#title-textarea #textbox'), 30000)
      if (!caixa) return 'FALHA: página de edição não carregou'
      const escrever = (el, txt) => { el.focus(); document.execCommand('selectAll', false, null); document.execCommand('insertText', false, txt) }
      if (titulo) { escrever(caixa, titulo); await sleep(400) }
      if (descricao) { escrever(document.querySelector('#description-textarea #textbox'), descricao); await sleep(400) }
      const estado = []
      if (marcar.length || desmarcar.length) {
        const itens = () => [...document.querySelectorAll('ytcp-checkbox-group label[id^=checkbox-item]')].filter(visivel)
        document.querySelector('ytcp-video-metadata-playlists ytcp-text-dropdown-trigger').click()
        if (!(await esperar(() => itens().length))) return 'FALHA: lista de playlists não abriu (vazia: o vídeo existe?)'
        for (const [nome, quer] of [...marcar.map((n) => [n, 'true']), ...desmarcar.map((n) => [n, 'false'])]) {
          const item = itens().find((l) => l.innerText.trim().includes(nome))
          if (!item) return 'FALHA: playlist não achada: ' + nome
          const cb = item.querySelector('[role=checkbox]')
          if (cb.getAttribute('aria-checked') !== quer) { cb.click(); await sleep(400) }
          estado.push(nome.replace(/^.*? · /, '') + '=' + cb.getAttribute('aria-checked'))
        }
        porTexto('button', /^Concluir$/i).click(); await sleep(800)
      }
      // Salvar fica desabilitado (aria-disabled) quando nada mudou e volta a ele depois de gravar.
      const salvar = document.querySelector('ytcp-button#save')
      if (!salvar) return 'FALHA: botão Salvar não achado'
      if (salvar.getAttribute('aria-disabled') === 'true') return 'OK sem mudança | ' + estado.join(', ')
      salvar.click()
      const ok = await esperar(() => /Alterações salvas/i.test(document.querySelector('tp-yt-paper-toast')?.innerText || '') || salvar.getAttribute('aria-disabled') === 'true', 20000)
      if (!ok) return 'FALHA: o Studio não confirmou o salvamento'
      return 'OK título: ' + document.querySelector('#title-textarea #textbox').innerText + ' | ' + estado.join(', ')
    },
    // youtube.com, página www.youtube.com/playlist?list=<id>, ordem manual. Leva cada vídeo ao fim, na ordem dada:
    // ao terminar, a playlist fica exatamente nessa ordem.
    async ordenar(ids) {
      const linhas = () => [...document.querySelectorAll('ytd-playlist-video-renderer')]
      if (!(await esperar(() => linhas().length))) return 'FALHA: playlist não carregou'
      for (const id of ids) {
        const linha = linhas().find((l) => (l.querySelector('a#video-title')?.href || '').includes('v=' + id))
        if (!linha) return 'FALHA: vídeo não está na playlist: ' + id
        linha.scrollIntoView({ block: 'center' }); await sleep(300)
        const menu = linha.querySelector('button[aria-label="Menu de ações"], #menu button')
        menu.click()
        const item = await esperar(() => porTexto('ytd-menu-service-item-renderer, tp-yt-paper-item', /^Mover para o fim$|^Move to bottom$/i))
        if (!item) return 'FALHA: item "Mover para o fim" não apareceu (a ordem da playlist é manual?) em ' + id
        item.click(); await sleep(1500)
      }
      return window.__ytp.ler()
    },
    ler() {
      return [...document.querySelectorAll('ytd-playlist-video-renderer')].map((l, i) => (i + 1) + ' ' + (l.querySelector('a#video-title')?.href.match(/v=([\w-]+)/)?.[1] || '?') + ' ' + (l.querySelector('#video-title')?.innerText || '').split('|')[0].trim()).join('\n')
    },
  }
  return 'helper de playlists instalado'
}
