import type { ReactNode } from 'react'
import { motion, type MotionValue } from 'framer-motion'

/**
 * Shared image slot used across the landing page.
 *
 * No external URLs are ever hard-coded here — that's what breaks in
 * production. Instead each call site passes a locally-imported asset:
 *
 *   import heroImg from '@/assets/landing/hero-atlas-cedar.jpg'
 *   <EditorialImage src={heroImg} alt="Atlas cedar forest, Djurdjura" />
 *
 * Until a real file is wired in, `src` is left undefined and this renders
 * a designed placeholder (soft gradient + grain) instead of a broken image
 * or a generic stock photo, so the page always looks intentional.
 */
interface EditorialImageProps {
  src?: string
  alt: string
  className?: string
  seed?: string
  parallax?: boolean
}

export function EditorialImage({ src, alt, className = '', seed = 'default' }: EditorialImageProps) {
  if (src) {
    return <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} loading="lazy" />
  }

  const hue = Array.from(seed).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div
      role="img"
      aria-label={alt}
      className={`bg-grain h-full w-full ${className}`}
      style={{
        background: `linear-gradient(160deg, hsl(${hue} 32% 20%) 0%, hsl(${(hue + 35) % 360} 28% 10%) 60%, hsl(${(hue + 10) % 360} 25% 6%) 100%)`,
      }}
    />
  )
}

export function ParallaxLayer({ children, y }: { children: ReactNode; y: MotionValue<number> }) {
  return (
    <motion.div style={{ y }} className="absolute inset-0">
      {children}
    </motion.div>
  )
}
