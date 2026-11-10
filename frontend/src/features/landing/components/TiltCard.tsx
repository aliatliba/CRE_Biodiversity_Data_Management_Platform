import type { PointerEvent, ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

interface TiltCardProps {
  /** Content clipped to the card (image, gradient). */
  children: ReactNode
  /** Content lifted off the card in 3D (caption). */
  overlay?: ReactNode
  className?: string
  maxTilt?: number
}

const SPRING = { stiffness: 220, damping: 22, mass: 0.6 }

/**
 * Card that tilts towards the mouse with a moving light glare. Touch and
 * reduced-motion users get a flat card. `overlay` floats above the surface
 * (translateZ), which only works outside the overflow-hidden layer.
 */
export function TiltCard({ children, overlay, className = '', maxTilt = 10 }: TiltCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const rotateX = useSpring(0, SPRING)
  const rotateY = useSpring(0, SPRING)
  const glareX = useMotionValue(50)
  const glareY = useMotionValue(50)
  const glareOpacity = useSpring(0, SPRING)
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.28), transparent 55%)`

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (shouldReduceMotion || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    rotateY.set((x - 0.5) * maxTilt * 2)
    rotateX.set((0.5 - y) * maxTilt * 2)
    glareX.set(x * 100)
    glareY.set(y * 100)
    glareOpacity.set(1)
  }

  function onPointerLeave() {
    rotateX.set(0)
    rotateY.set(0)
    glareOpacity.set(0)
  }

  return (
    <motion.div
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className={`group relative ${className}`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)]">
        {children}
        <motion.div
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
          style={{ backgroundImage: glare, opacity: glareOpacity }}
          aria-hidden="true"
        />
      </div>
      {overlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ transform: 'translateZ(40px)' }}>
          {overlay}
        </div>
      )}
    </motion.div>
  )
}
