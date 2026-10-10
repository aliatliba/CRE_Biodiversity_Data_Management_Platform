import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AlertTone = 'error' | 'warning' | 'success' | 'info'

const TONES: Record<AlertTone, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  success: 'border-canopy-600/25 bg-canopy-500/10 text-canopy-900',
  info: 'border-violet-200 bg-violet-50 text-violet-800',
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
