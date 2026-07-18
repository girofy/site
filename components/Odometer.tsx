'use client'

import { useEffect, useRef } from 'react'

/** Counts from 0 to `value` like a machine odometer when it enters the viewport. */
export default function Odometer({
  value,
  prefix = '',
  suffix = '',
  duration = 1600,
}: {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fmt = (n: number) => n.toLocaleString('pt-BR')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = `${prefix}${fmt(value)}${suffix}`
      return
    }
    let raf = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          const e = 1 - Math.pow(1 - t, 4) // heavy flywheel easing out
          el.textContent = `${prefix}${fmt(Math.round(value * e))}${suffix}`
          if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, prefix, suffix, duration])

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  )
}
