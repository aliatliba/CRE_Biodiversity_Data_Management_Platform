import { motion } from 'framer-motion'

const SLICE_COLORS = ['#2d6a4f', '#f59e0b', '#ef4444', '#40916c', '#6366f1', '#ec4899', '#14b8a6']

interface PieItem {
  label: string
  value: number
}

interface AnimatedPieChartProps {
  data: PieItem[]
  size?: number
  delay?: number
}

export function AnimatedPieChart({ data, size = 160, delay = 0 }: AnimatedPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return <p className="text-sm text-ink-950/50">No data available.</p>
  }

  const radius = size / 2 - 8
  const center = size / 2
  let cumulative = 0

  const slices = data.map((item, index) => {
    const fraction = item.value / total
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2
    cumulative += fraction
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2

    const x1 = center + radius * Math.cos(startAngle)
    const y1 = center + radius * Math.sin(startAngle)
    const x2 = center + radius * Math.cos(endAngle)
    const y2 = center + radius * Math.sin(endAngle)
    const largeArc = fraction > 0.5 ? 1 : 0

    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return {
      ...item,
      path,
      color: SLICE_COLORS[index % SLICE_COLORS.length],
      percent: Math.round(fraction * 100),
    }
  })

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {slices.map((slice, index) => (
          <motion.path
            key={slice.label}
            d={slice.path}
            fill={slice.color}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: delay + index * 0.08 }}
          />
        ))}
        <circle cx={center} cy={center} r={radius * 0.55} fill="white" />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-canopy-950 text-sm font-bold"
          style={{ fontSize: 14 }}
        >
          {total}
        </text>
      </motion.svg>

      <div className="flex flex-col gap-2">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-ink-950/70">{slice.label}</span>
            <span className="font-semibold tabular-nums text-canopy-800">
              {slice.value} ({slice.percent}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
