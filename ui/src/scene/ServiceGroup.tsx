import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { ServiceInfo } from '../types'
import { useTheme } from '../theme'
import { Pod } from './Pod'

interface Props {
  service: ServiceInfo
  compact?: boolean
}

export function servicePosition(svc: ServiceInfo): THREE.Vector3 {
  return new THREE.Vector3(
    Math.cos(svc.angle) * svc.dist,
    0.75,
    Math.sin(svc.angle) * svc.dist
  )
}

export function ServiceGroup({ service, compact = false }: Props) {
  const theme = useTheme()
  const pos = useMemo(() => servicePosition(service), [service.angle, service.dist])
  const away = useMemo(
    () => new THREE.Vector3(pos.x, 0, pos.z).normalize(),
    [pos.x, pos.z]
  )

  const n = service.pods.length
  const ready = service.pods.filter((p) => p.phase === 'ok').length
  const crashing = service.pods.some((p) => p.phase === 'crash')
  const leadUtil = service.pods[0]?.util ?? 0

  let statusText = `${ready}/${service.desired} ready · cpu ${Math.round(leadUtil * 100)}%`
  let statusColor = theme.textMuted
  if (crashing) {
    statusText = `${ready}/${service.desired} ready · CrashLoopBackOff`
    statusColor = theme.statusCrash
  } else if (ready < service.desired) {
    statusColor = theme.statusWarn
  }
  const unhealthy = crashing || ready < service.desired
  const displayName =
    service.name.length > 18 ? service.name.slice(0, 17) + '…' : service.name

  const plateLen = 2.4 + Math.max(0, n - 1) * 1.7
  const plateCenter = (Math.max(0, n - 1) * 1.7) / 2

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, -Math.atan2(away.z, away.x) + Math.PI / 2]}
        position={[pos.x + away.x * plateCenter, 0.015, pos.z + away.z * plateCenter]}
      >
        <planeGeometry args={[2.6, plateLen]} />
        <meshBasicMaterial color={theme.plate} transparent opacity={theme.plateOpacity} />
      </mesh>
      {service.pods.map((pod, i) => (
        <Pod
          key={pod.id}
          pod={pod}
          color={service.color}
          lead={i === 0}
          position={[pos.x + away.x * 1.7 * i, 0.75, pos.z + away.z * 1.7 * i]}
        />
      ))}
      <Html
        center
        position={[pos.x, 2.7, pos.z]}
        distanceFactor={36}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div title={service.name} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: theme.textPrimary }}>
            {displayName}
          </div>
          {(!compact || unhealthy) && (
            <div style={{ fontSize: 12, color: statusColor }}>{statusText}</div>
          )}
          {!compact && service.rps > 0 && (
            <div style={{ fontSize: 12, color: theme.textMuted }}>
              {service.rps.toLocaleString()} req/s
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
