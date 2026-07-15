import { ClusterState } from './types'
import { useTheme } from './theme'

type Conn =
  | { kind: 'connecting' }
  | { kind: 'live' }
  | { kind: 'demo' }
  | { kind: 'local-demo' }
  | { kind: 'stale'; since: number }
  | { kind: 'error'; reason: string; message: string }

interface Banner {
  tone: 'error' | 'warn'
  text: string
}

function bannerFor(conn: Conn, cluster: ClusterState): Banner | null {
  if (conn.kind === 'error') {
    if (conn.reason === 'forbidden') {
      return { tone: 'error', text: `Access denied reading the cluster. Try: kubemapper -n <your-namespace>` }
    }
    if (conn.reason === 'no-kubectl') {
      return { tone: 'error', text: `kubectl not found — install it, or run with --demo` }
    }
    if (conn.reason === 'empty') {
      return { tone: 'warn', text: conn.message }
    }
    return { tone: 'error', text: `Can't reach the cluster — ${conn.message}` }
  }
  if (conn.kind === 'stale') {
    return { tone: 'warn', text: `Connection lost — showing last known state` }
  }
  if (cluster.demoReason) {
    return { tone: 'warn', text: `Demo data, not a real cluster — ${cluster.demoReason}` }
  }
  return null
}

export function Hud({
  cluster,
  conn,
  onToggleTheme,
}: {
  cluster: ClusterState
  conn: Conn
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

  const banner = bannerFor(conn, cluster)
  const metricsMissing = conn.kind === 'live' && cluster.metricsAvailable === false
  const truncated =
    cluster.workloadTotal && cluster.workloadTotal > cluster.services.length
      ? cluster.workloadTotal
      : null

  const modeLabel =
    conn.kind === 'live' ? 'live' : conn.kind === 'error' || conn.kind === 'stale' ? '' : 'demo mode'

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

      {banner && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            pointerEvents: 'none',
            fontSize: 12,
            padding: '5px 14px',
            borderRadius: 20,
            whiteSpace: 'nowrap',
            color: banner.tone === 'error' ? theme.crashBadge.fg : theme.pendingBadge.fg,
            background: banner.tone === 'error' ? theme.crashBadge.bg : theme.pendingBadge.bg,
            border: `1px solid ${banner.tone === 'error' ? theme.crashBadge.border : theme.pendingBadge.border}`,
          }}
        >
          {banner.text}
        </div>
      )}

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
          {cluster.services.length}
          {truncated ? `/${truncated}` : ''} services
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
          style={{ ...pill, cursor: 'pointer', lineHeight: 1.2, fontFamily: 'inherit' }}
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
        {modeLabel && `${modeLabel} · `}fill level = cpu · red pulse = CrashLoopBackOff · dashed =
        pending · drag to orbit
        {metricsMissing && ' · metrics-server not found, cpu shows 0'}
      </div>
    </>
  )
}
