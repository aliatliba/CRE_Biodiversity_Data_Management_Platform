import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'

interface ChartCardProps {
  title: string
  subtitle?: string
  delay?: number
  children: ReactNode
}

/** Animated card with a title (and optional subtitle) around a chart. */
export function ChartCard({ title, subtitle, delay = 0, children }: ChartCardProps) {
  return (
    <motion.div
      className="h-full min-w-0"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
    >
      <Card className="h-full min-w-0 overflow-hidden">
        <h2 className="font-display text-sm font-bold text-canopy-950">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-ink-950/50">{subtitle}</p>}
        <div className="mt-5 min-w-0 overflow-hidden">{children}</div>
      </Card>
    </motion.div>
  )
}
