import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ClusterState } from '../types'
import { Gateway } from './Gateway'
import { ServiceGroup, servicePosition } from './ServiceGroup'
import { Stream } from './Stream'

const GATEWAY_POS = new THREE.Vector3(0, 0.55, 0)

export function Scene({ cluster }: { cluster: ClusterState }) {
  const positions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>()
    for (const svc of cluster.services) map.set(svc.name, servicePosition(svc))
    return map
  }, [cluster.services.map((s) => `${s.name}:${s.angle}:${s.dist}`).join(',')])

  const totalRps = cluster.services
    .filter((s) => s.upstream === null)
    .reduce((sum, s) => sum + s.rps, 0)

  return (
    <Canvas
      shadows
      camera={{ position: [22, 18, 29], fov: 42 }}
      style={{ background: '#f6f6f3' }}
    >
      <fog attach="fog" args={['#f6f6f3', 30, 60]} />
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[10, 18, 8]}
        intensity={0.65}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-radius={6}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[40, 64]} />
        <meshBasicMaterial color="#f6f6f3" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <shadowMaterial opacity={0.12} />
      </mesh>
      <gridHelper args={[44, 44, '#e4e3de', '#e4e3de']} position={[0, 0.01, 0]} />

      <Gateway name={cluster.gatewayName} totalRps={totalRps} />

      {cluster.services.map((svc) => (
        <ServiceGroup key={svc.name} service={svc} />
      ))}

      {cluster.services.map((svc) => {
        const to = positions.get(svc.name)!
        const from = svc.upstream ? positions.get(svc.upstream)! : GATEWAY_POS
        return (
          <Stream
            key={`stream-${svc.name}`}
            from={from}
            to={to}
            color={svc.color}
            rps={svc.rps}
            sag={svc.upstream ? 2.8 : 2.2}
          />
        )
      })}

      <OrbitControls
        enablePan={false}
        minDistance={10}
        maxDistance={42}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.8, 0]}
      />
    </Canvas>
  )
}
