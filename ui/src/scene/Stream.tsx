import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  from: THREE.Vector3
  to: THREE.Vector3
  color: string
  rps: number
  sag?: number
}

export function Stream({ from, to, color, rps, sag = 2.2 }: Props) {
  const points = useRef<THREE.Points>(null!)

  const count = Math.max(3, Math.min(30, Math.round(rps / 110)))
  const width = Math.max(0.015, Math.min(0.06, rps / 45000))

  const { curve, tubeGeo, particleGeo, phases, speeds } = useMemo(() => {
    const mid = new THREE.Vector3(
      (from.x + to.x) / 2,
      Math.max(from.y, to.y) + sag,
      (from.z + to.z) / 2
    )
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to)
    const tubeGeo = new THREE.TubeGeometry(curve, 40, width, 8, false)
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(count * 3), 3)
    )
    const phases: number[] = []
    const speeds: number[] = []
    for (let i = 0; i < count; i++) {
      phases.push(Math.random())
      speeds.push(0.08 + Math.random() * 0.06)
    }
    return { curve, tubeGeo, particleGeo, phases, speeds }
  }, [from.x, from.y, from.z, to.x, to.y, to.z, sag, count, width])

  useFrame(({ clock }) => {
    if (!points.current) return
    const t = clock.elapsedTime
    const arr = (points.current.geometry.attributes.position as THREE.BufferAttribute)
      .array as Float32Array
    const pt = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      const tt = (t * speeds[i] + phases[i]) % 1
      curve.getPointAt(tt, pt)
      arr[i * 3] = pt.x
      arr[i * 3 + 1] = pt.y
      arr[i * 3 + 2] = pt.z
    }
    points.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color={color} transparent opacity={0.16} />
      </mesh>
      <points ref={points} geometry={particleGeo}>
        <pointsMaterial color={color} size={0.14} />
      </points>
    </group>
  )
}
