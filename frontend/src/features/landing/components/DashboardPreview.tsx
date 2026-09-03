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

  return (
    <section id="dashboard" className="border-b border-canopy-900/[0.06] bg-mist-100/40">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-canopy-700">Inside the registry</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-canopy-950 sm:text-4xl">
            A real system, kept behind the login.
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-[14px] text-ink-950/55">
            What's shown here is a representation of the interface, not live
            data — actual records stay private to signed-in researchers.
          </p>
        </Reveal>

        <div ref={ref} className="relative mt-14">
          <motion.div
            style={{ y: yBack }}
            className="absolute -inset-x-4 -top-6 hidden h-[420px] rounded-3xl border border-canopy-900/10 bg-paper-0/60 sm:block"
            aria-hidden="true"
          />

          <motion.div
            style={{ y: yFront }}
            className="relative overflow-hidden rounded-2xl border border-canopy-900/10 bg-paper-0 shadow-[0_40px_80px_-40px_rgba(5,39,7,0.35)]"
          >
            <div className="flex items-center gap-2 border-b border-canopy-900/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-canopy-900/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-canopy-900/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-canopy-900/15" />
              <span className="ml-3 font-mono text-[11px] text-ink-950/35">biodata.internal — signed in</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
              <div className="hidden flex-col gap-1 border-r border-canopy-900/10 bg-mist-100/50 p-4 sm:flex">
                {['Dashboard', 'Sites', 'Species', 'Protected list', 'Exports'].map((item, i) => (
                  <span
                    key={item}
                    className={`rounded-lg px-3 py-2 text-[13px] font-medium ${
                      i === 0 ? 'bg-canopy-800 text-paper-0' : 'text-ink-950/60'
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-canopy-950">Recent observations</span>
                  <span className="font-mono text-[11px] text-ink-950/35">private to your account</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-canopy-900/10">
                  {ROW_WIDTHS.map((row, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      className={`flex items-center gap-4 px-4 py-3.5 ${
                        i !== ROW_WIDTHS.length - 1 ? 'border-b border-canopy-900/10' : ''
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