import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-mist-100 text-ink-950/70',
  success: 'bg-canopy-500/15 text-canopy-800',
  warning: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  accent: 'bg-lichen-400/20 text-ink-950',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  )
}
