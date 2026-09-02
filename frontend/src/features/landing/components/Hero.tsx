import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { PointerEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { ContourField } from './ContourField'
import { SpecimenTag } from './SpecimenTag'

const headlineWords = ['Every', 'survey,', 'site,', 'and', 'species', '—', 'one', 'living', 'registry.']

export function Hero() {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const pointerX = useSpring(rawX, { stiffness: 60, damping: 18 })
  const pointerY = useSpring(rawY, { stiffness: 60, damping: 18 })

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const relX = (event.clientX - bounds.left) / bounds.width - 0.5
    const relY = (event.clientY - bounds.top) / bounds.height - 0.5
    rawX.set(relX * 24)
    rawY.set(relY * 24)
  }

  return (
    <section
      onPointerMove={handlePointerMove}
      className="relative overflow-hidden border-b border-canopy-900/[0.06] bg-gradient-to-b from-mist-100/70 via-paper-0 to-paper-0"
    >
      <ContourField />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-14 px-6 pb-28 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-36 lg:pt-16">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-canopy-800/15 bg-paper-0/70 px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-canopy-800"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-lichen-400" />
            Field biodiversity registry
          </motion.p>

          <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-canopy-950 sm:text-[3.4rem] lg:text-[3.75rem]">
            {headlineWords.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                className="mr-[0.28em] inline-block"
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-6 max-w-md text-[16px] leading-relaxed text-ink-950/65"
          >
            BioData is the internal platform field teams use to record sites, log
            species observations, and cross-check every entry against global
            taxonomy databases before it's added to the record.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link to={ROUTES.login}>
              <Button variant="primary" size="lg">
                Sign in to BioData
              </Button>
            </Link>
            <a
              href="#registry"
              className="text-sm font-semibold text-canopy-800 underline decoration-canopy-800/30 underline-offset-4 transition-colors hover:text-canopy-900"
            >
              See how it works
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-8 font-mono text-xs text-ink-950/40"
          >
            Access is provisioned by your administrator — no public sign-up.
          </motion.p>
        </div>

        <div className="relative hidden min-h-[380px] lg:block" aria-hidden="true">
          <SpecimenTag
            code="SITE-014 · N36.75 E3.06"
            label="Chréa foothills, mixed oak"
            status="verified"
            rotate={-4}
            delay={0.9}
            pointerX={pointerX}
            pointerY={pointerY}
            depth={0.6}
            className="absolute left-2 top-8"
          />
          <SpecimenTag
            code="OBS-2291"
            label="Quercus afares — pending review"
            status="pending"
            rotate={3}
            delay={1.05}
            pointerX={pointerX}
            pointerY={pointerY}
            depth={1}
            className="absolute right-0 top-40"
          />
          <SpecimenTag
            code="OBS-2265"
            label="Matched to IUCN Red List"
            status="verified"
            rotate={-2}
            delay={1.2}
            pointerX={pointerX}
            pointerY={pointerY}
            depth={0.8}
            className="absolute left-16 top-[19rem]"
          />
        </div>
      </div>
    </section>
  )
}
