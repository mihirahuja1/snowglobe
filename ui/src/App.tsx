import { useEffect, useState } from 'react'
import { ClusterState } from './types'
import { initialCluster, tickCluster } from './mock'
import { Scene } from './scene/Scene'
import { Hud } from './Hud'

export default function App() {
  const [cluster, setCluster] = useState<ClusterState>(initialCluster)

  useEffect(() => {
    const id = setInterval(() => setCluster((c) => tickCluster(c)), 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Hud cluster={cluster} />
      <Scene cluster={cluster} />
    </div>
  )
}
