import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  /** Extra context under the label, e.g. the name behind a number. */
  hint?: string
  delay?: number
}

export function StatCard({ label, value, icon: Icon, hint, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-fg-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-fg">{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-fg-subtle" title={hint}>{hint}</p>}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
          <Icon size={18} />
        </div>
      </Card>
    </motion.div>
  )
}
