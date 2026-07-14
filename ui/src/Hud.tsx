import { ClusterState } from './types'

const pill: React.CSSProperties = {
  fontSize: 11,
  color: '#6f6e69',
  background: '#ffffff',
  border: '1px solid #e8e7e2',
  borderRadius: 20,
  padding: '3px 10px',
}

export function Hud({ cluster }: { cluster: ClusterState }) {
  const allPods = cluster.services.flatMap((s) => s.pods)
  const crashing = allPods.filter((p) => p.phase === 'crash').length
  const pending = allPods.filter((p) => p.phase === 'pending').length
  const healthy = crashing === 0 && pending === 0

  return (
    <>
      <div style={{ position: 'absolute', top: 16, left: 18, zIndex: 2, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              background: '#3b7dd8',
              clipPath: 'polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%)',
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#37352f' }}>snowglobe</span>
          <span style={{ fontSize: 12, color: '#9b9a94' }}>{cluster.name}</span>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 16,
          zIndex: 2,
          pointerEvents: 'none',
          display: 'flex',
          gap: 6,
        }}
      >
        <span style={pill}>{allPods.length} pods</span>
        <span style={pill}>{cluster.services.length} services</span>
        {healthy && <span style={{ ...pill, color: '#1a7f52' }}>● healthy</span>}
        {crashing > 0 && (
          <span style={{ ...pill, color: '#b3261e', background: '#fdf0ef', borderColor: '#f2d5d2' }}>
            ● {crashing} crashing
          </span>
        )}
        {pending > 0 && (
          <span style={{ ...pill, color: '#8a6d1a', background: '#fdf8ec', borderColor: '#efe3c0' }}>
            ● {pending} pending
          </span>
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 18,
          zIndex: 2,
          pointerEvents: 'none',
          fontSize: 11,
          color: '#9b9a94',
        }}
      >
        demo mode · fill level = cpu · red pulse = CrashLoopBackOff · dashed = pending · drag to orbit
      </div>
    </>
  )
}
