export type PodPhase = 'ok' | 'crash' | 'pending'

export interface PodInfo {
  id: string
  phase: PodPhase
  util: number
  targetUtil: number
  restarts: number
  ticksInPhase: number
}

export interface ServiceInfo {
  name: string
  kind?: string
  color: string
  angle: number
  dist: number
  desired: number
  pods: PodInfo[]
  rps: number
  upstream: string | null
}

export interface ClusterState {
  name: string
  services: ServiceInfo[]
  gatewayName: string
  mode?: 'demo' | 'live'
  metricsAvailable?: boolean
  demoReason?: string
  workloadTotal?: number
}

export interface StatusMessage {
  status: 'error'
  reason: 'no-kubectl' | 'unreachable' | 'forbidden' | 'empty'
  message: string
}
