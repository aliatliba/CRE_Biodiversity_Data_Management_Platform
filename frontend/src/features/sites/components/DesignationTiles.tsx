import { cn } from '@/lib/utils'
import type { Designation } from '../types'

const MAX_TILES = 5

/** Shared look of a logo tile: white so every logo reads the same in light and dark themes. */
export const TILE_CLASS =
  'flex shrink-0 items-center justify-center rounded-[10px] border border-line bg-white shadow-[0_1px_2px_rgba(5,39,7,0.06)]'

function Tooltip({ text }: { text: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-canopy-950 px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-paper-0 opacity-0 shadow-lg transition-opacity duration-150 group-hover/tile:opacity-100"
    >
      {text}
    </span>
  )
}

interface DesignationTilesProps {
  designations: Designation[] | undefined
  className?: string
}

/**
 * Row of designation logos for a site card. Renders nothing when the site has
 * none. The tiles are part of the card link (clicking one opens the site), so they
 * are not separately focusable; screen readers get each logo's name from its alt text.
 */
export function DesignationTiles({ designations, className }: DesignationTilesProps) {
  if (!designations?.length) return null

  const shown = designations.length > MAX_TILES ? designations.slice(0, MAX_TILES) : designations
  const rest = designations.slice(shown.length)

  return (
    <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Designations">
      {shown.map((d) => (
        <li
          key={d.id}
          className={cn(
            TILE_CLASS,
            'group/tile relative h-8 w-8 p-0.5 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_-4px_rgba(5,39,7,0.25)] sm:h-10 sm:w-10',
          )}
        >
          <img
            src={d.icon}
            alt={d.name_en}
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
          <Tooltip text={d.name_en} />
        </li>
      ))}
      {rest.length > 0 && (
        <li
          className={cn(
            TILE_CLASS,
            'group/tile relative h-8 w-8 text-xs font-semibold tabular-nums text-canopy-900 sm:h-10 sm:w-10',
          )}
          aria-label={`${rest.length} more: ${rest.map((d) => d.name_en).join(', ')}`}
        >
          +{rest.length}
          <Tooltip text={rest.map((d) => d.name_en).join(' · ')} />
        </li>
      )}
    </ul>
  )
}
