import { Reveal } from '@/components/common/Reveal'

export function ValidationFeature() {
  return (
    <section id="validation" className="bg-paper-0">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-6 py-24 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-canopy-700">Before it hits the record</p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink-950 sm:text-[2.6rem]">
            No duplicate entries. No unverified names.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-950/65">
            Type a scientific name and Canopy checks it against the existing
            catalogue first. If it's new, taxonomy, conservation status, and
            common names are pulled in automatically — every field stays
            traceable to the source that supplied it.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="rounded-2xl border border-mist-200/80 bg-shell p-6 font-mono text-[13px] text-shell-text shadow-[0_24px_50px_-28px_rgba(16,26,20,0.7)]">
            <div className="flex items-center justify-between border-b border-shell-text/10 pb-3">
              <span className="text-shell-text/40">scientific_name</span>
              <span className="italic text-lichen-300">Quercus afares</span>
            </div>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-shell-text/40">GBIF</span>
                <span className="rounded-md bg-canopy-500/20 px-2 py-0.5 text-canopy-400">matched</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-shell-text/40">IUCN Red List</span>
                <span className="rounded-md bg-canopy-500/20 px-2 py-0.5 text-canopy-400">EN — Endangered</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-shell-text/40">Duplicate check</span>
                <span className="rounded-md bg-lichen-400/20 px-2 py-0.5 text-lichen-300">
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
