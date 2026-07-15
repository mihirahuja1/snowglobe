import { ClusterState } from './types'
import { useTheme } from './theme'

export function Hud({
  cluster,
  onToggleTheme,
}: {
  cluster: ClusterState
  onToggleTheme: () => void
}) {
  const theme = useTheme()
  const allPods = cluster.services.flatMap((s) => s.pods)
  const crashing = allPods.filter((p) => p.phase === 'crash').length
  const pending = allPods.filter((p) => p.phase === 'pending').length
  const healthy = crashing === 0 && pending === 0

  const pill: React.CSSProperties = {
    fontSize: 11,
    color: theme.pillText,
    background: theme.pillBg,
    border: `1px solid ${theme.pillBorder}`,
    borderRadius: 20,
    padding: '3px 10px',
  }

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
          <span style={{ fontSize: 13, fontWeight: 500, color: theme.textPrimary }}>
            kubemapper
          </span>
          <span style={{ fontSize: 12, color: theme.textMuted }}>{cluster.name}</span>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 16,
          zIndex: 2,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <span style={{ ...pill, pointerEvents: 'none' }}>{allPods.length} pods</span>
        <span style={{ ...pill, pointerEvents: 'none' }}>
          {cluster.services.length} services
        </span>
        {healthy && (
          <span style={{ ...pill, pointerEvents: 'none', color: theme.statusOk }}>● healthy</span>
        )}
        {crashing > 0 && (
          <span
            style={{
              ...pill,
              pointerEvents: 'none',
              color: theme.crashBadge.fg,
              background: theme.crashBadge.bg,
              borderColor: theme.crashBadge.border,
            }}
          >
            ● {crashing} crashing
          </span>
        )}
        {pending > 0 && (
          <span
            style={{
              ...pill,
              pointerEvents: 'none',
              color: theme.pendingBadge.fg,
              background: theme.pendingBadge.bg,
              borderColor: theme.pendingBadge.border,
            }}
          >
            ● {pending} pending
          </span>
        )}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle dark mode"
          style={{
            ...pill,
            cursor: 'pointer',
            lineHeight: 1.2,
            fontFamily: 'inherit',
          }}
        >
          {theme.name === 'dark' ? 'light' : 'dark'}
        </button>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 18,
          zIndex: 2,
          pointerEvents: 'none',
          fontSize: 11,
          color: theme.textMuted,
        }}
      >
        {cluster.mode === 'live' ? 'live' : 'demo mode'} · fill level = cpu · red pulse =
        CrashLoopBackOff · dashed = pending · drag to orbit
      </div>
    </>
  )
}
