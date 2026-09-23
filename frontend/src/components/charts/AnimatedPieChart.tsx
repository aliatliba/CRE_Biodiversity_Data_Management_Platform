import { motion } from 'framer-motion'

const COLORS = 
  ['#117036', '#f59e0b',  '#6366f1','#ef4444','#40916c',  '#ec4899', '#14b8a6']

  export const IUCN_COLORS: Record<string, string> = {
  CR: '#dc2626',
  EN: '#ea580c',
  VU: '#f59e0b',
  NT: '#eab308',
  LC: '#16a34a',
  DD: '#6b7280',
  NE: '#9ca3af',
}

interface PieSlice {
  label: string
  value: number
}

interface AnimatedPieChartProps {
  data: PieSlice[]
  size?: number
  delay?: number
  showValues?: boolean
  colorMap?: Record<string, string>
}

export function AnimatedPieChart({
  data,
  size = 160,
  delay = 0,
  showValues = false,
  colorMap,
}: AnimatedPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (data.length === 0 || total === 0) {
    return <p className="text-sm text-ink-950/50">No data available.</p>
  }

  let cumulative = 0

  const slices = data.map((item, index) => {
    const start = cumulative
    const percentage = item.value / total
    cumulative += percentage

    return {
      ...item,
      color:
        colorMap?.[item.label] ??
        COLORS[index % COLORS.length],
      start,
      percentage,
    }
  })

  const radius = 58
  const center = 80
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          className="-rotate-90 overflow-visible"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="24"
            className="text-mist-100"
          />

          {slices.map((slice, index) => {
            const dash = slice.percentage * circumference
            const gap = slices.length > 1 ? 2 : 0

            return (
              <motion.circle
                key={slice.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="24"
                strokeLinecap="butt"
                strokeDasharray={`${Math.max(0, dash - gap)} ${circumference}`}
                strokeDashoffset={-slice.start * circumference}
                initial={{
                  opacity: 0,
                  strokeDasharray: `0 ${circumference}`,
                }}
                animate={{
                  opacity: 1,
                  strokeDasharray: `${Math.max(0, dash - gap)} ${circumference}`,
                }}
                transition={{
                  duration: 0.8,
                  delay: delay + index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            )
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-canopy-900">
            {total}
          </span>

          <span className="text-[10px] font-medium uppercase tracking-wider text-ink-950/45">
            Total
          </span>
        </div>
      </div>

      <div className="min-w-0 max-w-full flex-1 space-y-2">
        {slices.map((slice) => (
          <div
            key={slice.label}
            className="flex min-w-0 items-center gap-2 text-xs"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />

            <span
              className="min-w-0 flex-1 truncate text-ink-950/70"
              title={slice.label}
            >
              {slice.label}
            </span>

            <span className="shrink-0 font-semibold tabular-nums text-ink-950/70">
              {showValues
                ? `${slice.value} (${Math.round(slice.percentage * 100)}%)`
                : `${Math.round(slice.percentage * 100)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}