'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function CustomCursor() {
  const [hovered, setHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(true)

  // Use motion values for hardware accelerated positioning
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)

  // Soft spring config for premium lag effect
  const springConfig = { damping: 35, stiffness: 350, mass: 0.5 }
  const cursorXSpring = useSpring(cursorX, springConfig)
  const cursorYSpring = useSpring(cursorY, springConfig)

  useEffect(() => {
    const checkDevice = () => {
      const mobile = 
        window.matchMedia('(max-width: 768px)').matches || 
        ('ontouchstart' in window) || 
        (navigator.maxTouchPoints > 0)
      setIsMobile(mobile)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)

    if (isMobile) return

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
      setIsVisible(true) // React no-ops when already true — safe every frame
    }

    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    const handleMouseEnter = () => {
      setIsVisible(true)
    }

    // Global event delegation for hover states
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target) return
      
      const isInteractive = 
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('a') !== null || 
        target.closest('button') !== null || 
        target.closest('.cta') !== null ||
        window.getComputedStyle(target).cursor === 'pointer'

      setHovered(!!isInteractive)
    }

    window.addEventListener('mousemove', moveCursor)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseover', handleMouseOver)

    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('mousemove', moveCursor)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseover', handleMouseOver)
    }
  }, [isMobile, cursorX, cursorY])

  if (isMobile || !isVisible) return null

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        x: cursorXSpring,
        y: cursorYSpring,
        translateX: '-50%',
        translateY: '-50%',
        pointerEvents: 'none',
        zIndex: 9999,
        borderRadius: '50%',
        mixBlendMode: 'difference',
      }}
      animate={{
        width: hovered ? 40 : 8,
        height: hovered ? 40 : 8,
        backgroundColor: hovered ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5',
        border: hovered ? '1.5px solid rgba(255, 255, 255, 0.7)' : '0px solid transparent',
        boxShadow: hovered ? '0 0 15px rgba(255, 255, 255, 0.18)' : '0 0 8px rgba(245, 245, 245, 0.35)',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    />
  )
}
