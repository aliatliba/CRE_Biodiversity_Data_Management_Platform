import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Check } from 'lucide-react'
import { Reveal } from '@/components/common/Reveal'

const STAGES = [
  { id: 'observation', label: 'Field observation', detail: 'Researcher logs a sighting against a site' },
  { id: 'identification', label: 'Species identification', detail: 'Scientific name entered or matched' },
  { id: 'external', label: 'External validation', detail: 'Checked against GBIF & existing catalogue' },
  { id: 'protected', label: 'Protected-status check', detail: 'Cross-referenced with IUCN Red List' },
  { id: 'validated', label: 'Validated record', detail: 'Added to the registry, source-traced' },
]

const LAST = STAGES.length - 1

/**
 * Scroll-driven: a record travels along the track and each checkpoint lights
 * up once it has passed. Reduced motion shows every checkpoint as passed.
 */
export function ValidationPipeline() {
  const trackRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start 85%', 'end 45%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26 })
  const [scrolledTo, setScrolledTo] = useState(0)
  const reached = shouldReduceMotion ? STAGES.length : scrolledTo

  useMotionValueEvent(progress, 'change', (value) => {
    setScrolledTo(Math.min(STAGES.length, Math.floor(value * LAST + 0.02) + (value > 0.01 ? 1 : 0)))
  })

  const fill = shouldReduceMotion ? 1 : progress
  // The track spans the centres of the first and last checkpoints.
  const headX = useTransform(progress, (v) => `${v * 100}%`)

  return (
    <section id="validation" className="bg-surface">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8">
        <Reveal className="max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-canopy-700">Before it hits the record</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            No duplicate entries. No unverified names.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-muted">
            Every observation moves through the same five checkpoints before
            it's added to the registry — the same path, whether it's a common
            species or one flagged as protected.
          </p>
        </Reveal>

        <div ref={trackRef} className="relative mt-16">
          {/* Horizontal track (desktop) */}
          <div className="pointer-events-none absolute left-7 right-[calc(20%-1.75rem-0.8rem)] top-7 hidden h-0.5 lg:block" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-line" />
            <motion.div className="absolute inset-0 origin-left rounded-full bg-primary" style={{ scaleX: fill }} />
            {!shouldReduceMotion && (
              <motion.span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lichen-400 shadow-[0_0_0_6px_rgba(158,240,26,0.25)]"
                style={{ left: headX }}
              />
            )}
          </div>

          {/* Vertical track (mobile) */}
          <div className="pointer-events-none absolute bottom-6 left-6 top-6 w-0.5 lg:hidden" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-line" />
            <motion.div className="absolute inset-0 origin-top rounded-full bg-primary" style={{ scaleY: fill }} />
          </div>

          <ol className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-4">
            {STAGES.map((stage, i) => {
              const isReached = i < reached
              const isFinal = i === LAST && isReached
              return (
                <li key={stage.id} className="relative z-10 flex gap-4 lg:flex-col lg:gap-3">
                  <motion.span
                    animate={{ scale: isReached && !shouldReduceMotion ? [1, 1.12, 1] : 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-semibold transition-colors duration-300 lg:h-14 lg:w-14 ${
                      isFinal
                        ? 'border-lichen-400 bg-primary text-on-primary shadow-[0_0_0_6px_rgba(158,240,26,0.25)]'
                        : isReached
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-line-strong bg-surface-muted text-fg-subtle'
                    }`}
                  >
                    {isFinal ? <Check size={20} strokeWidth={2.5} aria-hidden="true" /> : i + 1}
                  </motion.span>
                  <div className={`transition-opacity duration-300 ${isReached ? 'opacity-100' : 'opacity-60'}`}>
                    <h3 className="font-display text-[15px] font-bold text-fg">{stage.label}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{stage.detail}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
