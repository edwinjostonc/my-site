import { useRef, useState, useEffect, useMemo, Suspense, lazy, memo } from 'react'
import {
  motion, useInView, useMotionValue, useSpring,
  useReducedMotion, useScroll, useTransform, animate,
} from 'framer-motion'
import { useLenis } from './animations/useLenis'
import TechBadgeStrip from './components/TechBadgeStrip'
import ScrollVideo     from './components/ScrollVideo'
import Intro           from './components/Intro'

/* Three.js lazy-loaded — only mounted on desktop (≥1024 px) so
   Lighthouse mobile audits never execute the heavy chunk           */
const Background3D = lazy(() => import('./three/Scene'))

/* ── Lightweight canvas fallback for mobile / reduced-motion ─── */
const AmbientCanvas = memo(function AmbientCanvas() {
  const ref     = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return
    let raf, active = true
    const io = new IntersectionObserver(([e]) => { active = e.isIntersecting }, { threshold: 0 })
    io.observe(el)
    const resize = () => { el.width = window.innerWidth; el.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize, { passive: true })
    const ctx = el.getContext('2d')
    const ps  = Array.from({ length: 80 }, () => ({
      x: Math.random() * el.width,  y: Math.random() * el.height,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - .5) * .1, vy: (Math.random() - .5) * .1,
      o: Math.random() * .18 + .05,
    }))
    const draw = () => {
      if (active) {
        ctx.clearRect(0, 0, el.width, el.height)
        for (const p of ps) {
          p.x = (p.x + p.vx + el.width)  % el.width
          p.y = (p.y + p.vy + el.height) % el.height
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(129,140,248,${p.o})`; ctx.fill()
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', resize) }
  }, [reduced])

  if (reduced) return null
  return <canvas ref={ref} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
})

/* ── Design tokens ──────────────────────────────────────────── */
const C = {
  bg:       '#04040e',
  surface:  'rgba(8,8,22,0.88)',
  card:     'rgba(12,12,28,0.82)',
  border:   'rgba(255,255,255,0.07)',
  borderHi: 'rgba(129,140,248,0.35)',
  text1:    '#f1f5f9',
  text2:    '#94a3b8',
  text3:    '#6b7c93',   // 5.4:1 on bg, 5.0:1 on card — WCAG AA
  accent1:  '#818cf8',
  accent2:  '#a78bfa',
  green:    '#34d399',
}

const GLASS = {
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
}

const ROLES = ['Data Analyst', 'ML Researcher', 'SAP Developer', 'Published Author']

/* ── Animation helpers ──────────────────────────────────────── */
const rise = (delay = 0) => ({
  hidden:  { opacity: 0, y: 52, scale: 0.94, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0,  scale: 1.0,  filter: 'blur(0px)',
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] } },
})
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }

function useReveal() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return { ref, inView }
}

/* ── Scroll-progress bar ────────────────────────────────────── */
function ScrollBar() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 200,
      background: 'linear-gradient(to right,#6366f1,#8b5cf6,#a78bfa)',
      transformOrigin: 'left', scaleX: scrollYProgress,
    }} />
  )
}

/* ── Custom cursor + DOM sparkle trail ─────────────────────── */
function Cursor() {
  const cx = useMotionValue(-200), cy = useMotionValue(-200)
  const dx = useSpring(cx, { stiffness: 600, damping: 38 })
  const dy = useSpring(cy, { stiffness: 600, damping: 38 })
  const rx = useSpring(cx, { stiffness: 130, damping: 22 })
  const ry = useSpring(cy, { stiffness: 130, damping: 22 })
  const [big, setBig] = useState(false)

  useEffect(() => {
    const mv = e => { cx.set(e.clientX); cy.set(e.clientY) }
    const ov = e => setBig(!!e.target.closest('a,button'))
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseover', ov)
    return () => {
      window.removeEventListener('mousemove', mv)
      window.removeEventListener('mouseover', ov)
    }
  }, [cx, cy])

  /* Sparkle trail — direct DOM manipulation for zero React re-renders */
  useEffect(() => {
    const N = 10
    const dots = Array.from({ length: N }, (_, i) => {
      const d = document.createElement('div')
      const s = 3.5 - i * 0.28
      d.style.cssText = [
        'position:fixed', 'pointer-events:none', 'z-index:9996',
        'border-radius:50%', 'transform:translate(-50%,-50%)',
        `width:${s}px`, `height:${s}px`,
        'background:rgba(129,140,248,0.55)',
        'will-change:left,top',
      ].join(';')
      document.body.appendChild(d)
      return d
    })

    const positions = Array.from({ length: N }, () => ({ x: -200, y: -200 }))
    let mouse = { x: -200, y: -200 }, rafId = null, dirty = false

    const move = e => { mouse.x = e.clientX; mouse.y = e.clientY; dirty = true }

    const tick = () => {
      if (dirty) {
        for (let i = N - 1; i > 0; i--) {
          positions[i].x = positions[i - 1].x
          positions[i].y = positions[i - 1].y
        }
        positions[0].x = mouse.x
        positions[0].y = mouse.y
        dots.forEach((dot, i) => {
          dot.style.left    = positions[i].x + 'px'
          dot.style.top     = positions[i].y + 'px'
          dot.style.opacity = ((1 - i / N) * 0.42).toFixed(3)
        })
        dirty = false
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    window.addEventListener('mousemove', move, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', move)
      dots.forEach(d => d.parentNode?.removeChild(d))
    }
  }, [])

  return (
    <>
      <motion.div style={{
        position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none',
        x: dx, y: dy, translateX: '-50%', translateY: '-50%', borderRadius: '50%',
        background: 'rgba(129,140,248,0.9)', mixBlendMode: 'screen',
        width: big ? 18 : 9, height: big ? 18 : 9, transition: 'width .15s, height .15s',
      }} />
      <motion.div style={{
        position: 'fixed', top: 0, left: 0, zIndex: 9998, pointerEvents: 'none',
        x: rx, y: ry, translateX: '-50%', translateY: '-50%', borderRadius: '50%',
        border: '1px solid rgba(129,140,248,0.32)',
        width: big ? 50 : 32, height: big ? 50 : 32, transition: 'width .15s, height .15s',
      }} />
    </>
  )
}

/* ── Typewriter role cycler ─────────────────────────────────── */
function TypeWriter() {
  const reduced   = useReducedMotion()
  const [idx, setIdx]           = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (reduced) { setDisplayed(ROLES[0]); return }
    const target = ROLES[idx]
    const speed  = deleting ? 38 : 82
    const id = setTimeout(() => {
      if (!deleting && displayed === target) {
        setTimeout(() => setDeleting(true), 2000)
        return
      }
      if (deleting && displayed === '') {
        setDeleting(false)
        setIdx(n => (n + 1) % ROLES.length)
        return
      }
      setDisplayed(d => deleting ? d.slice(0, -1) : target.slice(0, d.length + 1))
    }, speed)
    return () => clearTimeout(id)
  }, [displayed, deleting, idx, reduced])

  return (
    <span>
      <span style={{
        background: `linear-gradient(135deg,${C.accent1},${C.accent2})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        fontWeight: 700,
      }}>{displayed}</span>
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
        style={{ color: C.accent1, fontWeight: 200 }}
      >|</motion.span>
    </span>
  )
}

