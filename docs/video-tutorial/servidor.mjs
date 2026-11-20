// Servidor de desenvolvimento do bsdesenv-financas para a gravação dos vídeos.
//
// Serve o app de verdade (src/Index.html + Estilos.html + App.html) com a ponte google.script.run trocada por HTTP, e o
// servidor de verdade (src/Codigo.gs) rodando sobre a planilha falsa de testes/gas-mock.mjs. Cada corrida de vídeo tem a
// sua base em base/<id>.json; o cenário liga uma de cada vez em base/atual. Sem base ligada, o app usa base/dev.json.
//
//   npm run video:servidor        (ou node docs/video-tutorial/servidor.mjs)
//
// A base escolhida por requisição: X-Video-Base: <id> > base/atual > dev. Nada aqui toca a planilha real do Google.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { criarServidor, abasDoBackup } from '../../testes/gas-mock.mjs'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.resolve(AQUI, '../..')
const BASES = path.join(AQUI, 'base')
const DEV = path.join(BASES, 'dev.json')
const EXEMPLO = path.join(RAIZ, 'exemplos', 'dados-exemplo.json')
const PORTA = Number(process.env.PORT || 8787)
const HOST = '127.0.0.1'

fs.mkdirSync(BASES, { recursive: true })
if (!fs.existsSync(DEV)) fs.copyFileSync(EXEMPLO, DEV)

const bases = new Map()

function lerAtual() {
  try { return fs.readFileSync(path.join(BASES, 'atual'), 'utf8').trim() } catch { return '' }
}

function idDaRequisicao(req) {
  const cabecalho = String(req.headers['x-video-base'] || '').trim()
  if (cabecalho) {
    if (!/^[a-z0-9-]{1,80}$/.test(cabecalho)) throw new Error('X-Video-Base inválido')
    return cabecalho
  }
  return lerAtual() || 'dev'
}

function carregarBase(id) {
  if (bases.has(id)) return bases.get(id)
  const arquivo = path.join(BASES, id === 'dev' ? 'dev.json' : `${id}.json`)
  if (!fs.existsSync(arquivo)) throw new Error(`base de vídeo inexistente: ${id}`)
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'))
  // base-simulada.mjs grava um backup (categorias + anos); abasDoBackup o converte no formato das abas.
  const abas = Array.isArray(dados.categorias) && dados.anos ? abasDoBackup(dados) : dados
  const servidor = criarServidor(abas)
  // Nome que aparece em Ajustes; o resto do mock (id e URL) não aparece no vídeo.
  servidor.planilha.ss.getName = () => 'Finanças (vídeo)'
  bases.set(id, servidor)
  console.log(`base carregada: ${id}`)
  return servidor
}

const PONTE = `<script>
window.google = { script: { run: (function fazer(ok, erro) {
  return new Proxy({}, { get(_, fn) {
    if (fn === 'withSuccessHandler') return (h) => fazer(h, erro);
    if (fn === 'withFailureHandler') return (h) => fazer(ok, h);
    return (...args) => {
      fetch('/api/' + encodeURIComponent(String(fn)), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
        .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.erro || ('HTTP ' + r.status)); return j.resultado; })
        .then((r) => { if (ok) ok(r); }, (e) => { if (erro) erro({ message: String((e && e.message) || e) }); });
    };
  } });
})(null, null) } };
</script>`

function pagina(req) {
  const servidor = carregarBase(idDaRequisicao(req))
  return servidor.ctx.doGet().getContent().replace('</head>', PONTE + '</head>')
}

function json(res, status, corpo) {
  const texto = JSON.stringify(corpo)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(texto)
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || HOST}`)
  if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
    const partes = []
    let tamanho = 0
    req.on('data', (c) => {
      tamanho += c.length
      if (tamanho > 8 * 1024 * 1024) { req.destroy(); return }
      partes.push(c)
    })
    req.on('end', () => {
      try {
        const fn = decodeURIComponent(url.pathname.slice('/api/'.length))
        const servidorDaBase = carregarBase(idDaRequisicao(req))
        const args = JSON.parse(Buffer.concat(partes).toString('utf8') || '[]')
        if (!Array.isArray(args)) throw new Error('argumentos inválidos')
        if (typeof servidorDaBase.ctx[fn] !== 'function') throw new Error(`função inexistente: ${fn}`)
        const resultado = servidorDaBase.ctx[fn](...args)
        json(res, 200, { resultado: resultado === undefined ? null : resultado })
      } catch (e) {
        json(res, 500, { erro: String((e && e.message) || e) })
      }
    })
    return
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); res.end(); return
  }
  if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return }
  try {
    const html = pagina(req)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(req.method === 'HEAD' ? undefined : html)
  } catch (e) {
    const status = /inexistente|inválido/.test(String(e.message)) ? 404 : 500
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(String(e.message))
  }
})

servidor.listen(PORTA, HOST, () => {
  console.log(`bsdesenv-financas (vídeo) em http://${HOST}:${PORTA}`)
  console.log(`bases em ${BASES}; sem base ligada, usa dev.json`)
})
