import { ClusterState, PodInfo, ServiceInfo } from './types.js'

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
        name: 'frontend', color: '#3b7dd8', angle: -2.62, dist: 9.5, desired: 4,
        pods: [makePod(0.72), makePod(0.45), makePod(0.4), makePod(0.5)],
        rps: 2000, upstream: null,
      },
      {
        name: 'api', color: '#1d9e75', angle: -0.52, dist: 9.5, desired: 3,
        pods: [makePod(0.5), makePod(0.62), makePod(0.35)],
        rps: 850, upstream: null,
      },
      {
        name: 'postgres', color: '#d85a30', angle: 1.57, dist: 9.0, desired: 1,
        pods: [makePod(0.31)],
        rps: 120, upstream: 'api',
      },
    ],
  }
}

function tickPod(pod: PodInfo): void {
  pod.ticksInPhase += 1

  if (pod.phase === 'crash') {
    if (pod.ticksInPhase % 4 === 3) pod.restarts += 1
    if (pod.ticksInPhase > 8 && Math.random() < 0.25) {
      pod.phase = 'ok'
      pod.ticksInPhase = 0
      pod.targetUtil = 0.3 + Math.random() * 0.3
    }
    return
  }

  if (pod.phase === 'pending') {
    if (pod.ticksInPhase > 3 && Math.random() < 0.5) {
      pod.phase = 'ok'
      pod.ticksInPhase = 0
      pod.util = 0.1
      pod.targetUtil = 0.3 + Math.random() * 0.4
    }
    return
  }

  if (Math.random() < 0.1) pod.targetUtil = 0.2 + Math.random() * 0.7
  pod.util += (pod.targetUtil - pod.util) * 0.2
  if (pod.util > 0.92 && Math.random() < 0.15) {
    pod.phase = 'crash'
    pod.ticksInPhase = 0
    pod.restarts += 1
  } else if (Math.random() < 0.004) {
    pod.phase = 'crash'
    pod.ticksInPhase = 0
    pod.restarts += 1
  }
}

const RPS_BOUNDS: Record<string, [number, number]> = {
  frontend: [1200, 3200],
  api: [500, 1400],
  postgres: [60, 260],
}

function tickService(svc: ServiceInfo): void {
  for (const pod of svc.pods) tickPod(pod)

  if (svc.name === 'frontend' && Math.random() < 0.04) {
    svc.desired = 3 + Math.floor(Math.random() * 3)
  }
  if (svc.pods.length < svc.desired) {
    const pending = makePod(0)
    pending.phase = 'pending'
    svc.pods.push(pending)
  } else if (svc.pods.length > svc.desired) {
    svc.pods = svc.pods.slice(0, svc.desired)
  }

  const [lo, hi] = RPS_BOUNDS[svc.name] ?? [50, 5000]
  svc.rps = Math.max(lo, Math.min(hi, Math.round(svc.rps * (0.9 + Math.random() * 0.2))))
}

export function tickCluster(state: ClusterState): ClusterState {
  for (const svc of state.services) tickService(svc)
  return state
}
