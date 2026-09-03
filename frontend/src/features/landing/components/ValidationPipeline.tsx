import { motion } from 'framer-motion'
import { Reveal } from '@/components/common/Reveal'

const STAGES = [
  { id: 'observation', label: 'Field observation', detail: 'Researcher logs a sighting against a site' },
  { id: 'identification', label: 'Species identification', detail: 'Scientific name entered or matched' },
  { id: 'external', label: 'External validation', detail: 'Checked against GBIF & existing catalogue' },
  { id: 'protected', label: 'Protected-status check', detail: 'Cross-referenced with IUCN Red List' },
  { id: 'validated', label: 'Validated record', detail: 'Added to the registry, source-traced' },
]

export function ValidationPipeline() {
  return (
    <section id="validation" className="bg-paper-0">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8">
        <Reveal className="max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-canopy-700">Before it hits the record</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-canopy-950 sm:text-4xl">
            No duplicate entries. No unverified names.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-950/65">
            Every observation moves through the same five checkpoints before
            it's added to the registry — the same path, whether it's a common
            species or one flagged as protected.
          </p>
        </Reveal>

        <div className="relative mt-16">
          <svg className="pointer-events-none absolute left-0 top-6 z-0 hidden h-1 w-full lg:block" viewBox="0 0 1000 4" preserveAspectRatio="none" aria-hidden="true">
            <motion.line
              x1="20" y1="2" x2="980" y2="2"
              stroke="var(--color-canopy-500)"
              strokeWidth="2"
              strokeDasharray="6 8"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: '-20% 0px' }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          <ol className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-4">
            {STAGES.map((stage, i) => (
              <motion.li
                key={stage.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-15% 0px' }}
                transition={{ duration: 0.5, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 flex gap-4 lg:flex-col lg:gap-3"
              >
                <motion.span
                  animate={stage.id === 'validated' ? { scale: [1, 1.12, 1] } : undefined}
                  transition={stage.id === 'validated' ? { duration: 1.6, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' } : undefined}
                  className={`relative z-20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-semibold lg:h-14 lg:w-14 ${
                    stage.id === 'validated'
                      ? 'border-lichen-400 bg-mist-100 text-canopy-900'
                      : 'border-canopy-800/20 bg-mist-100 text-canopy-800'
                  }`}
                >
                  {i + 1}
                </motion.span>
                <div>
                  <h3 className="font-display text-[15px] font-bold text-canopy-950">{stage.label}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-950/60">{stage.detail}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}