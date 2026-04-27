import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useInView } from 'framer-motion'

gsap.registerPlugin(ScrollTrigger)

/* Neural network topology — mirrors the 3D scene for visual continuity */
const LAYERS = [4, 6, 5, 3]

function buildCanvasNet(W, H) {
  const starts = []
  let sum = 0
  LAYERS.forEach(c => { starts.push(sum); sum += c })

  const nodes = []
  LAYERS.forEach((count, li) => {
    const x = W * 0.12 + (li / (LAYERS.length - 1)) * W * 0.76
    for (let ni = 0; ni < count; ni++) {
      const y = H * 0.15 + (ni / Math.max(count - 1, 1)) * H * 0.7
      nodes.push({ x, y, layer: li })
    }
  })

  const edges = []
  for (let li = 0; li < LAYERS.length - 1; li++) {
    for (let ni = 0; ni < LAYERS[li]; ni++) {
      for (let nj = 0; nj < LAYERS[li + 1]; nj++) {
        edges.push({ from: nodes[starts[li] + ni], to: nodes[starts[li + 1] + nj], li })
      }
    }
  }

  return { nodes, edges }
}

/* Draw a single frame of the neural network training visualization */
function drawFrame(ctx, W, H, p) {
  /* Background */
  ctx.fillStyle = '#04040e'
  ctx.fillRect(0, 0, W, H)

  /* Subtle radial glow center */
  const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.55)
  grd.addColorStop(0, 'rgba(99,102,241,0.06)')
  grd.addColorStop(1, 'transparent')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, W, H)

  const { nodes, edges } = buildCanvasNet(W, H)

  /* Draw connections — activate progressively layer by layer */
  edges.forEach(e => {
    const threshold = e.li / (LAYERS.length - 1) * 0.55
    const prog      = Math.max(0, Math.min(1, (p - threshold) / 0.35))
    if (prog <= 0) return

    const lg = ctx.createLinearGradient(e.from.x, e.from.y, e.to.x, e.to.y)
    lg.addColorStop(0, `rgba(99,102,241,${0.18 * prog})`)
    lg.addColorStop(1, `rgba(167,139,250,${0.18 * prog})`)
    ctx.beginPath()
    ctx.moveTo(e.from.x, e.from.y)
    ctx.lineTo(e.to.x, e.to.y)
    ctx.strokeStyle = lg
    ctx.lineWidth   = 0.6
    ctx.stroke()

    /* Pulse dot */
    if (prog > 0.3) {
      const t  = ((p * 3.2) + e.li * 0.4) % 1
      const px = e.from.x + (e.to.x - e.from.x) * t
      const py = e.from.y + (e.to.y - e.from.y) * t
      const rg = ctx.createRadialGradient(px, py, 0, px, py, 5)
      rg.addColorStop(0, `rgba(192,132,252,${0.85 * prog})`)
      rg.addColorStop(1, 'rgba(192,132,252,0)')
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fillStyle = rg
      ctx.fill()
    }
  })

  /* Draw nodes */
  nodes.forEach(n => {
    const threshold = (n.layer / (LAYERS.length - 1)) * 0.4
    const prog      = Math.max(0, Math.min(1, (p - threshold) / 0.25))
    if (prog <= 0) return

    /* Outer glow */
    const glowR = 18 * prog
    const rg    = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR)
    rg.addColorStop(0, `rgba(99,102,241,${0.28 * prog})`)
    rg.addColorStop(1, 'rgba(99,102,241,0)')
    ctx.beginPath()
    ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2)
    ctx.fillStyle = rg
    ctx.fill()

    /* Core */
    ctx.beginPath()
    ctx.arc(n.x, n.y, 5 * prog, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(129,140,248,${0.9 * prog})`
    ctx.fill()
  })

  /* Layer labels */
  const labelY = H * 0.92
  const alpha  = Math.min(1, p * 4)
  ctx.font       = `500 ${Math.round(W * 0.011)}px Inter, system-ui, sans-serif`
  ctx.textAlign  = 'center'
  ctx.fillStyle  = `rgba(100,116,139,${alpha})`
  ;['Input', 'Hidden 1', 'Hidden 2', 'Output'].forEach((lbl, li) => {
    const x = W * 0.12 + (li / 3) * W * 0.76
    ctx.fillText(lbl, x, labelY)
  })

  /* Vignette */
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85)
  vig.addColorStop(0, 'transparent')
  vig.addColorStop(1, 'rgba(4,4,14,0.55)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)
}

export default function ScrollVideo({ src }) {
  const containerRef = useRef(null)
  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const labelRef     = useRef(null)

  /* ── Canvas-driven fallback (no video file needed) ─────────── */
  useEffect(() => {
    if (src) return
    const canvas = canvasRef.current
    const cont   = containerRef.current
    if (!canvas || !cont) return

    let trigger

    const resize = () => {
      canvas.width  = canvas.parentElement?.clientWidth  || window.innerWidth
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    const ctx = canvas.getContext('2d')
    drawFrame(ctx, canvas.width, canvas.height, 0)

    trigger = ScrollTrigger.create({
      trigger: cont,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate(self) {
        drawFrame(ctx, canvas.width, canvas.height, self.progress)
      },
    })

    return () => {
      trigger?.kill()
      window.removeEventListener('resize', resize)
    }
  }, [src])

  /* ── Real video sync ────────────────────────────────────────── */
  useEffect(() => {
    if (!src || !videoRef.current) return
    const video = videoRef.current
    video.pause()
    video.currentTime = 0

    let trigger
    const setup = () => {
      trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        onUpdate(self) {
          if (video.duration) video.currentTime = self.progress * video.duration
        },
      })
    }

    if (video.readyState >= 1) setup()
    else video.addEventListener('loadedmetadata', setup, { once: true })

    return () => { trigger?.kill() }
  }, [src])

  return (
    <div
      ref={containerRef}
      style={{ height: '260vh', position: 'relative', zIndex: 10 }}
    >
      {/* Sticky viewport */}
      <div style={{
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
        background: '#04040e',
      }}>
        {src ? (
          <video ref={videoRef} src={src} muted playsInline preload="auto"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <canvas ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        )}

        {/* Overlay text */}
        <div style={{
          position: 'absolute', bottom: '3.5rem', left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
          zIndex: 2, pointerEvents: 'none', textAlign: 'center',
        }}>
          <span style={{
            fontSize: '0.6rem', letterSpacing: '0.28em', textTransform: 'uppercase',
            color: 'rgba(100,116,139,0.6)',
          }}>
            scroll to explore
          </span>
          <span ref={labelRef} style={{
            fontSize: 'clamp(1rem, 2.2vw, 1.4rem)', fontWeight: 700,
            letterSpacing: '-0.03em', color: 'rgba(241,245,249,0.85)',
          }}>
            Neural Network · Training Visualization
          </span>
        </div>

        {/* Top + bottom gradient blends */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '12rem',
          background: 'linear-gradient(to bottom,rgba(4,4,14,1),transparent)',
          pointerEvents: 'none', zIndex: 1,
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '14rem',
          background: 'linear-gradient(to top,rgba(4,4,14,1),transparent)',
          pointerEvents: 'none', zIndex: 1,
        }} />
      </div>
    </div>
  )
}
