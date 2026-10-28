import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Reveal } from '@/components/common/Reveal'

/**
 * A glimpse of the interface, not its content. Rows are abstracted bars
 * rather than real (or real-looking) species names, sites, or statuses —
 * the point is to communicate that a serious system exists behind the
 * login, without exposing anything that lives in the database.
 */
const ROW_WIDTHS = [
  { name: 62, meta: 34 },
  { name: 48, meta: 44 },
  { name: 70, meta: 28 },
  { name: 40, meta: 38 },
]

export function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yBack = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [30, -30])
  const yFront = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [-16, 16])
  // Tilts up from the table into view, like a screen being raised.
  const rotateX = useTransform(scrollYProgress, [0, 0.42], shouldReduceMotion ? [0, 0] : [24, 0])
  const scale = useTransform(scrollYProgress, [0, 0.42], shouldReduceMotion ? [1, 1] : [0.92, 1])

  return (
    <section id="dashboard" className="border-b border-line bg-surface-muted">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-canopy-700">Inside the registry</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            A real system, kept behind the login.
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-[14px] text-fg-subtle">
            What's shown here is a representation of the interface, not live
            data — actual records stay private to signed-in researchers.
          </p>
        </Reveal>

        <div ref={ref} className="relative mt-14" style={{ perspective: 1400 }}>
          <motion.div
            style={{ y: yBack }}
            className="absolute -inset-x-4 -top-6 hidden h-[420px] rounded-3xl border border-line bg-paper-0/60 sm:block"
            aria-hidden="true"
          />

          <motion.div
            style={{ y: yFront, rotateX, scale, transformOrigin: '50% 100%' }}
            className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-[0_40px_80px_-40px_rgba(5,39,7,0.35)]"
          >
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-canopy-900/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-canopy-900/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-canopy-900/15" />
              <span className="ml-3 font-mono text-[11px] text-fg-subtle">biodata.internal — signed in</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
              <div className="hidden flex-col gap-1 border-r border-line bg-surface p-4 sm:flex">
                {['Dashboard', 'Sites', 'Species', 'Protected list', 'Exports'].map((item, i) => (
                  <span
                    key={item}
                    className={`rounded-lg px-3 py-2 text-[13px] font-medium ${
                      i === 0 ? 'bg-primary-soft text-primary shadow-[inset_3px_0_0_var(--color-primary)]' : 'text-fg-muted'
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-fg">Recent observations</span>
                  <span className="font-mono text-[11px] text-fg-subtle">private to your account</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-line">
                  {ROW_WIDTHS.map((row, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      className={`flex items-center gap-4 px-4 py-3.5 ${
                        i !== ROW_WIDTHS.length - 1 ? 'border-b border-line' : ''
                      }`}
                    >
                      <span className="h-2.5 rounded-full bg-canopy-900/12" style={{ width: `${row.name}%` }} />
                      <span className="ml-auto hidden h-2.5 rounded-full bg-canopy-900/8 sm:block" style={{ width: `${row.meta}%` }} />
                      <span className="h-5 w-16 shrink-0 rounded-full bg-canopy-500/15" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}