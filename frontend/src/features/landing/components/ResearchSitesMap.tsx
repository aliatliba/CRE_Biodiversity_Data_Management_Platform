import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Reveal } from '@/components/common/Reveal'

/**
 * Ambient only — markers indicate *that* work happens across these regions,
 * not real coordinates, counts, or record content. No site-level data from
 * the registry is exposed on the public landing page.
 */
const REGIONS = [
  { id: 'oran', name: 'Oran', x: 101.4, y: 24.6 },
  { id: 'algiers', name: 'Algiers', x: 147.8, y: 6.1 },
  { id: 'bejaia', name: 'Béjaïa', x: 171.4, y: 6.1 },
  { id: 'annaba', name: 'Annaba', x: 207.1, y: 3.4 },
  { id: 'constantine', name: 'Constantine', x: 192.5, y: 12.8 },
  { id: 'bechar', name: 'Bechar', x: 81.4, y: 96.7 },
  { id: 'tlemcen', name: 'Tlemcen', x: 92.7, y: 39.1 },
  { id: 'setif', name: 'Setif', x: 177.4, y: 16 },
  { id: 'biskra', name: 'Biskra', x: 181.5, y: 39.6 },
  { id: 'ouargla', name: 'Ouargla', x: 176.4, y: 90.9 },
  { id: 'ghardaia', name: 'Ghardaia', x: 155.5, y: 81.3 },
  { id: 'djelfa', name: 'Djelfa', x: 150.4, y: 42.8 },
  { id: 'tindouf', name: 'Tindouf', x: 6.7, y: 166.4 },
  { id: 'adrar', name: 'Adrar', x: 105.7, y: 162.9 },
  { id: 'laghouat', name: 'Laghouat', x: 145.6, y: 58.2 },
  { id: 'tamanrasset', name: 'Tamanrasset', x: 178.8, y: 252.5 },
  { id: 'blida', name: 'Blida', x: 144.9, y: 11 },
  { id: 'tizi-ouzou', name: 'Tizi Ouzou', x: 160.3, y: 7 },
  { id: 'el-tarf', name: 'El Tarf', x: 213.9, y: 5.7 },
  { id: 'batna', name: 'Batna', x: 187, y: 27.3 },
  { id: 'illizi', name: 'Illizi', x: 215.8, y: 187.1 },
]

// Simplified from the Natural Earth Algeria country boundary (public-domain data).
const OUTLINE =
  'M48.6 213.7 L0 173.2 L0 148.4 L13.4 136.1 L39.6 133.7 L54.3 116.3 L63.4 112.7 L63.2 96.2 L73.7 93.6 L73 88.6 L94.1 88.4 L96.3 81.2 L88.2 68.1 L87 41.6 L81.3 35.4 L87.1 34.7 L103.3 21.3 L108.3 23 L113.6 15.7 L126.3 9.7 L158.1 3.1 L169.6 3.5 L176.1 8 L190.1 0 L196.8 3.6 L200.2 0.1 L208.9 4.3 L217.6 2.7 L212.2 10 L215.5 32.7 L213 43.2 L203.5 56.5 L206.6 68.2 L223.2 88.7 L229.2 121.2 L226.2 123.2 L233 140.7 L233.9 184.4 L227.4 193 L238.3 220.7 L254.6 226 L260 239.8 L203.5 286.5 L182.3 311.6 L151.3 320 L148.4 317.2 L149.6 305.1 L131.7 296.5 L123.8 288.9 L123.7 282.4 L48.6 213.7 Z'

export function ResearchSitesMap() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const active = REGIONS.find((s) => s.id === activeId) ?? null

  return (
    <section id="map" className="border-b border-canopy-900/[0.06] bg-mist-100/40">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-28 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-canopy-700">Where the data comes from</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-canopy-950 sm:text-4xl">
            Research sites, spread across the country.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-950/65">
            Each marker represents a region where field teams are actively
            registering sites and logging observations. Site-level detail
            lives inside the platform, not on this page.
          </p>
          <p className="mt-6 font-mono text-sm font-semibold tracking-wide text-canopy-700">
            {active ? active.name : 'Hover a marker to highlight a region'}
          </p>
        </Reveal>

        <Reveal delay={0.1} className="relative mx-auto w-full max-w-[36rem]">
          <svg
            viewBox="-15 -15 290 350"
            preserveAspectRatio="none"
            className="h-[400px] w-full sm:h-[450px]"
            role="img"
            aria-label="Map of Algeria showing regions where BioData field teams operate"
          >
            <path
              d={OUTLINE}
              fill="var(--color-mist-200)"
              stroke="var(--color-canopy-800)"
              strokeOpacity={0.35}
              strokeWidth={1.5}
            />
            <path d="M8 148 L120 125 L229 121 M84 273 L180 230 L254 226 M124 289 L203 286 L238 221" stroke="var(--color-canopy-800)" strokeOpacity={0.1} strokeWidth={1} fill="none" />

            {REGIONS.map((site, i) => {
              const isActive = activeId === site.id
              return (
                <g key={site.id}>
                  {!shouldReduceMotion && (
                    <circle cx={site.x} cy={site.y} r={6} fill="none" stroke="var(--color-canopy-600)" strokeWidth={1.5} className="origin-center animate-pulse-ring" style={{ transformBox: 'fill-box' }} />
                  )}
                  <motion.circle
                    cx={site.x}
                    cy={site.y}
                    r={isActive ? 7 : 5}
                    fill={isActive ? 'var(--color-lichen-400)' : 'var(--color-canopy-600)'}
                    stroke="var(--color-paper-0)"
                    strokeWidth={1.5}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: 'backOut' }}
                    style={{ cursor: 'pointer', transformBox: 'fill-box', transformOrigin: 'center' }}
                    onMouseEnter={() => setActiveId(site.id)}
                    onMouseLeave={() => setActiveId(null)}
                    onFocus={() => setActiveId(site.id)}
                    onBlur={() => setActiveId(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={site.name}
                  />
                </g>
              )
            })}
          </svg>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-950/30">
            Algeria · selected research regions
          </p>
        </Reveal>
      </div>
    </section>
  )
}