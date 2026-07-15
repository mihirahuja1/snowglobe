import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ClusterState, FetchReason, FetchResult, PodInfo, ServiceInfo } from './types.js'

const exec = promisify(execFile)

const COLOR_CYCLE = ['#3b7dd8', '#1d9e75', '#d85a30', '#7a5cc4', '#c2417e', '#2a8fa3']

const SYSTEM_NS = new Set([
  'kube-system', 'kube-public', 'kube-node-lease',
  'gmp-system', 'gmp-public', 'gke-managed-system', 'gke-managed-cim',
  'gke-managed-volumepopulator', 'gke-gmp-system',
])

const MAX_WORKLOADS = 24
const MAX_PODS_PER_WORKLOAD = 40

interface RunResult {
  ok: boolean
  stdout: string
  stderr: string
}

async function run(args: string[], timeoutMs = 15000): Promise<RunResult> {
  try {
    const { stdout } = await exec('kubectl', args, {
      timeout: timeoutMs,
      maxBuffer: 128 * 1024 * 1024,
    })
    return { ok: true, stdout, stderr: '' }
  } catch (e: any) {
    return { ok: false, stdout: e?.stdout ?? '', stderr: e?.stderr ?? String(e?.message ?? e) }
  }
}

function classify(stderr: string): FetchReason {
  const s = stderr.toLowerCase()
  if (s.includes('executable file not found') || s.includes('enoent') || s.includes('command not found')) {
    return 'no-kubectl'
  }
  if (s.includes('forbidden') || s.includes('cannot list') || s.includes('is not allowed')) {
    return 'forbidden'
  }
  return 'unreachable'
}

export async function kubectlAvailable(): Promise<boolean> {
  const r = await run(['version', '--client', '-o', 'json'], 5000)
  return r.ok || classify(r.stderr) !== 'no-kubectl'
}

function cpuMillicores(value: string | undefined): number {
  if (!value) return 0
  if (value.endsWith('n')) return parseInt(value) / 1_000_000
  if (value.endsWith('u')) return parseInt(value) / 1000
  if (value.endsWith('m')) return parseInt(value)
  return parseFloat(value) * 1000
}

function podPhase(pod: any): 'ok' | 'crash' | 'pending' {
  for (const cs of pod?.status?.containerStatuses ?? []) {
    const reason = cs?.state?.waiting?.reason
    if (reason === 'CrashLoopBackOff' || reason === 'ImagePullBackOff' || reason === 'ErrImagePull') {
      return 'crash'
    }
  }
  const phase = pod?.status?.phase
  if (phase === 'Pending') return 'pending'
  if (phase === 'Failed') return 'crash'
  return 'ok'
}

function podRestarts(pod: any): number {
  let total = 0
  for (const cs of pod?.status?.containerStatuses ?? []) total += cs?.restartCount ?? 0
  return total
}

function selectorMatches(selector: Record<string, string>, labels: Record<string, string>): boolean {
  const keys = Object.keys(selector)
  if (keys.length === 0) return false
  return keys.every((k) => labels?.[k] === selector[k])
}

// crash/pending first so problems stay visible even when a workload is capped
const PHASE_RANK: Record<string, number> = { crash: 0, pending: 1, ok: 2 }

async function getItems(resource: string, nsArgs: string[]): Promise<{ items: any[]; err?: RunResult }> {
  const r = await run(['get', resource, '-o', 'json', ...nsArgs])
  if (!r.ok) return { items: [], err: r }
  try {
    return { items: JSON.parse(r.stdout).items ?? [] }
  } catch {
    return { items: [] }
  }
}