/* ── Cursor spotlight halo ──────────────────────────────────── */
function CursorHalo() {
  const x  = useMotionValue(-600)
  const y  = useMotionValue(-600)
  const sx = useSpring(x, { stiffness: 55, damping: 20 })
  const sy = useSpring(y, { stiffness: 55, damping: 20 })

  useEffect(() => {
    const fn = e => { x.set(e.clientX); y.set(e.clientY) }
    window.addEventListener('mousemove', fn, { passive: true })
    return () => window.removeEventListener('mousemove', fn)
  }, [x, y])

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'fixed', zIndex: 1, pointerEvents: 'none',
        width: 680, height: 680, borderRadius: '50%',
        x: sx, y: sy, translateX: '-50%', translateY: '-50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
        mixBlendMode: 'screen',
      }}
    />
  )
}

/* ── Magnetic button ────────────────────────────────────────── */
function MagBtn({ children, href, onClick, variant = 'primary', style: sx = {} }) {
  const reduced = useReducedMotion()
  const ref = useRef()
  const mx = useMotionValue(0), my = useMotionValue(0)
  const smx = useSpring(mx, { stiffness: 400, damping: 25 })
  const smy = useSpring(my, { stiffness: 400, damping: 25 })

  const move = e => {
    if (reduced || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    mx.set(Math.max(-8, Math.min(8, (e.clientX - r.left - r.width  / 2) * 0.4)))
    my.set(Math.max(-8, Math.min(8, (e.clientY - r.top  - r.height / 2) * 0.4)))
  }
  const leave = () => { mx.set(0); my.set(0) }

  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '0.875rem 2rem', borderRadius: '9999px',
    fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.01em',
    textDecoration: 'none', cursor: 'pointer', border: 'none', outline: 'none',
    transition: 'filter .25s, box-shadow .25s',
  }
  const styles = {
    primary: {
      ...base,
      background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff',
      boxShadow: '0 0 30px rgba(99,102,241,0.4), 0 2px 8px rgba(0,0,0,0.3)',
    },
    ghost: {
      ...base,
      background: 'rgba(255,255,255,0.04)', color: C.text1,
      border: `1px solid ${C.border}`, ...GLASS,
    },
  }
  const isHttp  = href?.startsWith('http')
  const combined = { ...styles[variant], ...sx }

  if (href) return (
    <motion.a ref={ref} href={href}
      target={isHttp ? '_blank' : undefined}
      rel={isHttp ? 'noopener noreferrer' : undefined}
      style={{ x: smx, y: smy, ...combined }}
      onMouseMove={move} onMouseLeave={leave}
      whileHover={{ filter: 'brightness(1.12)' }}
    >{children}</motion.a>
  )

  return (
    <motion.button ref={ref} onClick={onClick}
      style={{ x: smx, y: smy, ...combined }}
      onMouseMove={move} onMouseLeave={leave}
      whileHover={{ filter: 'brightness(1.12)' }}
    >{children}</motion.button>
  )
}

