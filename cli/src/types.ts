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
  gatewayName: string
  services: ServiceInfo[]
  mode?: 'demo' | 'live'
}
