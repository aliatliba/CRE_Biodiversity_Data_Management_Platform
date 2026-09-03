import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { EditorialImage } from './EditorialImage'

/**
 * Purely atmospheric — no record data or counts. Images are loaded from
 * public Unsplash URLs and can be replaced without changing the layout.
 */
const SCENES = [
  {
    id: 'cedar',
    title: 'Cedar forest',
    region: 'Djurdjura ',
    src: '/assests/landing/djurdjura.jpeg',
  },

  {
    id: 'steppe',
    title: 'Desert oasis lake',
    region: 'Ouargla',
    src: '/assests/landing/ouargla.jpg',
  },

    {
    id: 'wetland',
    title: 'Coastal wetlands',
    region: 'El Kala',
    src: '/assests/landing/tonga.jpg',
  },

  {
    id: 'sahara',
    title: 'Saharan plateau',
    region: "Tassili n'Ajjer",
    src: '/assests/landing/tassili.webp',
  },
]

export function LandscapeGallery() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  return (
    <section id="landscapes" ref={ref} className="border-b border-canopy-900/[0.06] bg-canopy-950">
      <div className="mx-auto w-full max-w-6xl px-6 pt-20 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-lichen-300">Where the record is built</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-paper-0 sm:text-4xl">
          Four landscapes, one registry.
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-2 px-2 sm:grid-cols-2 sm:px-2 lg:grid-cols-4">
        {SCENES.map((scene, i) => (
          <SceneCard key={scene.id} scene={scene} index={i} scrollYProgress={scrollYProgress} />
        ))}
      </div>

      <div className="h-16" />
    </section>
  )
}

function SceneCard({
  scene,
  index,
  scrollYProgress,
}: {
  scene: (typeof SCENES)[number]
  index: number
  scrollYProgress: MotionValue<number>
}) {
  const direction = index % 2 === 0 ? 1 : -1
  const y = useTransform(scrollYProgress, [0, 1], [30 * direction, -30 * direction])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative h-[70vh] min-h-[380px] overflow-hidden rounded-2xl sm:h-[60vh] lg:h-[72vh]"
    >
      <motion.div
        style={{ y }}
        initial={{ opacity: 0, scale: 1.06 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 1.1, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 -top-8 -bottom-8"
      >
        <EditorialImage
          src={scene.src}
          seed={scene.id}
          alt={`${scene.title}, ${scene.region}`}
          className="rounded-2xl transition-transform duration-1000 ease-out group-hover:scale-105"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-canopy-950 via-canopy-950/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="font-display text-lg font-bold text-paper-0">{scene.title}</p>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-paper-0/60">{scene.region}</p>
      </div>
    </motion.div>
  )
}
