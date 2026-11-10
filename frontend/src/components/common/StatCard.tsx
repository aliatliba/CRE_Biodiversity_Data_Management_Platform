import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { CountUp } from './CountUp'

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
      <Card className="relative flex items-start justify-between gap-3 overflow-hidden">
        <div
          className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-70"
          style={{ background: 'radial-gradient(closest-side, var(--aurora-1), transparent)' }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium text-fg-muted">{label}</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums tracking-tight text-fg">
            {typeof value === 'number' ? <CountUp value={value} /> : value}
          </p>
          {hint && <p className="mt-0.5 truncate text-xs text-fg-subtle" title={hint}>{hint}</p>}
        </div>
        <div
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-on-primary shadow-[0_8px_20px_-8px_var(--color-glow)]"
          aria-hidden="true"
        >
          <Icon size={18} />
        </div>
      </Card>
    </motion.div>
  )
}
