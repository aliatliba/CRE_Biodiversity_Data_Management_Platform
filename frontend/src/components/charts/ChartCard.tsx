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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
    >
      <Card className="h-full min-w-0 overflow-hidden">
        <h2 className="font-display text-[15px] font-bold tracking-tight text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-fg-subtle">{subtitle}</p>}
        <div className="mt-4 min-w-0 overflow-hidden">{children}</div>
      </Card>
    </motion.div>
  )
}
