import { Reveal } from '@/components/common/Reveal'

export function ValidationFeature() {
  return (
    <section id="validation" className="bg-paper-0">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-6 py-24 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-canopy-700">Before it hits the record</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-canopy-950 sm:text-4xl">
            No duplicate entries. No unverified names.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-950/65">
            Type a scientific name and BioData checks it against the existing
            catalogue first. If it's new, taxonomy, conservation status, and
            common names are pulled in automatically — every field stays
            traceable to the source that supplied it.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="rounded-2xl border border-canopy-900/10 bg-mist-100/60 p-6 font-mono text-[13px]">
            <div className="flex items-center justify-between border-b border-canopy-900/10 pb-3">
              <span className="text-ink-950/50">scientific_name</span>
              <span className="text-canopy-800">Quercus afares</span>
            </div>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-ink-950/50">GBIF</span>
                <span className="rounded-full bg-canopy-500/15 px-2 py-0.5 text-canopy-700">matched</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-950/50">IUCN Red List</span>
                <span className="rounded-full bg-canopy-500/15 px-2 py-0.5 text-canopy-700">EN — Endangered</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-950/50">Duplicate check</span>
                <span className="rounded-full bg-lichen-400/25 px-2 py-0.5 text-canopy-800">
                  none in catalogue
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
