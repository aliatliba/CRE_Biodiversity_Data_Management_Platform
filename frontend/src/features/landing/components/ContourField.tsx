import { motion, useReducedMotion } from 'framer-motion'

const CONTOURS = [
  'M-100 620 C 150 560, 300 680, 520 600 S 900 500, 1300 580',
  'M-100 520 C 180 470, 340 570, 560 500 S 920 420, 1300 480',
  'M-100 420 C 200 390, 380 460, 600 400 S 940 340, 1300 390',
  'M-100 320 C 220 310, 400 360, 640 310 S 960 270, 1300 300',
  'M-100 220 C 240 230, 420 260, 660 220 S 980 200, 1300 215',
]

interface ContourFieldProps {
  tone?: 'light' | 'dark'
}

export function ContourField({ tone = 'light' }: ContourFieldProps) {
  const shouldReduceMotion = useReducedMotion()
  const gradientColor = tone === 'dark' ? 'var(--color-lichen-300)' : 'var(--color-canopy-800)'
  const maxOpacity = tone === 'dark' ? 0.3 : 0.14

  return (
    <svg
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`contour-fade-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradientColor} stopOpacity={maxOpacity} />
          <stop offset="100%" stopColor={gradientColor} stopOpacity={maxOpacity * 0.2} />
        </linearGradient>
      </defs>
      {CONTOURS.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke={`url(#contour-fade-${tone})`}
          strokeWidth={1.5}
          initial={{ pathLength: shouldReduceMotion ? 1 : 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </svg>
  )
}
