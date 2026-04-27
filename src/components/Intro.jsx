import { useRef, useEffect } from 'react'
import gsap from 'gsap'

/**
 * Cinematic preloader that wipes away to reveal the site.
 * Sequence: EJC monogram → name → progress bar → overlay slides up.
 * onDone() is called after the overlay is fully off-screen.
 */
export default function Intro({ onDone }) {
  const overlayRef = useRef(null)
  const monoRef    = useRef(null)
  const subRef     = useRef(null)
  const fillRef    = useRef(null)

  useEffect(() => {
    if (!overlayRef.current) return

    const tl = gsap.timeline()

    /* Initial hidden states set outside the timeline so they
       apply immediately before any paint                       */
    gsap.set([monoRef.current, subRef.current], { y: 40, opacity: 0 })
    gsap.set(fillRef.current, { scaleX: 0, transformOrigin: 'left center' })

    /* Reveal monogram */
    tl.to(monoRef.current, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0.2)
    /* Reveal name + role */
    tl.to(subRef.current,  { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' }, 0.45)
    /* Fill progress bar */
    tl.to(fillRef.current, { scaleX: 1, duration: 1.35, ease: 'power2.inOut' }, 0.55)
    /* Exit: content fades/lifts, overlay wipes up */
    tl.to(monoRef.current, { y: -32, opacity: 0, duration: 0.4, ease: 'power2.in' }, '+=0.1')
    tl.to(subRef.current,  { y: -22, opacity: 0, duration: 0.3, ease: 'power2.in' }, '<')
    tl.to(overlayRef.current, {
      yPercent: -100,
      duration: 0.88,
      ease: 'power4.inOut',
      onComplete: onDone,
    }, '<0.05')

    return () => tl.kill()
  }, [onDone])

  return (
    <div ref={overlayRef} aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#04040e',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1.5rem',
    }}>
      {/* Subtle radial glow behind monogram */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.07), transparent)',
      }} />

      {/* Monogram */}
      <div ref={monoRef} style={{
        position: 'relative',
        fontSize: 'clamp(5.5rem,15vw,9rem)', fontWeight: 900,
        letterSpacing: '-0.07em', lineHeight: 1,
        background: 'linear-gradient(135deg,#fff 15%,#818cf8 50%,#a78bfa 82%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>
        EJC
      </div>

      {/* Name + role */}
      <div ref={subRef} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem',
      }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.26em',
          textTransform: 'uppercase', color: 'rgba(148,163,184,0.6)',
        }}>
          Edwin Joston Cherayath
        </span>
        <div style={{
          width: 40, height: 1,
          background: 'linear-gradient(to right,transparent,rgba(129,140,248,0.4),transparent)',
        }} />
        <span style={{
          fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(100,116,139,0.45)',
        }}>
          Data Analyst · ML Researcher · Author
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: 108, height: 1, background: 'rgba(255,255,255,0.07)',
        borderRadius: 1, overflow: 'hidden', marginTop: '1.75rem',
      }}>
        <div ref={fillRef} style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(to right,#6366f1,#a78bfa)',
          borderRadius: 1,
        }} />
      </div>
    </div>
  )
}
