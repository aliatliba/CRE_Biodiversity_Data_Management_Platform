import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { lazy, Suspense, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { ContourField } from './ContourField'

// three.js is only downloaded when the landing page renders.
const HeroTerrain = lazy(() => import('./HeroTerrain'))

const headlineWords = ['A', 'living', 'registry', 'for', "Algeria's", 'biodiversity.']
export function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 40])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section
      ref={sectionRef}
      className="relative h-[78svh] min-h-[540px] max-h-[760px] overflow-hidden bg-canopy-950"
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

      {/* Keep the headline readable over the relief. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-canopy-950 via-canopy-950/70 to-canopy-950/0 lg:via-canopy-950/45"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-canopy-950 to-transparent"
        aria-hidden="true"
      />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-6 pb-14 pt-24 sm:px-8 lg:pb-20"
      >
        <div className="max-w-2xl">
          <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.04] tracking-tight text-paper-0 sm:text-[3.6rem] lg:text-[4.1rem]">
            {headlineWords.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                className={`mr-[0.28em] inline-block ${
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
            className="mt-6 max-w-md text-[16px] leading-relaxed text-paper-0/75"
          >
            BioData is the internal platform field teams use to record sites, log
            species observations, and cross-check every entry against global
            taxonomy databases before it's added to the record.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.78 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link to={ROUTES.login}>
              <Button variant="primary" size="lg" className="!bg-lichen-400 !bg-none !text-canopy-950 shadow-[0_10px_30px_-8px_rgba(158,240,26,0.6)] hover:!bg-lichen-300">
                Sign in to BioData
              </Button>
            </Link>
            <a
              href="#validation"
              className="text-sm font-semibold text-paper-0 underline decoration-paper-0/40 underline-offset-4 transition-colors hover:text-lichen-300"
            >
              See how it works
            </a>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.3 }}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 text-paper-0/70 sm:block"
        aria-hidden="true"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="h-8 w-5 rounded-full border border-paper-0/40 p-1"
        >
          <span className="block h-1.5 w-1.5 rounded-full bg-paper-0/70" />
        </motion.div>
      </motion.div>
    </section>
  )
}