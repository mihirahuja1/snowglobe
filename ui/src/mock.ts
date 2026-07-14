import { ClusterState, PodInfo, ServiceInfo } from './types'

let podCounter = 0

function makePod(util: number): PodInfo {
  podCounter += 1
  return {
    id: `pod-${podCounter}`,
    phase: 'ok',
    util,
    targetUtil: util,
    restarts: 0,
    ticksInPhase: 0,
  }
}

export function initialCluster(): ClusterState {
  return {
    name: 'demo-prod',
    gatewayName: 'ingress-nginx',
    services: [
      {
        name: 'frontend',
        color: '#3b7dd8',
        angle: -2.62,
        dist: 9.5,
        desired: 4,
        pods: [makePod(0.72), makePod(0.45), makePod(0.4), makePod(0.5)],
        rps: 2000,
        upstream: null,
      },
      {
        name: 'api',
        color: '#1d9e75',
        angle: -0.52,
        dist: 9.5,
        desired: 3,
        pods: [makePod(0.5), makePod(0.62), makePod(0.35)],
        rps: 850,
        upstream: null,
      },
      {
        name: 'postgres',
        color: '#d85a30',
        angle: 1.57,
        dist: 9.0,
        desired: 1,
        pods: [makePod(0.31)],
        rps: 120,
        upstream: 'api',
      },
    ],
  }
}

function tickPod(pod: PodInfo): PodInfo {
  const p = { ...pod, ticksInPhase: pod.ticksInPhase + 1 }

  if (p.phase === 'crash') {
    if (p.ticksInPhase % 4 === 3) p.restarts += 1
    if (p.ticksInPhase > 8 && Math.random() < 0.25) {
      p.phase = 'ok'
      p.ticksInPhase = 0
      p.targetUtil = 0.3 + Math.random() * 0.3
    }
    return p
  }

  if (p.phase === 'pending') {
    if (p.ticksInPhase > 3 && Math.random() < 0.5) {
      p.phase = 'ok'
      p.ticksInPhase = 0
      p.util = 0.1
      p.targetUtil = 0.3 + Math.random() * 0.4
    }
    return p
  }

  if (Math.random() < 0.1) p.targetUtil = 0.2 + Math.random() * 0.7
  p.util += (p.targetUtil - p.util) * 0.2
  if (p.util > 0.92 && Math.random() < 0.15) {
    p.phase = 'crash'
    p.ticksInPhase = 0
    p.restarts += 1
  } else if (Math.random() < 0.004) {
    p.phase = 'crash'
    p.ticksInPhase = 0
    p.restarts += 1
  }
  return p
}

function tickService(svc: ServiceInfo): ServiceInfo {
  const s = { ...svc, pods: svc.pods.map(tickPod) }

  if (s.name === 'frontend' && Math.random() < 0.04) {
    s.desired = 3 + Math.floor(Math.random() * 3)
  }
  const running = s.pods.length
  if (running < s.desired) {
    const pending = makePod(0)
    pending.phase = 'pending'
    pending.util = 0
    s.pods = [...s.pods, pending]
  } else if (running > s.desired) {
    s.pods = s.pods.slice(0, -1)
  }

  const drift = 0.9 + Math.random() * 0.2
  s.rps = Math.round(s.rps * drift)
  if (s.name === 'frontend') s.rps = Math.min(3200, Math.max(1200, s.rps))
  if (s.name === 'api') s.rps = Math.min(1400, Math.max(500, s.rps))
  if (s.name === 'postgres') s.rps = Math.min(260, Math.max(60, s.rps))
  return s
}

export function tickCluster(state: ClusterState): ClusterState {
  return { ...state, services: state.services.map(tickService) }
}
