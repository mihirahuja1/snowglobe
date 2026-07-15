import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ClusterState } from '../types'
import { useTheme } from '../theme'
import { Gateway } from './Gateway'
import { ServiceGroup, servicePosition } from './ServiceGroup'
import { Stream } from './Stream'

const GATEWAY_POS = new THREE.Vector3(0, 0.55, 0)

function CameraRig({ sceneRadius }: { sceneRadius: number }) {
  const { camera } = useThree()
  const applied = useRef(0)
  useEffect(() => {
    const target = Math.max(40, sceneRadius * 2.9)
    if (applied.current === 0 || Math.abs(target - applied.current) / target > 0.15) {
      camera.position.setLength(target)
      applied.current = target
    }
  }, [sceneRadius, camera])
  return null
}

export function Scene({ cluster }: { cluster: ClusterState }) {
  const theme = useTheme()
  const positions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>()
    for (const svc of cluster.services) map.set(svc.name, servicePosition(svc))
    return map
  }, [cluster.services.map((s) => `${s.name}:${s.angle}:${s.dist}`).join(',')])

  const totalRps = cluster.services
    .filter((s) => s.upstream === null)
    .reduce((sum, s) => sum + s.rps, 0)

  const compact = cluster.services.length > 8
  const sceneRadius = Math.max(
    14,
    ...cluster.services.map((s) => s.dist + Math.max(0, s.pods.length - 1) * 1.7)
  )

  return (
    <Canvas
      shadows
      camera={{ position: [19, 26, 25], fov: 42 }}
      style={{ background: theme.bg }}
    >
      <fog
        attach="fog"
        args={[theme.bg, Math.max(30, sceneRadius * 2.2), Math.max(60, sceneRadius * 5.5)]}
      />
      <ambientLight intensity={theme.ambient} />
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
        <meshBasicMaterial color={theme.bg} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <shadowMaterial opacity={theme.shadowOpacity} />
      </mesh>
      <gridHelper
        key={theme.name}
        args={[44, 44, theme.grid, theme.grid]}
        position={[0, 0.01, 0]}
      />

      <Gateway name={cluster.gatewayName} totalRps={totalRps} />

      <CameraRig sceneRadius={sceneRadius} />

      {cluster.services.map((svc) => (
        <ServiceGroup key={svc.name} service={svc} compact={compact} />
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
        maxDistance={Math.max(42, sceneRadius * 4)}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.8, 0]}
      />
    </Canvas>
  )
}
