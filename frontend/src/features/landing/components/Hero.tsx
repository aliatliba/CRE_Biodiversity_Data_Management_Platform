import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { ContourField } from './ContourField'

const headlineWords = ['A', 'living', 'registry', 'for', "Algeria's", 'biodiversity.']
const LEAVES = [
  { left: '68%', top: '20%', size: 42, rotate: -28, delay: 0, duration: 5.2 },
  { left: '78%', top: '32%', size: 30, rotate: 22, delay: 0.8, duration: 4.6 },
  { left: '88%', top: '18%', size: 48, rotate: 42, delay: 1.4, duration: 6.1 },
  { left: '74%', top: '57%', size: 38, rotate: -48, delay: 0.4, duration: 5.7 },
  { left: '92%', top: '66%', size: 28, rotate: 18, delay: 1.1, duration: 4.9 },
  { left: '62%', top: '72%', size: 34, rotate: 55, delay: 1.8, duration: 6.4 },
  { left: '84%', top: '42%', size: 36, rotate: -18, delay: 0.6, duration: 5.5 },
  { left: '96%', top: '48%', size: 32, rotate: 36, delay: 1.6, duration: 6.2 },
  { left: '80%', top: '76%', size: 44, rotate: -52, delay: 2.2, duration: 5.9 },
]

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
      <div className="absolute inset-0 opacity-30">
        <ContourField tone="dark" />
      </div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-6 pb-14 pt-24 sm:px-8 lg:pb-20"
      >
        <div className="max-w-2xl">
          <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.04] tracking-tight text-paper-0 sm:text-[3.6rem] lg:text-[4.1rem]">
            {headlineWords.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                className="mr-[0.28em] inline-block"
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
              <Button variant="primary" size="lg" className="bg-lichen-400 !text-canopy-950 hover:bg-lichen-300">
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

      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
        {LEAVES.map((leaf) => (
          <motion.svg
            key={`${leaf.left}-${leaf.top}`}
            viewBox="0 0 64 88"
            className="absolute text-lichen-300/55 drop-shadow-[0_8px_12px_rgba(0,0,0,0.12)]"
            style={{ left: leaf.left, top: leaf.top, width: leaf.size, height: leaf.size * 1.4, transformOrigin: '50% 100%' }}
            animate={{ rotate: [leaf.rotate - 3, leaf.rotate + 3, leaf.rotate - 3], y: [0, -3, 0] }}
            transition={{ duration: leaf.duration, delay: leaf.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            <defs>
              <linearGradient id={`leaf-fill-${leaf.left}-${leaf.top}`} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-canopy-600)" stopOpacity="0.85" />
                <stop offset="55%" stopColor="var(--color-lichen-300)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="var(--color-paper-0)" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <path
              d="M31 84C29 69 19 59 12 47C5 35 6 18 12 5C28 9 42 18 49 31C56 46 48 66 31 84Z"
              fill={`url(#leaf-fill-${leaf.left}-${leaf.top})`}
              stroke="var(--color-lichen-300)"
              strokeOpacity="0.45"
              strokeWidth="0.8"
            />
            <path d="M31 83C30 61 23 35 12 7" fill="none" stroke="var(--color-canopy-950)" strokeOpacity="0.58" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M27 68L15 54M25 58L11 44M22 48L9 35M19 38L9 26M17 29L11 18M34 72L46 57M32 61L49 47M29 51L49 38M25 40L43 28M21 29L35 20" fill="none" stroke="var(--color-canopy-950)" strokeOpacity="0.4" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M31 84C32 87 33 88 35 88" fill="none" stroke="var(--color-canopy-800)" strokeOpacity="0.9" strokeWidth="1.4" strokeLinecap="round" />
          </motion.svg>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.3 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-paper-0/50"
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