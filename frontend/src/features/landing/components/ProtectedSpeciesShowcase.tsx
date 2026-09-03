import { motion } from 'framer-motion'
import { Reveal } from '@/components/common/Reveal'
import { EditorialImage } from './EditorialImage'

/**
 * Editorial imagery only — common knowledge about representative species,
 * not a view into the registry. No status flags, site names, or record
 * metadata are shown here; that detail stays inside the platform.
 *
 *   Images are served from frontend/public/assests/landing.
 */
const SPECIES = [
  { id: 'quercus-afares', name: 'Quercus afares', common: 'Afares oak', src: '/assests/landing/quercus.jpeg' },
  { id: 'gazella-cuvieri', name: 'Gazella cuvieri', common: "Cuvier's gazelle", src: '/assests/landing/Gazelle-cuvier-copie-600x600.jpg' },
  { id: 'cedrus-atlantica', name: 'Cedrus atlantica', common: 'Atlas cedar', src: '/assests/landing/Cedrus-atlantica-Glauca-20050005-A-scaled.jpg' },
  { id: 'testudo-graeca', name: 'Testudo graeca', common: 'Greek tortoise', src: '/assests/landing/tortue.webp' },
]

export function ProtectedSpeciesShowcase() {
  return (
    <section id="species" className="bg-canopy-950 text-paper-0">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-8">
        <Reveal className="max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-lichen-300">Worth protecting</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Some of what the registry watches for.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-paper-0/65">
            A handful of species known from Algeria's protected landscapes —
            shown here for illustration, not pulled from live records.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SPECIES.map((sp, i) => (
            <motion.article
              key={sp.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative h-72 overflow-hidden rounded-2xl"
            >
              <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105">
                <EditorialImage src={sp.src} seed={sp.id} alt={`${sp.common} (${sp.name})`} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-canopy-950 via-canopy-950/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display text-[15px] font-bold italic leading-tight">{sp.name}</p>
                <p className="mt-0.5 text-[12.5px] text-paper-0/60">{sp.common}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}