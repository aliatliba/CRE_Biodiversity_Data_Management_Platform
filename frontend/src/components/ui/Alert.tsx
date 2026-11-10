import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AlertTone = 'error' | 'warning' | 'success' | 'info'

const TONES: Record<AlertTone, string> = {
  error: 'border-danger/30 bg-danger/8 text-danger',
  warning: 'border-accent/30 bg-accent/10 text-accent-fg',
  success: 'border-primary/25 bg-primary-soft text-primary',
  info: 'border-sky-600/25 bg-sky-500/10 text-sky-800 dark:text-sky-300',
}

interface AlertProps {
  tone?: AlertTone
  children: ReactNode
  className?: string
}

/** Inline message box. Errors use role="alert", everything else role="status". */
export function Alert({ tone = 'error', children, className }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-lg border px-3.5 py-2.5 text-sm font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </div>
  )
}
