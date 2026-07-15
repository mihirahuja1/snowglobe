import { useEffect, useRef, useState } from 'react'
import { ClusterState } from './types'
import { initialCluster, tickCluster } from './mock'
import { Scene } from './scene/Scene'
import { Hud } from './Hud'
import { ThemeContext, light, dark } from './theme'

type Source = 'connecting' | 'server' | 'local-demo'

function initialThemeName(): 'light' | 'dark' {
  const saved = localStorage.getItem('kubemapper-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [cluster, setCluster] = useState<ClusterState>(initialCluster)
  const [source, setSource] = useState<Source>('connecting')
  const [themeName, setThemeName] = useState<'light' | 'dark'>(initialThemeName)
  const sourceRef = useRef<Source>('connecting')
  sourceRef.current = source

  const theme = themeName === 'dark' ? dark : light

  useEffect(() => {
    localStorage.setItem('kubemapper-theme', themeName)
    document.body.style.background = theme.bg
  }, [themeName, theme.bg])

  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws`)
    const fallback = setTimeout(() => {
      if (sourceRef.current === 'connecting') setSource('local-demo')
    }, 1500)

    ws.onmessage = (ev) => {
      let data: unknown
      try {
        data = JSON.parse(ev.data)
      } catch {
        return
      }
      if (
        typeof data === 'object' &&
        data !== null &&
        Array.isArray((data as ClusterState).services)
      ) {
        setSource('server')
        setCluster(data as ClusterState)
      }
    }
    ws.onerror = () => {
      if (sourceRef.current !== 'server') setSource('local-demo')
    }
    ws.onclose = () => {
      if (sourceRef.current !== 'server') setSource('local-demo')
    }
    return () => {
      clearTimeout(fallback)
      ws.close()
    }
  }, [])

  useEffect(() => {
    if (source !== 'local-demo') return
    const id = setInterval(() => setCluster((c) => tickCluster(c)), 1500)
    return () => clearInterval(id)
  }, [source])

  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: theme.bg }}>
        <Hud
          cluster={cluster}
          onToggleTheme={() => setThemeName((t) => (t === 'dark' ? 'light' : 'dark'))}
        />
        <Scene cluster={cluster} />
      </div>
    </ThemeContext.Provider>
  )
}