export async function fetchCluster(namespace?: string): Promise<FetchResult> {
  const nsArgs = namespace ? ['-n', namespace] : ['--all-namespaces']

  const [deploys, statefulsets, daemonsets, podsRes] = await Promise.all([
    getItems('deployments', nsArgs),
    getItems('statefulsets', nsArgs),
    getItems('daemonsets', nsArgs),
    getItems('pods', nsArgs),
  ])

  // Pods are the ground truth; if we can't read them, that's the real failure.
  if (podsRes.err) {
    const reason = classify(podsRes.err.stderr)
    return { ok: false, reason, message: podsRes.err.stderr.trim().split('\n').pop() || 'kubectl could not reach a cluster' }
  }
  // If every workload query also failed with a permission error, surface that.
  if (deploys.err && statefulsets.err && daemonsets.err) {
    const reason = classify(deploys.err.stderr)
    if (reason === 'forbidden' || reason === 'no-kubectl') {
      return { ok: false, reason, message: deploys.err.stderr.trim().split('\n').pop() || 'kubectl could not reach a cluster' }
    }
  }

  const keep = (item: any) => namespace || !SYSTEM_NS.has(item?.metadata?.namespace)
  const workloads = [
    ...deploys.items.filter(keep).map((w) => ({ w, kind: 'Deployment' })),
    ...statefulsets.items.filter(keep).map((w) => ({ w, kind: 'StatefulSet' })),
    ...daemonsets.items.filter(keep).map((w) => ({ w, kind: 'DaemonSet' })),
  ]

  const pods = podsRes.items

  // metrics-server: if `kubectl top` fails, CPU is simply unavailable.
  const top = new Map<string, number>()
  const topRes = await run(['top', 'pods', '--no-headers', ...nsArgs], 10000)
  const metricsAvailable = topRes.ok
  if (topRes.ok) {
    for (const line of topRes.stdout.trim().split('\n')) {
      if (!line.trim()) continue
      const parts = line.split(/\s+/)
      if (namespace && parts.length >= 2) top.set(parts[0], cpuMillicores(parts[1]))
      else if (parts.length >= 3) top.set(parts[1], cpuMillicores(parts[2]))
    }
  }

  const workloadTotal = workloads.length
  const shown = workloads.slice(0, MAX_WORKLOADS)
  const n = Math.max(1, shown.length)
  const ringDist = Math.max(9.5, (n * 7.5) / (2 * Math.PI))

  const services: ServiceInfo[] = shown.map(({ w, kind }, i) => {
    const selector: Record<string, string> = w.spec?.selector?.matchLabels ?? {}
    let matched = pods.filter((p: any) => selectorMatches(selector, p.metadata?.labels ?? {}))
    matched.sort((a: any, b: any) => PHASE_RANK[podPhase(a)] - PHASE_RANK[podPhase(b)])

    let desired =
      kind === 'DaemonSet'
        ? w.status?.desiredNumberScheduled ?? (matched.length || 1)
        : w.spec?.replicas ?? 1

    const capped = matched.length > MAX_PODS_PER_WORKLOAD
    if (capped) {
      matched = matched.slice(0, MAX_PODS_PER_WORKLOAD)
      desired = Math.min(desired, MAX_PODS_PER_WORKLOAD)
    }

    const pod = (p: any): PodInfo => {
      let limit = 0
      for (const c of p.spec?.containers ?? []) limit += cpuMillicores(c.resources?.limits?.cpu)
      const used = top.get(p.metadata.name) ?? 0
      const util = metricsAvailable && limit ? Math.min(1, used / limit) : 0
      return {
        id: p.metadata.name,
        phase: podPhase(p),
        util: Math.round(util * 1000) / 1000,
        targetUtil: Math.round(util * 1000) / 1000,
        restarts: podRestarts(p),
        ticksInPhase: 0,
      }
    }

    return {
      name: w.metadata.name,
      kind,
      color: COLOR_CYCLE[i % COLOR_CYCLE.length],
      angle: Math.round((-Math.PI + (2 * Math.PI * i) / n) * 1000) / 1000,
      dist: Math.round(ringDist * 100) / 100,
      desired,
      pods: matched.length
        ? matched.map(pod)
        : [{ id: `${w.metadata.name}-none`, phase: 'pending', util: 0, targetUtil: 0, restarts: 0, ticksInPhase: 0 }],
      rps: 0,
      upstream: null,
    }
  })

  if (services.length === 0) {
    return {
      ok: false,
      reason: 'empty',
      message: namespace
        ? `no workloads found in namespace "${namespace}"`
        : 'no workloads found (only system namespaces?)',
    }
  }

  const ctxRes = await run(['config', 'current-context'], 5000)
  const context = ctxRes.ok ? ctxRes.stdout.trim() : 'cluster'

  const cluster: ClusterState = {
    name: context,
    gatewayName: 'kubernetes',
    services,
    metricsAvailable,
    workloadTotal,
  }
  return { ok: true, cluster }
}
