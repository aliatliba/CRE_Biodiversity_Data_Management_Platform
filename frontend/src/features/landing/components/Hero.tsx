import { animate, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { ContourField } from './ContourField'

// three.js is only downloaded when the landing page renders.
const HeroTerrain = lazy(() => import('./HeroTerrain'))

const headlineWords = ['A', 'living', 'registry', 'for', "Algeria's", 'biodiversity.']

/** Public reference figures (the 2012 decrees and the databases queried), not registry data. */
const FACTS = [
  { value: 917, label: 'protected taxa', more: 'on the national list' },
  { value: 5, label: 'reference databases', more: 'behind every check' },
  { value: 2, label: 'decrees verified', more: 'name by name' },
]

const EASE = [0.22, 1, 0.36, 1] as const

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const shouldReduceMotion = useReducedMotion()
  const [value, setValue] = useState(shouldReduceMotion ? to : 0)

  useEffect(() => {
    if (!inView || shouldReduceMotion) return
    const controls = animate(0, to, {
      duration: 1.6,
      delay: 0.9,
      ease: EASE,
      onUpdate: (v) => setValue(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, to, shouldReduceMotion])

  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  )
}

export function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 60])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-canopy-950 lg:max-h-[960px]"
    >
      <Suspense
        fallback={
          <div className="absolute inset-0 opacity-30" aria-hidden="true">
            <ContourField tone="dark" />
          </div>
        }
      >
        <HeroTerrain />
      </Suspense>

      {/* Keep the headline readable over the relief and the leaves. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-canopy-950 via-canopy-950/65 to-canopy-950/0 lg:via-canopy-950/40"
        aria-hidden="true"
      />
      {/* On phones the text spans the full width: dim the whole scene a little. */}
      <div className="pointer-events-none absolute inset-0 bg-canopy-950/45 sm:hidden" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-canopy-950 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canopy-950 to-transparent"
        aria-hidden="true"
      />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-10 pt-32 sm:px-8"
      >
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-paper-0/15 bg-paper-0/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-lichen-300 backdrop-blur-md"
        >
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lichen-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lichen-400" />
          </span>
          Biodiversity registry · Algeria
        </motion.p>

        <h1 className="max-w-3xl font-display text-[2.5rem] font-extrabold leading-[1.04] tracking-tight text-paper-0 sm:text-[3.5rem] lg:text-[4.25rem]">
          {headlineWords.map((word, i) => (
            <motion.span
              key={`${word}-${i}`}
              initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.1 + 0.06 * i, ease: EASE }}
              className={`mr-[0.26em] inline-block ${
                i === headlineWords.length - 1
                  ? 'bg-[linear-gradient(100deg,#c3f56b_0%,#9ef01a_40%,#4cc596_100%)] bg-clip-text pb-[0.08em] text-transparent'
                  : ''
              }`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-6 max-w-lg text-[16px] leading-relaxed text-paper-0/75 sm:text-[17px]"
        >
          The internal platform field teams use to record sites, log species
          observations, and cross-check every entry against global taxonomy
          databases before it joins the record.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4"
        >
          <Link to={ROUTES.login}>
            <Button
              variant="primary"
              size="lg"
              className="group gap-2 !bg-lichen-400 !bg-none !text-canopy-950 shadow-[0_10px_30px_-8px_rgba(158,240,26,0.6)] hover:!bg-lichen-300"
            >
              Sign in to BioData
              <ArrowRight
                size={17}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
          </Link>
          <a
            href="#validation"
            className="text-sm font-semibold text-paper-0/85 underline decoration-paper-0/30 underline-offset-4 transition-colors hover:text-lichen-300 hover:decoration-lichen-300/60"
          >
            See how a record is checked
          </a>
        </motion.div>
      </motion.div>

      <motion.dl
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
        className="relative z-10 mx-auto mb-8 grid w-[calc(100%-3rem)] max-w-6xl grid-cols-3 divide-x divide-paper-0/10 rounded-2xl border border-paper-0/10 bg-canopy-950/55 backdrop-blur-xl sm:mb-10 sm:w-[calc(100%-4rem)]"
      >
        {FACTS.map((fact) => (
          <div key={fact.label} className="px-3 py-4 sm:px-6 sm:py-5">
            <dt className="sr-only">{`${fact.label} ${fact.more}`}</dt>
            <dd className="font-display text-2xl font-extrabold text-paper-0 sm:text-[2rem]">
              <CountUp to={fact.value} />
            </dd>
            <dd className="mt-1 text-[11.5px] leading-snug text-paper-0/60 sm:text-[13px]" aria-hidden="true">
              {fact.label}
              <span className="hidden sm:inline"> {fact.more}</span>
            </dd>
          </div>
        ))}
      </motion.dl>
    </section>
  )
}
