import { useRef, useMemo, useEffect, Suspense, Component } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Float, AdaptiveDpr, MeshDistortMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

class Safe3D extends Component {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? null : this.props.children }
}

const lerp = (a, b, t) => a + (b - a) * t

function MouseParallax({ children }) {
  const ref = useRef()
  useFrame(({ mouse }) => {
    if (!ref.current) return
    ref.current.rotation.y = lerp(ref.current.rotation.y, mouse.x * 0.1,  0.035)
    ref.current.rotation.x = lerp(ref.current.rotation.x, -mouse.y * 0.05, 0.035)
  })
  return <group ref={ref}>{children}</group>
}

function ScrollDrift({ scrollRef }) {
  const { camera } = useThree()
  useFrame(() => {
    const t = scrollRef.current
    camera.position.x = lerp(camera.position.x, Math.sin(t * Math.PI) * 3.2, 0.022)
    camera.position.y = lerp(camera.position.y, t * 2.4, 0.022)
    camera.position.z = lerp(camera.position.z, 9 - t * 2.8, 0.022)
    camera.rotation.z = lerp(camera.rotation.z, Math.sin(t * Math.PI) * 0.055, 0.018)
    camera.fov = lerp(camera.fov, 65 + t * 9, 0.028)
    camera.updateProjectionMatrix()
    camera.lookAt(lerp(0, -0.6, t), lerp(0, 1.1, t), 0)
  })
  return null
}

/* ── DNA Helix (instanced spheres + rungs) ───────────────────── */
function DNAHelix() {
  const s1 = useRef(), s2 = useRef(), grp = useRef()
  const N = 30, R = 0.65

  const { p1, p2, rungs } = useMemo(() => {
    const p1 = [], p2 = []
    const rungArr = []
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 4
      const y   = (i / N) * 5.8 - 2.9
      p1.push(new THREE.Vector3(Math.cos(ang) * R, y, Math.sin(ang) * R))
      p2.push(new THREE.Vector3(Math.cos(ang + Math.PI) * R, y, Math.sin(ang + Math.PI) * R))
    }
    for (let i = 0; i < N; i += 2) {
      rungArr.push(p1[i].x, p1[i].y, p1[i].z, p2[i].x, p2[i].y, p2[i].z)
    }
    return { p1, p2, rungs: new Float32Array(rungArr) }
  }, [])

  useEffect(() => {
    const dummy = new THREE.Object3D()
    for (const [ref, pts] of [[s1, p1], [s2, p2]]) {
      if (!ref.current) continue
      pts.forEach((pos, i) => {
        dummy.position.copy(pos)
        dummy.updateMatrix()
        ref.current.setMatrixAt(i, dummy.matrix)
      })
      ref.current.instanceMatrix.needsUpdate = true
    }
  }, [p1, p2])

  useFrame(({ clock }) => {
    if (!grp.current) return
    grp.current.rotation.y   = clock.elapsedTime * 0.14
    grp.current.position.y   = Math.sin(clock.elapsedTime * 0.28) * 0.2
  })

  return (
    <group ref={grp} position={[-5.5, 0.2, -1.5]}>
      <instancedMesh ref={s1} args={[null, null, N]}>
        <sphereGeometry args={[0.065, 8, 6]} />
        <meshStandardMaterial color="#818cf8" emissive="#6366f1" emissiveIntensity={1.5} roughness={0.12} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={s2} args={[null, null, N]}>
        <sphereGeometry args={[0.065, 8, 6]} />
        <meshStandardMaterial color="#a78bfa" emissive="#8b5cf6" emissiveIntensity={1.5} roughness={0.12} metalness={0.7} />
      </instancedMesh>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[rungs, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#c4b5fd" transparent opacity={0.55} />
      </lineSegments>
    </group>
  )
}