/* ── 3-D tilt card ──────────────────────────────────────────── */
function TiltCard({ children, style: sx = {} }) {
  const reduced = useReducedMotion()
  const ref = useRef()
  const tx = useMotionValue(0), ty = useMotionValue(0)
  const rX = useTransform(ty, [-0.5, 0.5], [7, -7])
  const rY = useTransform(tx, [-0.5, 0.5], [-7, 7])
  const srX = useSpring(rX, { stiffness: 280, damping: 32 })
  const srY = useSpring(rY, { stiffness: 280, damping: 32 })

  const move = e => {
    if (reduced || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    tx.set((e.clientX - r.left) / r.width  - 0.5)
    ty.set((e.clientY - r.top)  / r.height - 0.5)
  }
  return (
    <motion.div ref={ref} onMouseMove={move} onMouseLeave={() => { tx.set(0); ty.set(0) }}
      style={{ rotateX: srX, rotateY: srY, transformStyle: 'preserve-3d', transformPerspective: 900, ...sx }}
    >{children}</motion.div>
  )
}

/* ── Animated stat counter ──────────────────────────────────── */
function Counter({ num, label }) {
  const ref = useRef()
  const inView = useInView(ref, { once: true })
  const mv     = useMotionValue(0)
  const parsed = parseInt(num, 10)
  const isNum  = !isNaN(parsed)
  const disp   = useTransform(mv, v => String(num).includes('+') ? `${Math.round(v)}+` : String(Math.round(v)))

  useEffect(() => {
    if (!inView || !isNum) return
    const c = animate(mv, parsed, { duration: 1.8, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [inView, isNum, mv, parsed])

  return (
    <div ref={ref} style={{
      padding: '1.75rem 1.5rem', borderRadius: '1.25rem',
      background: 'rgba(15,15,35,0.9)', border: `1px solid ${C.border}`, ...GLASS,
    }}>
      <div style={{
        fontSize: isNum ? '2.5rem' : '1.3rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
        lineHeight: 1, marginBottom: '0.5rem',
        background: `linear-gradient(135deg,${C.accent1},${C.accent2})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>
        {isNum ? <motion.span>{disp}</motion.span> : num}
      </div>
      <div style={{ fontSize: '0.8rem', color: C.text2, lineHeight: 1.4, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

/* ── Animated skill bar ─────────────────────────────────────── */
function SkillBar({ name, pct, delay = 0 }) {
  const ref    = useRef()
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <div ref={ref}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.8125rem', color: C.text2, fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: '0.6875rem', color: C.text2, fontFamily: 'ui-monospace,monospace' }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 1.1, delay: delay + 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: '100%', borderRadius: 2,
            background: `linear-gradient(to right,${C.accent1},${C.accent2})`,
            boxShadow: '0 0 6px rgba(99,102,241,0.5)',
          }}
        />
      </div>
    </div>
  )
}

/* ── Aurora orb — soft radial glow behind sections ─────────── */
function AuroraOrb({ color, x = '50%', y = '50%', size = 600, opacity = 0.12, pulse = false }) {
  return (
    <motion.div
      aria-hidden="true"
      animate={pulse ? { scale: [1, 1.12, 1], opacity: [opacity, opacity * 1.45, opacity] } : undefined}
      transition={pulse ? { duration: 7, repeat: Infinity, ease: 'easeInOut' } : undefined}
      style={{
        position: 'absolute', width: size, height: Math.round(size * 0.65),
        left: x, top: y, transform: 'translate(-50%,-50%)', borderRadius: '50%',
        pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)`,
        filter: 'blur(72px)', opacity,
      }}
    />
  )
}

/* ── Skills pentagon radar (SVG) ────────────────────────────── */
function SkillsRadar() {
  const { ref, inView } = useReveal()
  const N = 5, cx = 110, cy = 110, maxR = 82
  const groups = ['Data', 'Viz', 'ML', 'SAP', 'Tools']
  const scores  = [0.88,  0.81,  0.78, 0.83,  0.81]
  const ang = (i) => (i / N) * Math.PI * 2 - Math.PI / 2
  const pt  = (i, r) => ({ x: cx + r * Math.cos(ang(i)), y: cy + r * Math.sin(ang(i)) })
  const gridPoly = useMemo(() => (f) => Array.from({ length: N }, (_, i) => { const p = pt(i, f * maxR); return `${p.x},${p.y}` }).join(' '), [])
  const dataPoly  = useMemo(() => scores.map((s, i) => { const p = pt(i, s * maxR); return `${p.x},${p.y}` }).join(' '), [])
  return (
    <motion.div ref={ref} variants={rise(0.15)}
      style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={220} height={220} viewBox="0 0 220 220" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <polygon key={f} points={gridPoly(f)} fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="1" />
        ))}
        {Array.from({ length: N }, (_, i) => {
          const p = pt(i, maxR)
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(99,102,241,0.1)" strokeWidth="1" />
        })}
        <motion.polygon
          points={dataPoly}
          fill="rgba(99,102,241,0.14)"
          stroke="url(#rg)" strokeWidth="1.5" strokeLinejoin="round"
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
        {scores.map((s, i) => {
          const p = pt(i, s * maxR)
          return (
            <motion.circle key={i} cx={p.x} cy={p.y} r="3.5"
              fill="#818cf8" stroke="#a78bfa" strokeWidth="1"
              initial={{ scale: 0 }} animate={inView ? { scale: 1 } : {}}
              transition={{ duration: 0.45, delay: 0.9 + i * 0.1 }}
              style={{ transformOrigin: `${p.x}px ${p.y}px` }}
            />
          )
        })}
        {groups.map((g, i) => {
          const p = pt(i, maxR + 20)
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fontWeight="600" fill="rgba(148,163,184,0.7)"
              fontFamily="Inter,sans-serif" letterSpacing="0.08em">
              {g}
            </text>
          )
        })}
      </svg>
    </motion.div>
  )
}

