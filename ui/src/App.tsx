import { useEffect, useRef, useState } from 'react'
import { ClusterState, StatusMessage } from './types'
import { initialCluster, tickCluster } from './mock'
import { Scene } from './scene/Scene'
import { Hud } from './Hud'
import { ThemeContext, light, dark } from './theme'

type Conn =
  | { kind: 'connecting' }
  | { kind: 'live' }
  | { kind: 'demo' }
  | { kind: 'local-demo' }
  | { kind: 'stale'; since: number }
  | { kind: 'error'; reason: string; message: string }

function initialThemeName(): 'light' | 'dark' {
  const saved = localStorage.getItem('kubemapper-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [cluster, setCluster] = useState<ClusterState>(initialCluster)
  const [conn, setConn] = useState<Conn>({ kind: 'connecting' })
  const [themeName, setThemeName] = useState<'light' | 'dark'>(initialThemeName)
  const connRef = useRef<Conn>(conn)
  connRef.current = conn

  const theme = themeName === 'dark' ? dark : light

  useEffect(() => {
    localStorage.setItem('kubemapper-theme', themeName)
    document.body.style.background = theme.bg
  }, [themeName, theme.bg])

  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws`)
    const fallback = setTimeout(() => {
      if (connRef.current.kind === 'connecting') setConn({ kind: 'local-demo' })
    }, 1500)

    ws.onmessage = (ev) => {
      let data: any
      try {
        data = JSON.parse(ev.data)
      } catch {
        return
      }
      if (data && data.status === 'error') {
        const msg = data as StatusMessage
        setConn({ kind: 'error', reason: msg.reason, message: msg.message })
        return
      }
      if (data && Array.isArray(data.services)) {
        const c = data as ClusterState
        setCluster(c)
        setConn({ kind: c.mode === 'live' ? 'live' : 'demo' })
      }
    }
    ws.onerror = () => {
      if (connRef.current.kind === 'connecting') setConn({ kind: 'local-demo' })
    }
    ws.onclose = () => {
      const k = connRef.current.kind
      if (k === 'live' || k === 'demo') setConn({ kind: 'stale', since: Date.now() })
      else if (k === 'connecting') setConn({ kind: 'local-demo' })
    }
    return () => {
      clearTimeout(fallback)
      ws.close()
    }
  }, [])

  // Only the browser-only fallback (no server at all, e.g. `vite dev`) animates locally.
  useEffect(() => {
    if (conn.kind !== 'local-demo') return
    const id = setInterval(() => setCluster((c) => tickCluster(c)), 1500)
    return () => clearInterval(id)
  }, [conn.kind])

  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: theme.bg }}>
        <Hud
          cluster={cluster}
          conn={conn}
          onToggleTheme={() => setThemeName((t) => (t === 'dark' ? 'light' : 'dark'))}
        />
        <Scene cluster={cluster} />
      </div>
    </ThemeContext.Provider>
  )
}
