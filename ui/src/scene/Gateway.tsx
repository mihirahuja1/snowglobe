import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useTheme } from '../theme'

const BASE = new THREE.CylinderGeometry(1.5, 1.6, 0.35, 6)
const BASE_EDGES = new THREE.EdgesGeometry(BASE)

export function Gateway({ name, totalRps }: { name: string; totalRps: number }) {
  const theme = useTheme()
  const cap = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (cap.current) cap.current.rotation.y = clock.elapsedTime * 0.3
  })

  return (
    <group position={[0, 0.2, 0]}>
      <mesh geometry={BASE} castShadow>
        <meshLambertMaterial color={theme.gwBase} />
      </mesh>
      <lineSegments geometry={BASE_EDGES}>
        <lineBasicMaterial color={theme.gwEdge} />
      </lineSegments>
      <mesh ref={cap} position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.18, 6]} />
        <meshLambertMaterial color={theme.gwCap} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <ringGeometry args={[2.0, 2.06, 64]} />
        <meshBasicMaterial
          color={theme.gwRing}
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
        />
      </mesh>
      <Html
        center
        position={[0, 2.1, 0]}
        distanceFactor={36}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: theme.textPrimary }}>gateway</div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>
            {name}
            {totalRps > 0 ? ` · ${(totalRps / 1000).toFixed(2)}k req/s` : ''}
          </div>
        </div>
      </Html>
    </group>
  )
}
