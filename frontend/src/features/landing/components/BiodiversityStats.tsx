import { motion } from 'framer-motion'
import { Reveal } from '@/components/common/Reveal'

/**
 * Intentionally qualitative, not numeric. The public landing page shouldn't
 * expose the registry's real record counts — this communicates scale and
 * momentum through animation and language instead of literal figures pulled
 * from the database.
 */
const SIGNALS = [
  { id: 'species', label: 'Species catalogued', detail: 'and growing with every survey', fill: 0.78 },
  { id: 'sites', label: 'Research sites active', detail: 'from coastal wetland to high plateau', fill: 0.6 },
  { id: 'records', label: 'Records cross-checked', detail: 'against global taxonomy sources', fill: 0.92 },
  { id: 'protected', label: 'Protected taxa tracked', detail: 'flagged the moment they are logged', fill: 0.45 },
]

export function BiodiversityStats() {
  return (
    <section id="scale" className="border-b border-canopy-900/[0.06] bg-paper-0">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8">
        <Reveal className="max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-canopy-700">A registry in motion</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-canopy-950 sm:text-4xl">
            Built up one field visit at a time.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
          {SIGNALS.map((signal, i) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[15px] font-bold text-canopy-950">{signal.label}</span>
              </div>
              <p className="mt-1 text-[13px] text-ink-950/50">{signal.detail}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-mist-200">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-canopy-600 to-lichen-400"
                  initial={{ width: '0%' }}
                  whileInView={{ width: `${signal.fill * 100}%` }}
                  viewport={{ once: true, margin: '-15% 0px' }}
                  transition={{ duration: 1.1, delay: i * 0.1 + 0.15, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}