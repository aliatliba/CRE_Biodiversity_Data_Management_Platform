import type { Tone } from '@/components/ui/Badge'

/** Single source of truth for IUCN Red List categories. */
export const IUCN_CATEGORIES = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE'] as const

export type IucnCategory = (typeof IUCN_CATEGORIES)[number]

export const IUCN_LABELS: Record<IucnCategory, string> = {
  EX: 'Extinct',
  EW: 'Extinct in the Wild',
  CR: 'Critically Endangered',
  EN: 'Endangered',
  VU: 'Vulnerable',
  NT: 'Near Threatened',
  LC: 'Least Concern',
  DD: 'Data Deficient',
  NE: 'Not Evaluated',
}

/** Chart colours per category. */
export const IUCN_COLORS: Record<string, string> = {
  EX: '#000000',
  EW: '#542343',
  CR: '#dc2626',
  EN: '#ea580c',
  VU: '#f59e0b',
  NT: '#eab308',
  LC: '#16a34a',
  DD: '#6b7280',
  NE: '#9ca3af',
}

const BADGE_TONES: Record<IucnCategory, Tone> = {
  EX: 'iucn-ex',
  EW: 'iucn-ew',
  CR: 'iucn-cr',
  EN: 'iucn-en',
  VU: 'iucn-vu',
  NT: 'iucn-nt',
  LC: 'iucn-lc',
  DD: 'iucn-dd',
  NE: 'iucn-ne',
}

/** Categories counted as "threatened" across the app. */
export const THREATENED_STATUSES: readonly IucnCategory[] = ['CR', 'EN', 'VU']

/** Same list as a comma-separated query value, e.g. for `?iucn_status=`. */
export const THREATENED_STATUSES_PARAM = THREATENED_STATUSES.join(',')

/** Categories offered by the species filters / editors (extinct ones are rarely logged). */
export const IUCN_SELECTABLE: readonly IucnCategory[] = [
  'CR',
  'EN',
  'VU',
  'NT',
  'LC',
  'DD',
  'NE',
]

export interface IucnOption {
  value: IucnCategory
  label: string
}

/** `{ value: 'CR', label: 'Critically Endangered (CR)' }` options for filters. */
export const IUCN_OPTIONS: IucnOption[] = IUCN_SELECTABLE.map((value) => ({
  value,
  label: `${IUCN_LABELS[value]} (${value})`,
}))

export function isIucnCategory(value: string): value is IucnCategory {
  return (IUCN_CATEGORIES as readonly string[]).includes(value)
}

/** Badge tone for a status; unknown/empty values fall back to the neutral tone. */
export function getIucnTone(status: string | null | undefined): Tone {
  const normalized = status?.trim().toUpperCase() ?? ''
  return isIucnCategory(normalized) ? BADGE_TONES[normalized] : 'neutral'
}
