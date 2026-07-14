import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PodInfo } from '../types'

const PENT = new THREE.CylinderGeometry(0.75, 0.75, 1.1, 5, 1)
const PENT_EDGES = new THREE.EdgesGeometry(PENT)
const FILL = new THREE.CylinderGeometry(0.68, 0.68, 1, 5, 1)

const RED = '#d23f31'
const AMBER = '#db9b2c'

interface Props {
  pod: PodInfo
  color: string
  lead: boolean
  position: [number, number, number]
}

export function Pod({ pod, color, lead, position }: Props) {
  const group = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Mesh>(null!)
  const edges = useRef<THREE.LineSegments>(null!)
  const fill = useRef<THREE.Mesh>(null!)
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])

  const crashed = pod.phase === 'crash'
  const pending = pod.phase === 'pending'
  const baseColor = crashed ? RED : color

  const dashedMat = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: '#a8a7a0',
        dashSize: 0.12,
        gapSize: 0.09,
        transparent: true,
        opacity: 0.9,
      }),
    []
  )

  useEffect(() => {
    if (pending && edges.current) edges.current.computeLineDistances()
  }, [pending])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!group.current) return
    if (crashed) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6)
      group.current.position.x = position[0] + Math.sin(t * 40) * 0.015 * pulse
      group.current.position.y = position[1]
      if (body.current) {
        const m = body.current.material as THREE.MeshLambertMaterial
        m.opacity = 0.15 + pulse * 0.45
      }
    } else if (pending) {
      group.current.position.x = position[0]
      group.current.position.y = position[1] + Math.sin(t * 0.8 + phase) * 0.08
    } else {
      group.current.position.x = position[0]
      group.current.position.y = position[1] + (lead ? Math.sin(t * 1.1 + phase) * 0.05 : 0)
    }
    if (fill.current && !pending) {
      const u = Math.max(0.06, Math.min(1, pod.util))
      fill.current.scale.y = u
      fill.current.position.y = -0.55 + (1.06 * u) / 2 + 0.02
    }
  })

  if (pending) {
    return (
      <group ref={group} position={position} rotation={[0, Math.PI / 10, 0]}>
        <lineSegments ref={edges} geometry={PENT_EDGES} material={dashedMat} />
        <Html center position={[0, 1.1, 0]} style={{ pointerEvents: 'none' }}>
          <div style={badgeStyle('#fdf8ec', '#8a6d1a', '#efe3c0')}>pending</div>
        </Html>
      </group>
    )
  }

  const fillColor = crashed ? RED : pod.util > 0.75 ? AMBER : color

  return (
    <group ref={group} position={position} rotation={[0, Math.PI / 10, 0]}>
      <mesh ref={body} geometry={PENT}>
        <meshLambertMaterial color={baseColor} transparent opacity={lead ? 0.35 : 0.18} />
      </mesh>
      <lineSegments ref={edges} geometry={PENT_EDGES}>
        <lineBasicMaterial color={baseColor} transparent opacity={lead ? 0.95 : 0.4} />
      </lineSegments>
      <mesh ref={fill} geometry={FILL} castShadow={lead} position={[0, -0.55 + 0.53, 0]}>
        <meshLambertMaterial color={fillColor} />
      </mesh>
      {crashed && (
        <Html center position={[0.6, 1.05, 0]} style={{ pointerEvents: 'none' }}>
          <div style={badgeStyle('#fdf0ef', '#b3261e', '#f2d5d2')}>↻ {pod.restarts}</div>
        </Html>
      )}
    </group>
  )
}

function badgeStyle(bg: string, fg: string, border: string): React.CSSProperties {
  return {
    fontSize: 11,
    color: fg,
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 20,
    padding: '2px 8px',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  }
}
