import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  delay?: number
}

export function StatCard({ label, value, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-shell text-lichen-400">
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-display text-[1.7rem] font-medium tabular-nums leading-none text-ink-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-ink-950/50">{label}</p>
        </div>
      </Card>
    </motion.div>
  )
}
