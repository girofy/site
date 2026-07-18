'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type Lenis from 'lenis'
import { GiroEngine, type SceneName } from './giro/engine'

/**
 * The film director, now on GSAP rails.
 *
 * ScrollTrigger owns all measurement: one trigger per scene feeds the canvas
 * engine (scene + progress) and flips the page chapter; scrubbed timelines
 * choreograph the copy beats; the case deck gets labeled steps with magnetic
 * snapping and clickable dots. The engine itself is untouched — it just gets
 * driven by a better chauffeur.
 */
const SCENE_ORDER: SceneName[] = ['hero', 'diag', 'build', 'cases', 'flow', 'founder', 'logo']

export default function GiroDirector() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const slateRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const engine = new GiroEngine(canvas)
    engine.reduced = reduced
    document.documentElement.setAttribute('data-giro', reduced ? 'static' : 'on')

    const resize = () => engine.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1)
    resize()
    window.addEventListener('resize', resize)

    if (reduced) {
      engine.scene = 'logo'
      engine.progress = 1
      engine.render(performance.now())
      return () => {
        window.removeEventListener('resize', resize)
        document.documentElement.removeAttribute('data-giro')
      }
    }

    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      const scenes = gsap.utils.toArray<HTMLElement>('[data-scene]')

      for (const el of scenes) {
        const name = el.dataset.scene as SceneName
        const chapter = el.dataset.chapter === 'light' ? 'light' : 'dark'

        // Progress feed → canvas engine + CSS var + chapter flip
        ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate(self) {
            el.style.setProperty('--p', self.progress.toFixed(4))
            if (self.isActive) {
              engine.scene = name
              engine.progress = self.progress
            }
          },
          onToggle(self) {
            if (self.isActive) {
              engine.scene = name
              document.body.dataset.chapter = chapter
              const idx = SCENE_ORDER.indexOf(name)
              if (slateRef.current && idx >= 0) {
                slateRef.current.textContent = `CENA ${String(idx + 1).padStart(2, '0')} / ${String(SCENE_ORDER.length).padStart(2, '0')}`
              }
            }
          },
        })

        // Scrubbed copy beats (cases scene has its own deck timeline)
        const beats = el.querySelectorAll<HTMLElement>('.beat')
        if (beats.length && name !== 'cases') {
          gsap
            .timeline({
              scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
            })
            .fromTo(
              beats,
              { autoAlpha: 0, y: 34 },
              { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.45, ease: 'power2.out' }
            )
            .to({}, { duration: 0.7 }) // hold the finished scene before unpinning
        }
      }

      // Hero: headline drifts up and dims as the dive begins
      gsap.to('.hero-stage', {
        yPercent: -8,
        autoAlpha: 0.2,
        ease: 'none',
        scrollTrigger: { trigger: '[data-scene="hero"]', start: 'top top', end: 'bottom bottom', scrub: 0.8 },
      })

      // Founder photo: depth parallax (targets the img so it never fights the beat tween on the figure)
      gsap.fromTo(
        '.founder-photo img',
        { y: 18 },
        {
          y: -14,
          ease: 'none',
          scrollTrigger: { trigger: '[data-scene="founder"]', start: 'top top', end: 'bottom bottom', scrub: 1 },
        }
      )

      // ——— Case deck: labeled steps, magnetic snap, clickable dots ———
      const cards = gsap.utils.toArray<HTMLElement>('.case-card')
      if (cards.length) {
        gsap.set(cards.slice(1), { autoAlpha: 0, y: 46, scale: 0.97 })
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: '[data-scene="cases"]',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
            snap: { snapTo: 'labels', duration: { min: 0.2, max: 0.6 }, ease: 'power1.inOut', inertia: false, delay: 0.1 },
          },
        })
        tl.addLabel('case0')
        for (let i = 1; i < cards.length; i++) {
          tl.to(cards[i - 1], { autoAlpha: 0, y: -30, scale: 0.98, duration: 0.3 }, `case${i - 1}+=0.5`)
            .fromTo(cards[i], { autoAlpha: 0, y: 46, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3 })
            .addLabel(`case${i}`)
        }
        tl.to({}, { duration: 0.6 })

        const dots = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-case-dot]'))
        const st = tl.scrollTrigger!
        const lenis = (window as unknown as { __lenis?: Lenis }).__lenis
        dots.forEach((d) => {
          d.addEventListener('click', () => {
            const i = Number(d.dataset.caseDot)
            const px = st.labelToScroll(`case${i}`)
            if (lenis) lenis.scrollTo(px, { duration: 1 })
            else window.scrollTo({ top: px, behavior: 'smooth' })
          })
        })
        tl.eventCallback('onUpdate', () => {
          const active = Math.round(tl.progress() * (cards.length - 1) * 1.06)
          dots.forEach((d, i) => d.toggleAttribute('data-on', i === Math.min(active, cards.length - 1)))
        })
        dots[0]?.toggleAttribute('data-on', true)
      }

      // The film's progress hairline (whole page, 1px of chrome)
      if (progressRef.current) {
        gsap.fromTo(
          progressRef.current,
          { scaleX: 0 },
          { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.4 } }
        )
      }

      ScrollTrigger.refresh()
    })

    // Single render loop for the protagonist, on GSAP's clock.
    // The turbine feels the hand: Lenis velocity feeds its RPM.
    const renderTick = () => {
      const lenis = (window as unknown as { __lenis?: { velocity: number } }).__lenis
      const v = lenis ? Math.min(1, Math.abs(lenis.velocity) / 60) : 0
      engine.boost += (v - engine.boost) * 0.08
      engine.render(performance.now())
    }
    gsap.ticker.add(renderTick)

    // Retention detail: the tab remembers you left the engine idling
    const baseTitle = document.title
    const onVisibility = () => {
      document.title = document.hidden ? '● Girofy — seu motor está em espera' : baseTitle
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      gsap.ticker.remove(renderTick)
      document.removeEventListener('visibilitychange', onVisibility)
      document.title = baseTitle
      ctx.revert()
      window.removeEventListener('resize', resize)
      document.documentElement.removeAttribute('data-giro')
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="giro-canvas" aria-hidden="true" />
      <div ref={progressRef} className="film-progress" aria-hidden="true" />
      <span ref={slateRef} className="scene-slate" aria-hidden="true">CENA 01 / 07</span>
    </>
  )
}
