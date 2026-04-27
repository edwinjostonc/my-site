import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'

const BADGES = [
  { label: 'Python',       color: '#60a5fa' },
  { label: 'TensorFlow',   color: '#fb923c' },
  { label: 'SQL',          color: '#818cf8' },
  { label: 'Tableau',      color: '#22d3ee' },
  { label: 'SAP · ABAP',   color: '#a78bfa' },
  { label: 'scikit-learn', color: '#34d399' },
  { label: 'Power BI',     color: '#fbbf24' },
  { label: 'pandas',       color: '#60a5fa' },
  { label: 'NumPy',        color: '#818cf8' },
  { label: 'OpenCV',       color: '#a78bfa' },
  { label: 'PyTorch',      color: '#f87171' },
  { label: 'GitHub',       color: '#e2e8f0' },
]

/* Duplicate for seamless infinite loop */
const ALL = [...BADGES, ...BADGES]

function Badge({ label, color }) {
  return (
    <span style={{
      flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', gap: '0.42rem',
      padding: '0.38rem 0.9rem', borderRadius: '9999px',
      background: `${color}12`, border: `1px solid ${color}26`,
      fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em',
      color: `${color}cc`, whiteSpace: 'nowrap', cursor: 'default',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

export default function TechBadgeStrip() {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative', zIndex: 10,
        padding: '1.75rem 0',
        borderTop:    '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background:   'rgba(4,4,14,0.7)',
        overflow: 'hidden',
      }}
    >
      {/* Left edge fade */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 110, zIndex: 2,
        background: 'linear-gradient(to right, rgba(4,4,14,1) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Right edge fade */}
      <div aria-hidden="true" style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 110, zIndex: 2,
        background: 'linear-gradient(to left, rgba(4,4,14,1) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Label */}
      <div style={{
        position: 'absolute', left: '50%', top: '-0.65rem', transform: 'translateX(-50%)',
        zIndex: 3, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'rgba(129,140,248,0.5)',
        background: 'rgba(4,4,14,0.95)', padding: '0.15rem 0.75rem', borderRadius: '9999px',
        border: '1px solid rgba(129,140,248,0.1)',
      }}>
        Tech Stack
      </div>

      {/* Marquee track */}
      <div className="badge-marquee" style={{
        display: 'flex', gap: '0.6rem',
        width: 'max-content',
        animation: 'marquee 32s linear infinite',
      }}>
        {ALL.map((b, i) => <Badge key={i} {...b} />)}
      </div>
    </motion.div>
  )
}
