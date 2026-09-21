import { motion } from 'framer-motion'

const COLORS = [
  '#2D6A4F', // green
  '#9EF01A', // lime
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EF4444', // red
  '#F97316', // orange
  '#14B8A6', // teal
  '#EAB308', // yellow
  '#06B6D4', // cyan
]

interface BarItem {
  label: string
  value: number
}

interface AnimatedBarChartProps {
  data: BarItem[]
  delay?: number
}

export function AnimatedBarChart({ data, delay = 0 }: AnimatedBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))

  if (data.length === 0) {
    return <p className="text-sm text-ink-950/50">No data available.</p>
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {data.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.4,
            delay: delay + index * 0.05,
          }}
          className="flex min-w-0 items-center gap-2 sm:gap-3"
        >
          <span
            className="w-20 shrink-0 truncate text-xs font-medium text-ink-950/60 sm:w-28"
            title={item.label}
          >
            {item.label}
          </span>

          <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-mist-100">
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor: COLORS[index % COLORS.length],
              }}
              initial={{ width: 0 }}
              animate={{
                width: `${(item.value / max) * 100}%`,
              }}
              transition={{
                duration: 0.8,
                delay: delay + index * 0.05 + 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </div>

          <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-canopy-800">
            {item.value}
          </span>
        </motion.div>
      ))}
    </div>
  )
}