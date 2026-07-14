import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const BASE = new THREE.CylinderGeometry(1.5, 1.6, 0.35, 6)
const BASE_EDGES = new THREE.EdgesGeometry(BASE)

export function Gateway({ name, totalRps }: { name: string; totalRps: number }) {
  const cap = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (cap.current) cap.current.rotation.y = clock.elapsedTime * 0.3
  })

  return (
    <group position={[0, 0.2, 0]}>
      <mesh geometry={BASE} castShadow>
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <lineSegments geometry={BASE_EDGES}>
        <lineBasicMaterial color="#d8d7d2" />
      </lineSegments>
      <mesh ref={cap} position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.18, 6]} />
        <meshLambertMaterial color="#37352f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <ringGeometry args={[2.0, 2.06, 64]} />
        <meshBasicMaterial color="#c9c8c2" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
      <Html center position={[0, 2.1, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#37352f' }}>gateway</div>
          <div style={{ fontSize: 11, color: '#9b9a94' }}>
            {name} · {(totalRps / 1000).toFixed(2)}k req/s
          </div>
        </div>
      </Html>
    </group>
  )
}
