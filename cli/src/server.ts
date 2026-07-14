import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'
import { initialCluster, tickCluster } from './demo.js'
import { fetchCluster } from './k8s.js'

const STATIC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'static')

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const urlPath = (req.url ?? '/').split('?')[0]
  const rel = urlPath === '/' ? 'index.html' : normalize(urlPath).replace(/^([/\\]|\.\.)+/, '')
  const file = join(STATIC_DIR, rel)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
}

export interface ServerOptions {
  mode: 'demo' | 'live'
  port: number
  namespace?: string
}

export function startServer(opts: ServerOptions): void {
  if (!existsSync(STATIC_DIR)) {
    console.error('static UI bundle missing; reinstall snowglobe')
    process.exit(1)
  }

  const httpServer = createServer(serveStatic)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })
  const sockets = new Set<WebSocket>()

  wss.on('connection', (ws) => {
    sockets.add(ws)
    ws.on('close', () => sockets.delete(ws))
    ws.on('error', () => sockets.delete(ws))
  })

  let demoState = opts.mode === 'demo' ? initialCluster() : null

  async function broadcast(): Promise<void> {
    let payload
    if (opts.mode === 'demo') {
      payload = tickCluster(demoState!)
    } else {
      payload = await fetchCluster(opts.namespace)
    }
    if (payload) {
      const msg = JSON.stringify(payload)
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg)
      }
    }
    setTimeout(broadcast, opts.mode === 'demo' ? 1500 : 2500)
  }

  httpServer.listen(opts.port, '127.0.0.1', () => {
    void broadcast()
  })
}
