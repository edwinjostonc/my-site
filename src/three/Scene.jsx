import { useRef, useMemo, Suspense, Component } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, AdaptiveDpr } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import NeuralNet from './NeuralNet'

/* ── Error boundary ─────────────────────────────────────────── */
class Safe3D extends Component {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? null : this.props.children }
}

/* ── Camera spline path ──────────────────────────────────────── */
const CAM_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,    0,    12),
  new THREE.Vector3(2,   -0.3,   7),
  new THREE.Vector3(-1.5, 0.8,  3.5),
  new THREE.Vector3(3,    1.5,   5),
  new THREE.Vector3(0,    1,     9),
])

const LOOK_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,    0,   0),
  new THREE.Vector3(0.5,  0,   0),
  new THREE.Vector3(-0.3, 0.5, 0),
  new THREE.Vector3(0.5,  1.2, 0),
  new THREE.Vector3(0,    0.8, 0),
])

/* Module-level scratch vectors — no per-frame allocation */
const _camTarget  = new THREE.Vector3()
const _lookTarget = new THREE.Vector3()
const _cur        = new THREE.Vector3()
const _desired    = new THREE.Vector3()
const _lookPos    = new THREE.Vector3()

function CinematicCamera({ scrollRef }) {
  const { camera } = useThree()
  useFrame(() => {
    const t = scrollRef.current
    CAM_CURVE.getPoint(t, _camTarget)
    LOOK_CURVE.getPoint(t, _lookTarget)
    camera.position.lerp(_camTarget, 0.028)
    camera.getWorldDirection(_cur)
    _desired.copy(_lookTarget).sub(camera.position).normalize()
    _cur.lerp(_desired, 0.028)
    _lookPos.copy(camera.position).add(_cur)
    camera.lookAt(_lookPos)
    const fov = 60 + Math.sin(t * Math.PI) * 18
    camera.fov += (fov - camera.fov) * 0.028
    camera.updateProjectionMatrix()
  })
  return null
}

/* ── Mouse parallax ──────────────────────────────────────────── */
function MouseParallax({ children }) {
  const ref = useRef()
  useFrame(({ mouse }) => {
    if (!ref.current) return
    ref.current.rotation.y += (mouse.x * 0.06 - ref.current.rotation.y) * 0.04
    ref.current.rotation.x += (-mouse.y * 0.04 - ref.current.rotation.x) * 0.04
  })
  return <group ref={ref}>{children}</group>
}

/* ── Holographic background grid ────────────────────────────── */
function HoloGrid() {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pts = []
    const S = 14, D = 14
    for (let i = 0; i <= D; i++) {
      const v = -S / 2 + i * S / D
      pts.push(v, -S / 2, 0, v, S / 2, 0)
      pts.push(-S / 2, v, 0, S / 2, v, 0)
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return (
    <lineSegments geometry={geom} position={[0, 0, -3.5]}>
      <lineBasicMaterial color="#4f46e5" transparent opacity={0.04} depthWrite={false} />
    </lineSegments>
  )
}

/* ── Cyan scan sweep — horizontal plane drifting up ─────────── */
function ScanLine() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.elapsedTime * 0.16) % 1
    ref.current.position.y = -5.5 + t * 11
    ref.current.material.opacity = Math.sin(t * Math.PI) * 0.055
  })
  return (
    <mesh ref={ref}>
      <planeGeometry args={[24, 0.016]} />
      <meshBasicMaterial color="#06b6d4" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

/* ── Dual-colour ambient particles ──────────────────────────── */
function Particles({ mobile = false }) {
  const refA = useRef()
  const refB = useRef()

  const [ptsA, ptsB] = useMemo(() => {
    const gen = count => {
      const arr = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const r  = 8 + Math.random() * 10
        const th = Math.random() * Math.PI * 2
        const ph = Math.acos(2 * Math.random() - 1)
        arr[i * 3]     = r * Math.sin(ph) * Math.cos(th)
        arr[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
        arr[i * 3 + 2] = r * Math.cos(ph)
      }
      return arr
    }
    return [gen(mobile ? 50 : 100), gen(mobile ? 30 : 60)]
  }, [mobile])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (refA.current) {
      refA.current.rotation.y = t * 0.011
      refA.current.rotation.x = Math.sin(t * 0.007) * 0.04
    }
    if (refB.current) {
      refB.current.rotation.y = -t * 0.008
      refB.current.rotation.x = Math.cos(t * 0.005) * 0.03
    }
  })

  return (
    <>
      <points ref={refA}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ptsA, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.03} color="#818cf8" transparent opacity={0.28} sizeAttenuation />
      </points>
      <points ref={refB}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ptsB, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.025} color="#06b6d4" transparent opacity={0.20} sizeAttenuation />
      </points>
    </>
  )
}

/* ── Full scene ──────────────────────────────────────────────── */
function Scene({ scrollRef, mobile }) {
  return (
    <>
      <Stars radius={110} depth={55} count={mobile ? 200 : 600} factor={3.5} saturation={0} fade speed={0.25} />
      <ambientLight intensity={0.06} />
      <CinematicCamera scrollRef={scrollRef} />
      {!mobile && <HoloGrid />}
      {!mobile && <ScanLine />}
      <MouseParallax>
        <NeuralNet mobile={mobile} />
        <Particles mobile={mobile} />
      </MouseParallax>
      {!mobile && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.18} luminanceSmoothing={0.9} intensity={0.7} />
        </EffectComposer>
      )}
    </>
  )
}

/* ── Export ──────────────────────────────────────────────────── */
export default function Background3D({ scrollRef, mobile = false }) {
  return (
    <Safe3D>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <Canvas
          camera={{ position: [0, 0, 12], fov: 60 }}
          dpr={mobile ? [0.5, 0.75] : [0.7, 1.0]}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false }}
          performance={{ min: mobile ? 0.3 : 0.5 }}
        >
          <AdaptiveDpr pixelated />
          <Suspense fallback={null}>
            <Scene scrollRef={scrollRef} mobile={mobile} />
          </Suspense>
        </Canvas>
      </div>
    </Safe3D>
  )
}
