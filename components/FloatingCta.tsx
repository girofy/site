'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Persistent conversion exit. Appears once the hero is consumed, retires when
 * the final CTA scene takes the stage — there is always exactly one visible
 * path to WhatsApp, never two competing ones.
 */
export default function FloatingCta({ href }: { href: string }) {
  const [pastHero, setPastHero] = useState(false)
  const [inFinale, setInFinale] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)

    const a = ScrollTrigger.create({
      trigger: '[data-scene="diag"]',
      start: 'top 75%',
      end: 'max',
      onToggle: (self) => setPastHero(self.isActive),
    })
    const b = ScrollTrigger.create({
      trigger: '[data-scene="logo"]',
      start: 'top 65%',
      end: 'max',
      onToggle: (self) => setInFinale(self.isActive),
    })
    return () => {
      a.kill()
      b.kill()
    }
  }, [])

  const visible = pastHero && !inFinale

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          key="floating-cta"
          href={href}
          target="_blank"
          rel="noreferrer"
          className="floating-cta"
          aria-label="Fazer diagnóstico gratuito pelo WhatsApp"
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          Diagnóstico <ArrowUpRight aria-hidden="true" />
        </motion.a>
      )}
    </AnimatePresence>
  )
}
