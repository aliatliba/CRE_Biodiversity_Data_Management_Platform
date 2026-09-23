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
  neutral: 'bg-mist-100 text-ink-950/70',
  success: 'bg-canopy-500/15 text-canopy-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  accent: 'bg-lichen-400/25 text-canopy-900',
  info: 'bg-violet-100 text-violet-700',

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

export type IucnStatus =
  | 'EX'
  | 'EW'
  | 'CR'
  | 'EN'
  | 'VU'
  | 'NT'
  | 'LC'
  | 'DD'
  | 'NE'

/**
 * Maps an IUCN Red List category to its official visual badge tone.
 *
 * Unknown/null statuses fall back to the application's neutral badge.
 */
export function getIucnTone(
  status: string | null | undefined
): Tone {
  if (!status) return 'neutral'

  const normalized = status.trim().toUpperCase()

  switch (normalized) {
    case 'EX':
      return 'iucn-ex'

    case 'EW':
      return 'iucn-ew'

    case 'CR':
      return 'iucn-cr'

    case 'EN':
      return 'iucn-en'

    case 'VU':
      return 'iucn-vu'

    case 'NT':
      return 'iucn-nt'

    case 'LC':
      return 'iucn-lc'

    case 'DD':
      return 'iucn-dd'

    case 'NE':
      return 'iucn-ne'

    default:
      return 'neutral'
  }
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  )
}