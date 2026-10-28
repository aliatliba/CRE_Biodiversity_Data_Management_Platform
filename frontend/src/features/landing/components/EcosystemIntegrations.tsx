import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { Reveal } from '@/components/common/Reveal'

interface Source {
  id: string
  label: string
  detail: string
  angle: number // degrees, 0 = top, clockwise
}

const SOURCES: Source[] = [
  { id: 'gbif', label: 'GBIF', detail: 'Global occurrence data', angle: -60 },
  { id: 'iucn', label: 'IUCN Red List', detail: 'Conservation status', angle: -20 },
  { id: 'inat', label: 'iNaturalist', detail: 'Community observations', angle: 20 },
  { id: 'powo', label: 'Plants of the World', detail: 'Accepted plant names', angle: 60 },
  { id: 'wikidata', label: 'Wikidata', detail: 'Cross-referenced identifiers', angle: 100 },
]

const RADIUS = 150
const CENTER = { x: 250, y: 190 }

function pointOnCircle(angleDeg: number, radius: number) {
  const angle = (angleDeg - 90) * (Math.PI / 180)
  return { x: CENTER.x + radius * Math.cos(angle), y: CENTER.y + radius * Math.sin(angle) }
}

export function EcosystemIntegrations() {
  const diagramRef = useRef<SVGSVGElement>(null)
  const isInView = useInView(diagramRef, { margin: '-15% 0px' })
  const shouldReduceMotion = useReducedMotion()
  const showFlow = isInView && !shouldReduceMotion

  return (
    <section id="ecosystem" className="border-b border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-24 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-canopy-700">A connected record</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            Every entry is checked against the wider world.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fg-muted">
            BioData doesn't work in isolation. Names, taxonomy, and
            conservation status are cross-referenced against the same public
            registries researchers already trust.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <svg ref={diagramRef} viewBox="0 0 500 380" className="mx-auto h-auto w-full max-w-lg overflow-visible" role="img" aria-label="BioData record connected to GBIF, IUCN Red List, iNaturalist, Plants of the World Online, and Wikidata">
            {SOURCES.map((source, i) => {
              const p = pointOnCircle(source.angle, RADIUS)
              return (
                <motion.line
                  key={`line-${source.id}`}
                  x1={CENTER.x}
                  y1={CENTER.y}
                  x2={p.x}
                  y2={p.y}
                  stroke="var(--color-canopy-600)"
                  strokeWidth={1.2}
                  strokeOpacity={0.4}
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, margin: '-20% 0px' }}
                  transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
                />
              )
            })}

            {SOURCES.map((source, i) => {
              const p = pointOnCircle(source.angle, RADIUS)
              const anchor = p.x < CENTER.x - 10 ? 'end' : p.x > CENTER.x + 10 ? 'start' : 'middle'
              return (
                <motion.g
                  key={source.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.15 * i + 0.5, ease: 'backOut' }}
                >
                  <circle cx={p.x} cy={p.y} r={5} fill="var(--color-canopy-500)" />
                  <text
                    x={p.x + (anchor === 'end' ? -10 : anchor === 'start' ? 10 : 0)}
                    y={p.y + (source.angle < 0 ? -10 : 20)}
                    textAnchor={anchor}
                    className="font-display text-[12px] font-bold"
                    fill="var(--color-canopy-950)"
                  >
                    {source.label}
                  </text>
                  <text
                    x={p.x + (anchor === 'end' ? -10 : anchor === 'start' ? 10 : 0)}
                    y={p.y + (source.angle < 0 ? 4 : 34)}
                    textAnchor={anchor}
                    className="font-mono text-[8px]"
                    fill="var(--color-fg-subtle)"
                  >
                    {source.detail}
                  </text>
                </motion.g>
              )
            })}

            {/* Data flowing in from each registry to the record. */}
            {showFlow &&
              SOURCES.map((source, i) => {
                const p = pointOnCircle(source.angle, RADIUS)
                return (
                  <motion.circle
                    key={`pulse-${source.id}`}
                    r={3}
                    fill="var(--color-lichen-400)"
                    initial={{ cx: p.x, cy: p.y, opacity: 0 }}
                    animate={{ cx: [p.x, CENTER.x], cy: [p.y, CENTER.y], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.8, delay: 1.2 + i * 0.55, repeat: Infinity, repeatDelay: 1.6, ease: 'easeIn' }}
                  />
                )
              })}

            {showFlow && (
              <motion.circle
                cx={CENTER.x}
                cy={CENTER.y}
                fill="none"
                stroke="var(--color-canopy-500)"
                strokeWidth={1.5}
                initial={{ r: 30, opacity: 0 }}
                animate={{ r: [30, 52], opacity: [0.55, 0] }}
                transition={{ duration: 2.2, delay: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}

            <motion.g
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.9, ease: 'backOut' }}
            >
              <circle cx={CENTER.x} cy={CENTER.y} r={30} fill="var(--color-canopy-950)" />
              <text x={CENTER.x} y={CENTER.y - 3} textAnchor="middle" className="font-display text-[11px] font-bold" fill="var(--color-paper-0)">
                BioData
              </text>
              <text x={CENTER.x} y={CENTER.y + 11} textAnchor="middle" className="font-mono text-[8px]" fill="var(--color-lichen-300)">
                record
              </text>
            </motion.g>
          </svg>
        </Reveal>
      </div>
    </section>
  )
}