/* ── Animated conic-gradient border card ────────────────────── */
function AnimatedBorderCard({ children }) {
  return (
    <div style={{ position: 'relative', borderRadius: '2rem', padding: 2 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: -2, borderRadius: '2rem',
          background: 'conic-gradient(from 0deg,#6366f1 0%,#8b5cf6 25%,#a78bfa 50%,rgba(99,102,241,0) 75%,#6366f1 100%)',
          filter: 'blur(3px)',
        }}
      />
      <div style={{
        position: 'relative', borderRadius: 'calc(2rem - 2px)',
        background: 'rgba(5,5,18,0.97)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   NAV
══════════════════════════════════════════════════════════════ */
const NAV_LINKS = [
  { label: 'About',      href: '#about'      },
  { label: 'Experience', href: '#experience' },
  { label: 'Education',  href: '#education'  },
  { label: 'Work',       href: '#work'       },
  { label: 'Skills',     href: '#skills'     },
  { label: 'Contact',    href: '#contact'    },
]

function Nav() {
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [activeId,  setActiveId]  = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Active section tracker */
  useEffect(() => {
    const ids = NAV_LINKS.map(l => l.href.slice(1))
    const io  = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id) })
      },
      { rootMargin: '-40% 0px -55% 0px' }
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])

  /* Close drawer on link click */
  const close = () => setMenuOpen(false)

  return (
    <>
      <motion.header
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? 'rgba(4,4,14,0.92)' : 'rgba(4,4,14,0.6)',
          borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
          boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
          transition: 'background .4s, border-color .4s, box-shadow .4s', ...GLASS,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="#hero" style={{
            fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.04em', textDecoration: 'none',
            background: `linear-gradient(135deg,#fff,${C.accent1})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>EJC</a>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" style={{ display: 'flex', gap: '2.25rem', alignItems: 'center' }}
            className="desktop-nav">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = activeId === href.slice(1)
              return (
                <a key={label} href={href} style={{
                  fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500,
                  color: isActive ? C.accent1 : C.text2,
                  transition: 'color .2s',
                  position: 'relative',
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.text1 }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.text2 }}
                >
                  {label}
                  {isActive && (
                    <motion.div layoutId="nav-underline" style={{
                      position: 'absolute', bottom: -4, left: 0, right: 0, height: 1,
                      background: C.accent1, borderRadius: 1,
                    }} />
                  )}
                </a>
              )
            })}
          </nav>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <MagBtn href="mailto:edwinjc1999@icloud.com" variant="primary"
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem' }}
              className="desktop-only">
              Hire me
            </MagBtn>

            {/* Hamburger — visible on mobile only */}
            <motion.button
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="hamburger"
              style={{
                display: 'none', background: 'none', border: `1px solid ${C.border}`,
                borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer',
                color: C.text1, flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center',
              }}
              whileTap={{ scale: 0.92 }}
            >
              <motion.span animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 6 : 0 }}
                style={{ display: 'block', width: 18, height: 1.5, background: C.text1, borderRadius: 1 }} />
              <motion.span animate={{ opacity: menuOpen ? 0 : 1 }}
                style={{ display: 'block', width: 18, height: 1.5, background: C.text1, borderRadius: 1 }} />
              <motion.span animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -6 : 0 }}
                style={{ display: 'block', width: 18, height: 1.5, background: C.text1, borderRadius: 1 }} />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <motion.div
        initial={false}
        animate={{ opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? 'auto' : 'none' }}
        style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(4,4,14,0.97)', ...GLASS,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem',
        }}
      >
        {NAV_LINKS.map(({ label, href }, i) => (
          <motion.a
            key={label} href={href} onClick={close}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: menuOpen ? 1 : 0, y: menuOpen ? 0 : 20 }}
            transition={{ delay: menuOpen ? i * 0.05 : 0 }}
            style={{
              fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em',
              color: activeId === href.slice(1) ? C.accent1 : C.text1,
              textDecoration: 'none',
            }}
          >{label}</motion.a>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: menuOpen ? 1 : 0, y: menuOpen ? 0 : 20 }}
          transition={{ delay: menuOpen ? NAV_LINKS.length * 0.05 : 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', marginTop: '1rem' }}
        >
          <MagBtn href="mailto:edwinjc1999@icloud.com" variant="primary" onClick={close}>Hire me</MagBtn>
          <MagBtn href="/cv.pdf" variant="ghost" onClick={close}>Download CV ↓</MagBtn>
        </motion.div>
      </motion.div>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   SECTION WRAPPER
══════════════════════════════════════════════════════════════ */
function Section({ id, children, style: sx = {} }) {
  const { ref, inView } = useReveal()
  return (
    <motion.section id={id} ref={ref}
      variants={stagger} initial="hidden" animate={inView ? 'visible' : 'hidden'}
      className="section-inner"
      style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', ...sx }}
    >{children}</motion.section>
  )
}

function SectionLabel({ eyebrow, title }) {
  const { ref, inView } = useReveal()
  const words = title.split(' ')
  return (
    <div ref={ref} style={{ marginBottom: '3.5rem' }}>
      {/* Eyebrow slides in from left */}
      <motion.div
        initial={{ opacity: 0, x: -18 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: 24, height: 1, background: `linear-gradient(to right,${C.accent1},transparent)`, transformOrigin: 'left' }}
        />
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent1 }}>
          {eyebrow}
        </span>
      </motion.div>

      {/* Title — each word reveals upward from a clip mask */}
      <h2 style={{
        fontSize: 'clamp(2rem,4.5vw,3rem)', fontWeight: 800, letterSpacing: '-0.04em',
        lineHeight: 1.1, margin: 0, color: C.text1,
        display: 'flex', flexWrap: 'wrap', columnGap: '0.32em',
      }}>
        {words.map((word, i) => (
          <span key={i} style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 1.15 }}>
            <motion.span
              initial={{ y: '115%' }}
              animate={inView ? { y: '0%' } : {}}
              transition={{ duration: 0.72, delay: 0.12 + i * 0.09, ease: [0.76, 0, 0.24, 1] }}
              style={{ display: 'block' }}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </h2>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   HERO
══════════════════════════════════════════════════════════════ */
function Hero() {
  const { scrollY } = useScroll()
  const heroY     = useTransform(scrollY, [0, 600], [0, -90])
  const heroScale = useTransform(scrollY, [0, 600], [1, 0.96])
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0])

  return (
    <section id="hero" style={{
      position: 'relative', minHeight: '100vh', zIndex: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '8rem 1.5rem 4rem', textAlign: 'center',
    }}>
      {/* Single centered aurora glow — subtle depth behind hero text */}
      <AuroraOrb color="rgba(99,102,241,0.55)" x="50%" y="44%" size={700} opacity={0.10} pulse />

      {/* Radial vignette — text always readable over 3-D */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse 90% 80% at 50% 50%, rgba(4,4,14,0.3) 0%, rgba(4,4,14,0.82) 100%)',
      }} />

      {/* Parallax wrapper — content drifts up + fades as user scrolls past */}
      <motion.div style={{ y: heroY, scale: heroScale, opacity: heroOpacity, position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

      {/* Available badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative', zIndex: 2,
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 1rem', borderRadius: '9999px', marginBottom: '2.5rem',
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
          color: C.green, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}
      >
        <motion.span
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'block' }}
        />
        Available in Deutschland
      </motion.div>

      {/* Name — premium clip-mask slide-up reveal (Apple/Vercel style) */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginBottom: '2rem',
      }}>
        {['Edwin', 'Joston', 'Cherayath'].map((w, i) => (
          <div key={w} style={{ overflow: 'hidden' }}>
            <motion.span
              className="shimmer-text"
              initial={{ y: '112%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.9, delay: 0.3 + i * 0.13, ease: [0.76, 0, 0.24, 1] }}
              style={{
                display: 'block',
                fontSize: 'clamp(3rem,10vw,7rem)', fontWeight: 800,
                letterSpacing: '-0.05em', lineHeight: 0.9,
              }}
            >{w}</motion.span>
          </div>
        ))}
      </div>

      {/* Gradient divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.68, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative', zIndex: 2, height: 1, width: 160,
          background: `linear-gradient(to right,transparent,${C.accent1},transparent)`,
          marginBottom: '1.75rem',
        }}
      />

      {/* Tagline + TypeWriter */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', zIndex: 2, maxWidth: '38rem', margin: '0 0 3rem', textAlign: 'center' }}
      >
        <div style={{ fontSize: 'clamp(1.125rem,2.2vw,1.375rem)', fontWeight: 600, color: C.text1, marginBottom: '0.75rem', minHeight: '1.7em' }}>
          <TypeWriter />
        </div>
        <p style={{ fontSize: 'clamp(0.9375rem,1.6vw,1.0625rem)', color: C.text2, lineHeight: 1.72, margin: 0, fontWeight: 400 }}>
          Turning enterprise data and ML research into clear, actionable decisions.
        </p>
      </motion.div>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.88, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative', zIndex: 2, display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}
      >
        <MagBtn href="#work" variant="primary">View Work →</MagBtn>
        <MagBtn href="#contact" variant="ghost">Get in Touch</MagBtn>
      </motion.div>


      </motion.div>{/* end parallax wrapper */}

      {/* Scroll cue — fixed at bottom, not affected by parallax */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.6 }}
        style={{
          position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 2,
        }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 22, height: 34, borderRadius: 11, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 5,
          }}
        >
          <div style={{ width: 3, height: 9, borderRadius: 2, background: `linear-gradient(to bottom,${C.accent1},transparent)` }} />
        </motion.div>
        <span style={{ fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.text3 }}>scroll</span>
      </motion.div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════
   ABOUT  (solid glass wrapper so text reads over 3-D)
══════════════════════════════════════════════════════════════ */
function About() {
  return (
    <div style={{ background: 'rgba(4,4,14,0.88)', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, ...GLASS }}>
      <Section id="about">
        <SectionLabel eyebrow="Who I am" title="About Me" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '3.5rem', alignItems: 'start' }}>
          <motion.div variants={rise()} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              <>I'm a data analyst with a year of SAP enterprise experience spanning five modules — <strong style={{ color: C.text1, fontWeight: 600 }}>SD, MM, FI, CO, and PP</strong>. Led data migrations, built ABAP automation, and ran multi-phase client testing with zero critical errors at go-live.</>,
              <>Completing my <strong style={{ color: C.text1, fontWeight: 600 }}>MSc in Information Technology Management</strong> at Berlin School of Business and Innovation (graduating April 2026). Thesis: CNN, SVM, Random Forest, and deep learning applied to Alzheimer detection from MRI data.</>,
              <>Also a <strong style={{ color: C.text1, fontWeight: 600 }}>published author</strong> — peer-reviewed work on lip reading with deep learning (IJISRT 2021). Open to data analyst and analytics engineering roles in Berlin.</>,
            ].map((t, i) => <p key={i} style={{ color: C.text2, fontSize: '1.0625rem', lineHeight: 1.78, margin: 0, fontWeight: 400 }}>{t}</p>)}
          </motion.div>
          <motion.div variants={rise(0.1)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { num: '5',       label: 'SAP Modules mastered' },
              { num: '0',       label: 'Critical go-live errors' },
              { num: '2+',      label: 'Published papers' },
              { num: 'Apr 2026',label: 'MSc graduation' },
            ].map(s => <Counter key={s.label} {...s} />)}
          </motion.div>
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   EXPERIENCE
══════════════════════════════════════════════════════════════ */
const EXP = [
  {
    role: 'SAP Developer', co: 'Denova GloSoft', period: 'Dec 2022 – May 2023',
    bullets: [
      'Migrated data across 5 SAP modules — zero critical errors in first 30 days post go-live',
      'Built ABAP automation, significantly reducing manual processing overhead',
      'Led 3 testing phases across 2 separate client deployments',
    ],
  },
  {
    role: 'SAP Technical Consultant', co: 'Ikyam Solutions', period: 'Jun – Dec 2022',
    bullets: [
      'Delivered 2 complete client SAP implementations on schedule',
      'Engineered ABAP automation for recurring data processing workflows',
      'Diagnosed and resolved cross-module data integrity issues at go-live',
    ],
  },
  {
    role: 'SAP & Embedded Systems Intern', co: 'Keltron', period: '2017',
    bullets: [
      'Built Arduino IoT prototypes integrating multiple sensors',
      'Gained foundational exposure to SAP enterprise architecture',
    ],
  },
]

function Experience() {
  return (
    <div style={{ background: 'rgba(4,4,14,0.88)', borderBottom: `1px solid ${C.border}`, ...GLASS }}>
      <Section id="experience">
        <SectionLabel eyebrow="Career" title="Experience" />
        <div style={{ position: 'relative', paddingLeft: '2.75rem' }}>
          <div style={{
            position: 'absolute', left: 0, top: 8, bottom: 0, width: 1,
            background: `linear-gradient(to bottom,${C.accent1},rgba(139,92,246,.2),transparent)`,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {EXP.map((e, i) => (
              <motion.div key={e.co} variants={rise(i * 0.1)} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '-2.625rem', top: '1.5rem',
                  width: 10, height: 10, borderRadius: '50%',
                  background: `linear-gradient(135deg,${C.accent1},${C.accent2})`,
                  boxShadow: '0 0 12px rgba(99,102,241,.7)',
                }} />
                <motion.div
                  whileHover={{ borderColor: C.borderHi, background: 'rgba(20,20,45,0.95)' }}
                  style={{
                    padding: '1.75rem', borderRadius: '1.25rem',
                    border: `1px solid ${C.border}`, background: 'rgba(12,12,28,0.85)',
                    transition: 'border-color .3s, background .3s', ...GLASS,
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.125rem' }}>
                    <div>
                      <h3 style={{ margin: 0, color: C.text1, fontWeight: 700, fontSize: '1.0625rem' }}>{e.role}</h3>
                      <span style={{ color: C.accent1, fontSize: '0.875rem', fontWeight: 500 }}>{e.co}</span>
                    </div>
                    <time style={{
                      fontSize: '0.6875rem', fontFamily: 'ui-monospace,monospace', color: C.text3,
                      background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.75rem',
                      borderRadius: '9999px', whiteSpace: 'nowrap', border: `1px solid ${C.border}`,
                    }}>{e.period}</time>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {e.bullets.map(b => (
                      <li key={b} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: C.text2, lineHeight: 1.65 }}>
                        <span style={{ color: C.accent1, marginTop: 3, flexShrink: 0, fontSize: '0.6rem' }}>▸</span>{b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   EDUCATION
══════════════════════════════════════════════════════════════ */
const EDU = [
  {
    degree: 'MSc Information Technology Management',
    school: 'Berlin School of Business and Innovation',
    period: '2024 – April 2026',
    badge: 'Graduated',
    detail: "Thesis: CNN, SVM, Random Forest, and deep learning applied to Alzheimer's detection from MRI data. Focus on clinical interpretability and model comparison.",
    tags: ['Machine Learning', 'Deep Learning', 'Python', 'Research'],
  },
  {
    degree: 'Bachelor of Computer Science & Engineering',
    school: 'Capital University',
    period: '2016 – 2020',
    badge: 'First Class',
    detail: 'Final year project on deep learning–based lip reading using LSTM and facial feature extraction. Published in IJISRT 2021.',
    tags: ['Data Structures', 'Algorithms', 'Machine Learning', 'LSTM'],
  },
]

function Education() {
  return (
    <div style={{ background: 'rgba(4,4,14,0.88)', borderBottom: `1px solid ${C.border}`, ...GLASS }}>
      <Section id="education">
        <SectionLabel eyebrow="Academic" title="Education" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {EDU.map((e, i) => (
            <motion.div key={e.degree} variants={rise(i * 0.1)}
              whileHover={{ borderColor: C.borderHi, background: 'rgba(20,20,45,0.95)' }}
              style={{
                padding: '2rem', borderRadius: '1.25rem',
                border: `1px solid ${C.border}`, background: 'rgba(12,12,28,0.85)',
                transition: 'border-color .3s, background .3s', ...GLASS,
                display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, color: C.text1, fontWeight: 700, fontSize: '1.0625rem' }}>{e.degree}</h3>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                    padding: '0.2rem 0.6rem', borderRadius: '9999px',
                    background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: C.green,
                  }}>{e.badge}</span>
                </div>
                <div style={{ color: C.accent1, fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>{e.school}</div>
                <p style={{ color: C.text2, fontSize: '0.9rem', lineHeight: 1.72, margin: '0 0 1rem' }}>{e.detail}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {e.tags.map(t => (
                    <span key={t} style={{
                      fontSize: '0.6875rem', fontWeight: 500, padding: '0.25rem 0.625rem', borderRadius: '9999px',
                      border: '1px solid rgba(99,102,241,.2)', color: 'rgba(165,180,252,.85)',
                      background: 'rgba(99,102,241,.07)',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
              <time style={{
                fontSize: '0.6875rem', fontFamily: 'ui-monospace,monospace', color: C.text3,
                background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.75rem',
                borderRadius: '9999px', whiteSpace: 'nowrap', border: `1px solid ${C.border}`,
                alignSelf: 'start',
              }}>{e.period}</time>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PROJECTS
══════════════════════════════════════════════════════════════ */
const PROJECT_ACCENTS = [
  'linear-gradient(90deg,#6366f1,#8b5cf6)',
  'linear-gradient(90deg,#3b82f6,#6366f1)',
  'linear-gradient(90deg,#06b6d4,#818cf8)',
  'linear-gradient(90deg,#10b981,#3b82f6)',
  'linear-gradient(90deg,#8b5cf6,#ec4899)',
]

const PROJECTS = [
  {
    sub: 'MSc Thesis', title: 'MRI-Based Alzheimer Detection',
    desc: 'Comparative study of CNN, SVM, Random Forest, and Logistic Regression for Alzheimer detection from MRI scans. Focus on clinical interpretability.',
    tags: ['Python', 'TensorFlow', 'scikit-learn', 'OpenCV'], link: null,
  },
  {
    sub: 'Published · IJISRT 2021', title: 'Lip Reading with Deep Learning',
    desc: 'Peer-reviewed LSTM-based lip reading using facial feature extraction. Achieves real-time inference on video input.',
    tags: ['Python', 'LSTM', 'OpenCV', 'Deep Learning'],
    link: 'https://ijisrt.com/lip-reading-using-facial-feature-extraction-and-deep-learning',
  },
  {
    sub: 'Data Engineering', title: 'COVID-19 Global Dashboard',
    desc: 'SQL window functions across 193-country dataset. Tableau dashboard tracking rolling averages, death rates, and vaccination progress.',
    tags: ['SQL', 'Tableau'], link: null,
  },
  {
    sub: 'Predictive Modelling', title: 'Real Estate Market Analysis',
    desc: 'Regression models for price prediction with feature engineering. Three Tableau dashboards: market trends, neighbourhood analysis, forecasting.',
    tags: ['Python', 'scikit-learn', 'pandas', 'Tableau'], link: null,
  },
  {
    sub: 'Classification', title: 'Global Infectious Disease Analysis',
    desc: 'Classification model across 50+ countries with SHAP-based feature importance. Key epidemiological predictors identified.',
    tags: ['Python', 'scikit-learn', 'SHAP', 'Tableau'], link: null,
  },
]

function ProjectCard({ p, i }) {
  const [hov, setHov] = useState(false)
  const cardRef = useRef()
  const spotRef = useRef()

  const onMove = e => {
    if (!cardRef.current || !spotRef.current) return
    const r = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width)  * 100
    const y = ((e.clientY - r.top)  / r.height) * 100
    spotRef.current.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(129,140,248,0.12) 0%, transparent 58%)`
  }

  return (
    <TiltCard style={{ height: '100%' }}>
      <motion.div ref={cardRef} variants={rise(i * 0.07)}
        whileHover={{ y: -6, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
        onHoverStart={() => setHov(true)} onHoverEnd={() => setHov(false)}
        onMouseMove={onMove}
        style={{
          position: 'relative', padding: '1.75rem', borderRadius: '1.25rem', height: '100%',
          border: `1px solid ${hov ? C.borderHi : C.border}`,
          background: hov ? 'rgba(20,18,48,0.95)' : 'rgba(12,12,28,0.85)',
          boxShadow: hov ? '0 16px 70px rgba(99,102,241,0.22), inset 0 1px 0 rgba(255,255,255,0.07)' : 'none',
          transition: 'border-color .35s, background .35s, box-shadow .35s',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', ...GLASS,
        }}
      >
        {/* Per-card colour accent stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: PROJECT_ACCENTS[i % PROJECT_ACCENTS.length],
          opacity: hov ? 1 : 0.55, transition: 'opacity .35s',
          borderRadius: '1.25rem 1.25rem 0 0',
        }} />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '1.25rem', pointerEvents: 'none',
          background: 'linear-gradient(135deg,rgba(99,102,241,.09),rgba(139,92,246,.09))',
          opacity: hov ? 1 : 0, transition: 'opacity .35s',
        }} />
        {/* Mouse-position spotlight — ref-driven, zero re-renders */}
        <div ref={spotRef} style={{
          position: 'absolute', inset: 0, borderRadius: '1.25rem', pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 50%, rgba(129,140,248,0.12) 0%, transparent 58%)',
          opacity: hov ? 1 : 0, transition: 'opacity .3s',
        }} />
        {/* Faint background number for character */}
        <div style={{
          position: 'absolute', right: '1rem', bottom: '0.75rem',
          fontSize: '5.5rem', fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg,rgba(99,102,241,0.11),rgba(139,92,246,0.07))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          pointerEvents: 'none', userSelect: 'none', fontVariantNumeric: 'tabular-nums',
          transition: 'opacity .35s', opacity: hov ? 0.9 : 0.5,
        }}>{String(i + 1).padStart(2, '0')}</div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.accent1, marginBottom: '0.375rem' }}>
            {p.sub}
          </span>
          <h3 style={{ margin: '0 0 0.75rem', color: C.text1, fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.35 }}>{p.title}</h3>
          <p style={{ color: C.text2, fontSize: '0.9rem', lineHeight: 1.72, flex: 1, margin: '0 0 1.25rem', fontWeight: 400 }}>{p.desc}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
            {p.tags.map(t => (
              <span key={t} style={{
                fontSize: '0.6875rem', fontWeight: 500, padding: '0.25rem 0.625rem', borderRadius: '9999px',
                border: '1px solid rgba(99,102,241,.2)', color: 'rgba(165,180,252,.85)',
                background: 'rgba(99,102,241,.07)',
              }}>{t}</span>
            ))}
            {p.link && (
              <a href={p.link} target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: 'auto', fontSize: '0.75rem', color: C.accent1, textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 500 }}>
                Read paper ↗
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </TiltCard>
  )
}