/* ── Central morphing icosahedron ─────────────────────────────── */
function MorphSphere({ scrollRef }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.x = clock.elapsedTime * 0.07
    ref.current.rotation.y = clock.elapsedTime * 0.11
    ref.current.scale.setScalar(1 + scrollRef.current * 0.25)
  })
  return (
    <Float speed={0.8} floatIntensity={0.35} position={[0.5, 0.3, -3.5]}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.7, 4]} />
        <MeshDistortMaterial
          color="#5c5ff5"
          emissive="#4338ca"
          emissiveIntensity={0.55}
          roughness={0.04}
          metalness={0.95}
          distort={0.38}
          speed={1.3}
          transparent
          opacity={0.7}
        />
      </mesh>
    </Float>
  )
}

/* ── Neural-network particle field ───────────────────────────── */
function Particles({ scrollRef }) {
  const ptRef = useRef(), lnRef = useRef()
  const N = 650, L = 120
  const { pts, lines } = useMemo(() => {
    const pts = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 4 + Math.random() * 10
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      pts[i*3]   = r * Math.sin(p) * Math.cos(t)
      pts[i*3+1] = r * Math.sin(p) * Math.sin(t)
      pts[i*3+2] = r * Math.cos(p)
    }
    const lines = new Float32Array(L * 6)
    for (let i = 0; i < L; i++) {
      const a = Math.floor(Math.random() * N), b = Math.floor(Math.random() * N)
      lines.set([pts[a*3],pts[a*3+1],pts[a*3+2], pts[b*3],pts[b*3+1],pts[b*3+2]], i * 6)
    }
    return { pts, lines }
  }, [])

  useFrame(({ clock }) => {
    const ry = clock.elapsedTime * 0.022 + scrollRef.current * Math.PI * 0.6
    const rx = Math.sin(clock.elapsedTime * 0.01) * 0.07 + scrollRef.current * 0.15
    ;[ptRef, lnRef].forEach(r => {
      if (r.current) { r.current.rotation.y = ry; r.current.rotation.x = rx }
    })
  })

  return (
    <>
      <points ref={ptRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pts, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.046} color="#818cf8" transparent opacity={0.52} sizeAttenuation />
      </points>
      <lineSegments ref={lnRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#6366f1" transparent opacity={0.085} />
      </lineSegments>
    </>
  )
}

function Crystal({ pos, spd = 0.3, col = '#6366f1', sz = 0.8 }) {
  const r = useRef()
  useFrame(({ clock }) => {
    if (!r.current) return
    r.current.rotation.x = clock.elapsedTime * spd * 0.7
    r.current.rotation.y = clock.elapsedTime * spd
    r.current.rotation.z = clock.elapsedTime * spd * 0.4
  })
  return (
    <Float speed={1.4} floatIntensity={0.8} position={pos}>
      <mesh ref={r}>
        <icosahedronGeometry args={[sz, 1]} />
        <meshStandardMaterial color={col} wireframe emissive={col} emissiveIntensity={0.75} transparent opacity={0.55} />
      </mesh>
    </Float>
  )
}

function Ring({ pos, spd = 0.22, col = '#8b5cf6', r = 0.6, t = 0.12 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.x = clock.elapsedTime * spd
    ref.current.rotation.y = clock.elapsedTime * spd * 0.75
  })
  return (
    <Float speed={1.8} floatIntensity={0.55} position={pos}>
      <mesh ref={ref}>
        <torusGeometry args={[r, t, 8, 24]} />
        <meshStandardMaterial color={col} wireframe emissive={col} emissiveIntensity={0.75} transparent opacity={0.5} />
      </mesh>
    </Float>
  )
}

function Orb({ scrollRef }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t   = clock.elapsedTime
    const scr = scrollRef.current
    ref.current.rotation.x = t * 0.06
    ref.current.rotation.y = t * 0.11 + scr * Math.PI
    ref.current.rotation.z = t * 0.035
    ref.current.scale.setScalar(1 + scr * 0.4)
  })
  return (
    <mesh ref={ref} position={[5.5, 0.5, -3]}>
      <torusKnotGeometry args={[1.4, 0.36, 128, 16, 2, 3]} />
      <meshStandardMaterial color="#7c3aed" emissive="#6366f1" emissiveIntensity={0.5} roughness={0.08} metalness={0.88} transparent opacity={0.75} />
    </mesh>
  )
}

