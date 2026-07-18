'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Ignition sequence — no fake progress bar. The Girofy emblem (a segmented G)
 * spins up from 0 RPM like an engine starting, stabilizes, and releases the page.
 */
export default function Preloader() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [rpm, setRpm] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const DURATION = reduced ? 200 : 1100
    const MAX_RPM = 1200
    const start = performance.now()
    let raf = 0
    let rot = 0
    let last = start

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      const size = 120
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = size * dpr
      canvas.height = size * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const draw = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION)
        const ease = t * t * (3 - 2 * t)
        const dt = (now - last) / 1000
        last = now
        rot += ease * 14 * dt
        setRpm(Math.round(MAX_RPM * ease))

        ctx.clearRect(0, 0, size, size)
        const cx = size / 2
        const cy = size / 2
        const R = 42
        // G arc with a gap opening at the top-right (the arrow's exit)
        for (let i = 0; i < 10; i++) {
          const a = rot + (i / 10) * Math.PI * 2
          const gapCenter = -Math.PI / 4
          let da = ((a - gapCenter + Math.PI) % (Math.PI * 2)) - Math.PI
          const inGap = Math.abs(da) < 0.5
          const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
          g.addColorStop(0, '#eef0f2')
          g.addColorStop(1, '#9ea3ab')
          ctx.strokeStyle = g
          ctx.globalAlpha = inGap ? 0.15 : 0.95
          ctx.lineWidth = 7
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.arc(cx, cy, R, a - 0.22, a + 0.22)
          ctx.stroke()
        }
        ctx.globalAlpha = 1

        if (t < 1) {
          raf = requestAnimationFrame(draw)
        } else {
          setTimeout(() => {
            setIsLoaded(true)
            document.body.style.overflow = ''
            window.dispatchEvent(new Event('girofy:preloaded'))
          }, 180)
        }
      }
      raf = requestAnimationFrame(draw)
    } else {
      setTimeout(() => {
        setIsLoaded(true)
        document.body.style.overflow = ''
        window.dispatchEvent(new Event('girofy:preloaded'))
      }, DURATION)
    }

    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ y: '-100vh', transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#070708',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.4rem',
          }}
        >
          <canvas ref={canvasRef} style={{ width: 120, height: 120 }} aria-hidden="true" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.45rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-geist-sans), sans-serif',
                fontWeight: 720,
                fontSize: '1.15rem',
                color: '#f5f5f5',
                letterSpacing: '-0.05em',
              }}
            >
              GIROFY<span style={{ color: '#c7cbd1' }}>.</span>
            </span>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: '0.6rem',
                color: '#7b7f86',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Ignição · {String(rpm).padStart(4, '0')} RPM
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
