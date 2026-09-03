import { motion } from 'framer-motion'

const COLORS = [
  '#2d6a4f',
  '#40916c',
  '#52b788',
  '#74c69d',
  '#95d5b2',
  '#b7e4c7',
  '#d8f3dc',
  '#1b4332',
  '#081c15',
  '#344e41',
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
    <div className="flex flex-col gap-3">
      {data.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: delay + index * 0.05 }}
          className="flex items-center gap-3"
        >
          <span className="w-28 shrink-0 truncate text-xs font-medium text-ink-950/60" title={item.label}>
            {item.label}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-mist-100">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: delay + index * 0.05 + 0.1, ease: [0.22, 1, 0.36, 1] }}
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
