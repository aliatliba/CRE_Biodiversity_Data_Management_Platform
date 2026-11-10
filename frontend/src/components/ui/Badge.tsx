import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type Tone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'info'
  | 'iucn-ex'
  | 'iucn-ew'
  | 'iucn-cr'
  | 'iucn-en'
  | 'iucn-vu'
  | 'iucn-nt'
  | 'iucn-lc'
  | 'iucn-dd'
  | 'iucn-ne'

const toneClasses: Record<Tone, string> = {
  // Existing application tones
  neutral: 'bg-surface-muted text-fg-muted ring-1 ring-inset ring-line',
  success: 'bg-primary-soft text-primary ring-1 ring-inset ring-primary/20',
  warning: 'bg-accent/12 text-accent-fg ring-1 ring-inset ring-accent/25',
  danger: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/25',
  accent: 'bg-lichen-400/25 text-canopy-900 ring-1 ring-inset ring-lichen-400/40',
  info: 'bg-sky-500/10 text-sky-800 ring-1 ring-inset ring-sky-600/20 dark:text-sky-300',

  // IUCN Red List categories
  'iucn-ex': 'bg-[#000000] text-white',
  'iucn-ew': 'bg-[#542343] text-white',
  'iucn-cr': 'bg-[#D81E05] text-white',
  'iucn-en': 'bg-[#FC7F3F] text-black',
  'iucn-vu': 'bg-[#F9E814] text-black',
  'iucn-nt': 'bg-[#C6E639] text-black',
  'iucn-lc': 'bg-[#60C659] text-black',
  'iucn-dd': 'bg-[#D1D1C6] text-black',
  'iucn-ne': 'bg-white text-black border border-black/15',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  )
}