function DataRing({ radius, rotSpeed, col, scrollRef, phase = 0 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = scrollRef.current
    ref.current.rotation.z = clock.elapsedTime * rotSpeed
    ref.current.rotation.x = clock.elapsedTime * rotSpeed * 0.45 + t * 0.9 + phase
    ref.current.scale.setScalar(1 + t * 0.65)
    ref.current.material.opacity = 0.08 * (0.1 + t * 0.9)
  })
  return (
    <mesh ref={ref} position={[0.5, 0.3, -4]}>
      <torusGeometry args={[radius, 0.015, 4, 96]} />
      <meshBasicMaterial color={col} transparent opacity={0.008} />
    </mesh>
  )
}

function WarpGrid({ scrollRef }) {
  const ref = useRef()
  useFrame(() => {
    if (!ref.current) return
    const t = scrollRef.current
    ref.current.position.y = lerp(ref.current.position.y, -6 + t * 4.5, 0.024)
    ref.current.material.opacity = lerp(ref.current.material.opacity, t * 0.16, 0.024)
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2.4, 0, 0]} position={[0, -6, -3]}>
      <planeGeometry args={[34, 34, 22, 22]} />
      <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0} />
    </mesh>
  )
}

function Scene3D({ scrollRef }) {
  return (
    <>
      <Stars radius={120} depth={60} count={3200} factor={4} saturation={0} fade speed={0.3} />
      <ambientLight intensity={0.07} />
      <pointLight position={[6,   5,  5]} color="#6366f1" intensity={5}   />
      <pointLight position={[-7, -4,  4]} color="#8b5cf6" intensity={3}   />
      <pointLight position={[0,   8, -5]} color="#a78bfa" intensity={2.5} />
      <pointLight position={[3,  -3,  7]} color="#4f46e5" intensity={2}   />
      <ScrollDrift scrollRef={scrollRef} />
      <DataRing radius={2.6} rotSpeed={0.09}  col="#818cf8" scrollRef={scrollRef} phase={0}   />
      <DataRing radius={4.2} rotSpeed={0.065} col="#8b5cf6" scrollRef={scrollRef} phase={1.2} />
      <DataRing radius={6.0} rotSpeed={0.044} col="#a78bfa" scrollRef={scrollRef} phase={2.5} />
      <WarpGrid scrollRef={scrollRef} />
      <DNAHelix />
      <MorphSphere scrollRef={scrollRef} />
      <MouseParallax>
        <Particles scrollRef={scrollRef} />
        <Crystal pos={[-5.5,  3.5, -1]}  spd={0.27} col="#6366f1" sz={0.85} />
        <Crystal pos={[ 6.5, -2.0, -2]}  spd={0.19} col="#8b5cf6" sz={0.60} />
        <Crystal pos={[-3.0, -4.5, -3]}  spd={0.33} col="#a78bfa" sz={0.45} />
        <Crystal pos={[ 3.5,  4.0, -5]}  spd={0.22} col="#818cf8" sz={0.55} />
        <Ring    pos={[-7.5,  1.0, -2]}  spd={0.19} col="#6366f1" r={0.7}  t={0.13} />
        <Ring    pos={[ 2.5,  5.5, -4]}  spd={0.26} col="#8b5cf6" r={0.45} t={0.09} />
        <Ring    pos={[ 7.0, -1.5, -3]}  spd={0.17} col="#a78bfa" r={0.55} t={0.11} />
        <Orb scrollRef={scrollRef} />
      </MouseParallax>
      <EffectComposer>
        <Bloom luminanceThreshold={0.06} luminanceSmoothing={0.88} intensity={1.4} mipmapBlur />
      </EffectComposer>
    </>
  )
}

export default function Background3D({ scrollRef }) {
  return (
    <Safe3D>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <Canvas
          camera={{ position: [0, 0, 9], fov: 65 }}
          dpr={[0.8, 1.1]}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
          performance={{ min: 0.5 }}
        >
          <AdaptiveDpr pixelated />
          <Suspense fallback={null}>
            <Scene3D scrollRef={scrollRef} />
          </Suspense>
        </Canvas>
      </div>
    </Safe3D>
  )
}
