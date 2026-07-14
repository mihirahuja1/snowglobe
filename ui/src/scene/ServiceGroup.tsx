import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { ServiceInfo } from '../types'
import { Pod } from './Pod'

interface Props {
  service: ServiceInfo
}

export function servicePosition(svc: ServiceInfo): THREE.Vector3 {
  return new THREE.Vector3(
    Math.cos(svc.angle) * svc.dist,
    0.75,
    Math.sin(svc.angle) * svc.dist
  )
}

export function ServiceGroup({ service }: Props) {
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
  let statusColor = '#9b9a94'
  if (crashing) {
    statusText = `${ready}/${service.desired} ready · CrashLoopBackOff`
    statusColor = '#b3261e'
  } else if (ready < service.desired) {
    statusColor = '#8a6d1a'
  }

  const plateLen = 2.4 + Math.max(0, n - 1) * 1.7
  const plateCenter = (Math.max(0, n - 1) * 1.7) / 2

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, -Math.atan2(away.z, away.x) + Math.PI / 2]}
        position={[pos.x + away.x * plateCenter, 0.015, pos.z + away.z * plateCenter]}
      >
        <planeGeometry args={[2.6, plateLen]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
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
      <Html center position={[pos.x, 2.7, pos.z]} style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#37352f' }}>{service.name}</div>
          <div style={{ fontSize: 11, color: statusColor }}>{statusText}</div>
          <div style={{ fontSize: 11, color: '#9b9a94' }}>{service.rps.toLocaleString()} req/s</div>
        </div>
      </Html>
    </group>
  )
}