function Projects() {
  return (
    <div style={{ background: 'rgba(4,4,14,0.88)', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, ...GLASS }}>
      <Section id="work">
        <SectionLabel eyebrow="Portfolio" title="Featured Work" />
        <div className="project-grid">
          {PROJECTS.map((p, i) => <ProjectCard key={p.title} p={p} i={i} />)}
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   SKILLS
══════════════════════════════════════════════════════════════ */
const SKILLS = [
  { g: 'Data Analysis', items: [
    { name: 'SQL',          pct: 93 },
    { name: 'Python',       pct: 90 },
    { name: 'pandas / NumPy', pct: 87 },
    { name: 'Excel',        pct: 83 },
  ]},
  { g: 'Visualisation', items: [
    { name: 'Tableau',      pct: 88 },
    { name: 'Power BI',     pct: 80 },
    { name: 'Matplotlib / Seaborn', pct: 74 },
  ]},
  { g: 'Machine Learning', items: [
    { name: 'scikit-learn', pct: 85 },
    { name: 'TensorFlow / CNN', pct: 77 },
    { name: 'LSTM & Deep Learning', pct: 73 },
    { name: 'SHAP / Explainability', pct: 78 },
  ]},
  { g: 'Enterprise · SAP', items: [
    { name: 'SD · MM · FI · CO · PP', pct: 88 },
    { name: 'ABAP',         pct: 76 },
    { name: 'ETL / Data Migration', pct: 83 },
  ]},
  { g: 'Tools', items: [
    { name: 'GitHub',       pct: 85 },
    { name: 'Jira',         pct: 78 },
    { name: 'DBeaver / Jupyter', pct: 80 },
  ]},
]

function Skills() {
  return (
    <div style={{ background: 'rgba(4,4,14,0.88)', borderBottom: `1px solid ${C.border}`, ...GLASS }}>
      <Section id="skills">
        <SectionLabel eyebrow="Capabilities" title="Skills" />
        <motion.div variants={rise()} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: '2rem', alignItems: 'center',
          marginBottom: '2.5rem', padding: '2rem',
          borderRadius: '1.5rem', border: `1px solid ${C.border}`,
          background: 'rgba(12,12,28,0.82)', ...GLASS,
        }}>
          <SkillsRadar />
          <div>
            <h3 style={{ margin: '0 0 0.75rem', color: C.text1, fontWeight: 700, fontSize: '1.0625rem' }}>
              Skill Overview
            </h3>
            <p style={{ color: C.text2, fontSize: '0.9375rem', lineHeight: 1.72, margin: '0 0 1.25rem', fontWeight: 400 }}>
              Five domains — enterprise data engineering, SAP consulting, ML research, and interactive visualization.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                'Data Analysis · 88%', 'Visualisation · 81%',
                'Machine Learning · 78%', 'SAP · ABAP · 83%', 'Dev Tools · 81%',
              ].map(label => (
                <span key={label} style={{
                  fontSize: '0.6875rem', fontWeight: 600, padding: '0.25rem 0.75rem',
                  borderRadius: '9999px', border: `1px solid ${C.borderHi}`,
                  color: C.accent1, background: 'rgba(99,102,241,.07)',
                }}>{label}</span>
              ))}
            </div>
          </div>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '1rem' }}>
          {SKILLS.map((s, i) => (
            <motion.div key={s.g} variants={rise(i * 0.07)}
              whileHover={{ borderColor: 'rgba(99,102,241,.3)', background: 'rgba(20,18,48,0.9)' }}
              style={{
                padding: '1.5rem', borderRadius: '1.25rem',
                border: `1px solid ${C.border}`, background: 'rgba(12,12,28,0.82)',
                transition: 'border-color .3s, background .3s', ...GLASS,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                <motion.div
                  animate={{ boxShadow: ['0 0 3px rgba(99,102,241,.4)', '0 0 10px rgba(139,92,246,.8)', '0 0 3px rgba(99,102,241,.4)'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
                  style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${C.accent1},${C.accent2})` }}
                />
                <h3 style={{ margin: 0, color: C.text1, fontWeight: 600, fontSize: '0.9rem' }}>{s.g}</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {s.items.map((sk, j) => (
                  <SkillBar key={sk.name} name={sk.name} pct={sk.pct} delay={i * 0.07 + j * 0.05} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   CONTACT
══════════════════════════════════════════════════════════════ */
function Contact() {
  return (
    <div style={{ background: 'rgba(4,4,14,0.88)', borderTop: `1px solid ${C.border}`, ...GLASS }}>
      <Section id="contact">
        <div style={{ maxWidth: '40rem', margin: '0 auto' }}>
          <AnimatedBorderCard>
            <div style={{ textAlign: 'center', padding: '3.5rem 2.5rem' }}>
              <motion.div variants={rise()} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.375rem 1rem', borderRadius: '9999px', marginBottom: '2rem',
                background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                color: C.green, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
              }}>
                <motion.span
                  animate={{ scale: [1, 1.4, 1], opacity: [1, .4, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'block' }}
                />
                Available in Deutschland
              </motion.div>

              <motion.h2 variants={rise(0.05)} style={{
                fontSize: 'clamp(2.5rem,6vw,4.25rem)', fontWeight: 800,
                letterSpacing: '-0.04em', lineHeight: 1, margin: '0 0 1.5rem', color: C.text1,
              }}>
                Let's build<br />
                <span style={{
                  background: `linear-gradient(135deg,${C.accent1},${C.accent2})`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>something great.</span>
              </motion.h2>

              <motion.p variants={rise(0.1)} style={{ color: C.text2, fontSize: '1.0625rem', lineHeight: 1.72, margin: '0 0 2.5rem', fontWeight: 400 }}>
                Open to data analyst, analytics engineer, and ML roles in Berlin. Reach out and let's talk.
              </motion.p>

              <motion.div variants={rise(0.15)} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', justifyContent: 'center', marginBottom: '3.5rem' }}>
                <MagBtn href="mailto:edwinjc1999@icloud.com" variant="primary">Send an Email</MagBtn>
                <MagBtn href="https://www.linkedin.com/in/edwin-j-cherayath-649540212" variant="ghost">LinkedIn ↗</MagBtn>
              </motion.div>

              <motion.div variants={rise(0.2)} style={{
                paddingTop: '2.5rem', borderTop: `1px solid ${C.border}`,
                display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center',
                fontSize: '0.875rem', color: C.text3, fontWeight: 400,
              }}>
                <span>+49 176 812 60316</span>
                <span>edwinjc1999@icloud.com · Berlin, Germany</span>
                <a href="https://github.com/edwinjostonc" target="_blank" rel="noopener noreferrer"
                  style={{ color: C.accent1, textDecoration: 'none', fontSize: '0.75rem', marginTop: '0.25rem' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.text1}
                  onMouseLeave={e => e.currentTarget.style.color = C.accent1}
                >github.com/edwinjostonc ↗</a>
              </motion.div>
            </div>
          </AnimatedBorderCard>
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`, padding: '1.75rem 1.5rem',
      position: 'relative', zIndex: 10, background: 'rgba(4,4,14,0.95)', ...GLASS,
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', color: C.text3,
      }}>
        <span>Edwin Joston Cherayath · {new Date().getFullYear()}</span>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[
            ['GitHub',   'https://github.com/edwinjostonc'],
            ['LinkedIn', 'https://www.linkedin.com/in/edwin-j-cherayath-649540212'],
            ['Email',    'mailto:edwinjc1999@icloud.com'],
          ].map(([l, h]) => (
            <a key={l} href={h}
              target={h.startsWith('http') ? '_blank' : undefined}
              rel={h.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{ color: C.text2, textDecoration: 'none', transition: 'color .2s', fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.color = C.text1}
              onMouseLeave={e => e.currentTarget.style.color = C.text2}
            >{l}</a>
          ))}
        </div>
      </div>
    </footer>
  )
}

/* ══════════════════════════════════════════════════════════════
   APP  — scroll ref threaded into lazy 3-D canvas
══════════════════════════════════════════════════════════════ */
export default function App() {
  const scrollRef = useRef(0)
  const [isDesktop]     = useState(() => window.innerWidth >= 1024)
  const [introComplete, setIntroComplete] = useState(false)
  const [show3D, setShow3D] = useState(false)

  useEffect(() => {
    if (!isDesktop) return
    const cb = () => setShow3D(true)
    const id = 'requestIdleCallback' in window
      ? requestIdleCallback(cb, { timeout: 1000 })
      : setTimeout(cb, 800)
    return () => ('requestIdleCallback' in window ? cancelIdleCallback : clearTimeout)(id)
  }, [isDesktop])

  /* Butter-smooth scroll — wired to GSAP ScrollTrigger inside the hook */
  useLenis()

  useEffect(() => {
    const fn = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollRef.current = max > 0 ? window.scrollY / max : 0
    }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ background: C.bg, color: C.text1, minHeight: '100vh', fontFamily: "'Inter',system-ui,sans-serif", overflowX: 'hidden' }}>
      {/* Cinematic preloader */}
      {!introComplete && <Intro onDone={() => setIntroComplete(true)} />}

      {/* Film grain texture overlay */}
      <div aria-hidden="true" className="noise" />

      {isDesktop && show3D
        ? <Suspense fallback={null}><Background3D scrollRef={scrollRef} /></Suspense>
        : <AmbientCanvas />
      }
      <CursorHalo />
      <ScrollBar />
      <Cursor />
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Nav />
        <main>
          <Hero />
          <TechBadgeStrip />
          <About />
          <Experience />
          <Education />
          <Projects />
          <ScrollVideo />
          <Skills />
          <Contact />
        </main>
        <Footer />
      </div>
    </div>
  )
}
