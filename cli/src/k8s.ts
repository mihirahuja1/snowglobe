import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ClusterState, PodInfo, ServiceInfo } from './types.js'

const exec = promisify(execFile)

const COLOR_CYCLE = ['#3b7dd8', '#1d9e75', '#d85a30', '#7a5cc4', '#c2417e', '#2a8fa3']

async function kubectl(args: string[], timeoutMs = 15000): Promise<string | null> {
  try {
    const { stdout } = await exec('kubectl', args, { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 })
    return stdout
  } catch {
    return null
  }
}

export async function kubectlAvailable(): Promise<boolean> {
  return (await kubectl(['version', '--client', '-o', 'json'], 5000)) !== null
}

function podPhase(pod: any): 'ok' | 'crash' | 'pending' {
  for (const cs of pod?.status?.containerStatuses ?? []) {
    const reason = cs?.state?.waiting?.reason
    if (reason === 'CrashLoopBackOff' || reason === 'ImagePullBackOff' || reason === 'ErrImagePull') {
      return 'crash'
    }
  }
  if (pod?.status?.phase === 'Pending') return 'pending'
  return 'ok'
}

function podRestarts(pod: any): number {
  let total = 0
  for (const cs of pod?.status?.containerStatuses ?? []) total += cs?.restartCount ?? 0
  return total
}

function cpuMillicores(value: string | undefined): number {
  if (!value) return 0
  if (value.endsWith('n')) return parseInt(value) / 1_000_000
  if (value.endsWith('m')) return parseInt(value)
  return parseFloat(value) * 1000
}

export async function fetchCluster(namespace?: string): Promise<ClusterState | null> {
  const nsArgs = namespace ? ['-n', namespace] : ['--all-namespaces']

  const [deploysRaw, podsRaw] = await Promise.all([
    kubectl(['get', 'deployments', '-o', 'json', ...nsArgs]),
    kubectl(['get', 'pods', '-o', 'json', ...nsArgs]),
  ])
  if (deploysRaw === null || podsRaw === null) return null

  const SYSTEM_NS = new Set([
    'kube-system', 'kube-public', 'kube-node-lease',
    'gmp-system', 'gmp-public', 'gke-managed-system', 'gke-managed-cim',
    'gke-managed-volumepopulator', 'gke-gmp-system',
  ])
  const allDeploys = JSON.parse(deploysRaw).items ?? []
  const deploys = namespace
    ? allDeploys
    : allDeploys.filter((d: any) => !SYSTEM_NS.has(d.metadata?.namespace))
  const pods = JSON.parse(podsRaw).items ?? []

  const top = new Map<string, number>()
  const topRaw = await kubectl(['top', 'pods', '--no-headers', ...nsArgs], 10000)
  if (topRaw) {
    for (const line of topRaw.trim().split('\n')) {
      const parts = line.split(/\s+/)
      if (namespace && parts.length >= 2) top.set(parts[0], cpuMillicores(parts[1]))
      else if (parts.length >= 3) top.set(parts[1], cpuMillicores(parts[2]))
    }
  }

  const services: ServiceInfo[] = []
  const shown = deploys.slice(0, 24)
  const n = Math.max(1, shown.length)
  const ringDist = Math.max(9.5, (n * 7.5) / (2 * Math.PI))
  shown.forEach((dep: any, i: number) => {
    const depName: string = dep.metadata.name
    const desired: number = dep.spec?.replicas ?? 1

    const depPods: PodInfo[] = []
    for (const pod of pods) {
      const name: string = pod.metadata.name
      if (!name.startsWith(depName + '-')) continue
      let limit = 0
      for (const c of pod.spec?.containers ?? []) {
        limit += cpuMillicores(c.resources?.limits?.cpu)
      }
      const used = top.get(name) ?? 0
      const util = limit ? used / limit : Math.min(1, used / 500)
      depPods.push({
        id: name,
        phase: podPhase(pod),
        util: Math.round(util * 1000) / 1000,
        targetUtil: Math.round(util * 1000) / 1000,
        restarts: podRestarts(pod),
        ticksInPhase: 0,
      })
    }

    services.push({
      name: depName,
      color: COLOR_CYCLE[i % COLOR_CYCLE.length],
      angle: Math.round((-Math.PI + (2 * Math.PI * i) / n) * 1000) / 1000,
      dist: Math.round(ringDist * 100) / 100,
      desired,
      pods: depPods.length
        ? depPods
        : [{ id: `${depName}-none`, phase: 'pending', util: 0, targetUtil: 0, restarts: 0, ticksInPhase: 0 }],
      rps: 0,
      upstream: null,
    })
  })

  const context = ((await kubectl(['config', 'current-context'], 5000)) ?? 'cluster').trim()
  return { name: context, gatewayName: 'kubernetes', services }
}
