import { Reveal } from '@/components/common/Reveal'

const SOURCES = ['GBIF', 'IUCN Red List', 'Plants of the World Online', 'iNaturalist', 'Wikidata']

export function IntegrationsStrip() {
  return (
    <section id="registry" className="border-b border-canopy-900/[0.06] bg-paper-0">
      <Reveal className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-14 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-950/40">
          Every new record is cross-referenced against
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {SOURCES.map((source) => (
            <span
              key={source}
              className="font-display text-[15px] font-semibold tracking-tight text-canopy-900/70 transition-colors hover:text-canopy-800"
            >
              {source}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
