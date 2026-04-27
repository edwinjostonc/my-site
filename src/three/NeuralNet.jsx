import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'

const LAYERS    = [3, 6, 8, 6, 3]
const SPACING_X = 1.55
const SPACING_Y = 0.52
const NODE_R    = 0.09
const PULSE_R   = 0.038
const PULSE_N   = 45

const LAYER_COLORS = ['#22d3ee', '#818cf8', '#a78bfa', '#c084fc', '#e0f2fe']
const EDGE_COLORS  = ['#06b6d4', '#7c3aed', '#9333ea', '#a855f7']
const EDGE_OPS     = [0.14, 0.10, 0.10, 0.14]

/* Module-level scratch objects — never allocate inside useFrame */
const _v = new THREE.Vector3()
const _m = new THREE.Matrix4()
const _c = new THREE.Color()

function buildNet() {
  const starts = []
  let cum = 0
  LAYERS.forEach(c => { starts.push(cum); cum += c })

  const pos = []
  LAYERS.forEach((count, li) => {
    const x = (li - (LAYERS.length - 1) / 2) * SPACING_X
    for (let ni = 0; ni < count; ni++) {
      pos.push(new THREE.Vector3(x, (ni - (count - 1) / 2) * SPACING_Y, 0))
    }
  })

  const edgeGeoms = []
  const edges = []
  for (let li = 0; li < LAYERS.length - 1; li++) {
    const pts = []
    for (let ni = 0; ni < LAYERS[li]; ni++) {
      for (let nj = 0; nj < LAYERS[li + 1]; nj++) {
        const f = pos[starts[li] + ni]
        const t = pos[starts[li + 1] + nj]
        pts.push(f.x, f.y, f.z, t.x, t.y, t.z)
        edges.push({ from: f, to: t, layer: li })
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    edgeGeoms.push(g)
  }

  return { pos, edgeGeoms, edges, total: cum, starts }
}

export default function NeuralNet() {
  const groupRef = useRef()
  const nodeRef  = useRef()
  const pulseRef = useRef()

  const { pos, edgeGeoms, edges, total } = useMemo(buildNet, [])

  const pulses = useMemo(() => Array.from({ length: PULSE_N }, (_, i) => {
    const e = edges[i % edges.length]
    return { from: e.from.clone(), to: e.to.clone(), t: i / PULSE_N, speed: 0.2 + (i % 7) * 0.035, layer: e.layer }
  }), [edges])

  /* Colour nodes by layer — cyan input → violet output */
  useEffect(() => {
    if (!nodeRef.current) return
    let idx = 0
    LAYERS.forEach((count, li) => {
      _c.set(LAYER_COLORS[li])
      for (let ni = 0; ni < count; ni++) {
        _m.setPosition(pos[idx])
        nodeRef.current.setMatrixAt(idx, _m)
        nodeRef.current.setColorAt(idx, _c)
        idx++
      }
    })
    nodeRef.current.instanceMatrix.needsUpdate = true
    if (nodeRef.current.instanceColor) nodeRef.current.instanceColor.needsUpdate = true
  }, [pos])

  /* Colour pulses by the edge layer they travel */
  useEffect(() => {
    if (!pulseRef.current) return
    pulses.forEach((p, i) => {
      _c.set(LAYER_COLORS[p.layer])
      pulseRef.current.setColorAt(i, _c)
    })
    if (pulseRef.current.instanceColor) pulseRef.current.instanceColor.needsUpdate = true
  }, [pulses])

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.022
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.00032) * 0.045
    }
    if (!pulseRef.current) return
    pulses.forEach((p, i) => {
      p.t = (p.t + dt * p.speed) % 1
      _v.lerpVectors(p.from, p.to, p.t)
      _m.setPosition(_v)
      pulseRef.current.setMatrixAt(i, _m)
    })
    pulseRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <Float speed={0.3} floatIntensity={0.08} position={[0.4, 0.1, 0]}>
      <group ref={groupRef}>
        {edgeGeoms.map((geom, li) => (
          <lineSegments key={li} geometry={geom}>
            <lineBasicMaterial color={EDGE_COLORS[li]} transparent opacity={EDGE_OPS[li]} depthWrite={false} />
          </lineSegments>
        ))}

        {/* Nodes — per-instance colour from cyan → violet by layer */}
        <instancedMesh ref={nodeRef} args={[null, null, total]} frustumCulled={false}>
          <sphereGeometry args={[NODE_R, 8, 8]} />
          <meshBasicMaterial transparent opacity={0.92} />
        </instancedMesh>

        {/* Pulse dots — coloured by layer direction */}
        <instancedMesh ref={pulseRef} args={[null, null, PULSE_N]} frustumCulled={false}>
          <sphereGeometry args={[PULSE_R, 6, 6]} />
          <meshBasicMaterial transparent opacity={0.95} />
        </instancedMesh>
      </group>
    </Float>
  )
}
