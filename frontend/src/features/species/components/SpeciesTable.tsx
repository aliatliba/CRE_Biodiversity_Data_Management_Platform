import { Link } from 'react-router-dom'
import { Unlink } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { getIucnTone } from '@/lib/iucn'
import type { SpeciesListItem } from '../types'

interface SpeciesTableProps {
  species: SpeciesListItem[]
  /** Adds a "Remove from site" action column; rows where `canRemove` is false get no button. */
  onRemove?: (species: SpeciesListItem) => void
  canRemove?: (species: SpeciesListItem) => boolean
}

export function SpeciesTable({ species, onRemove, canRemove }: SpeciesTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl glass">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-muted text-xs font-semibold uppercase tracking-wide text-fg-muted">
              <th className="px-4 py-2.5">Scientific name</th>
              <th className="hidden px-4 py-2.5 md:table-cell">
                Family
              </th>
              <th className="hidden px-4 py-2.5 lg:table-cell">
                Kingdom
              </th>
              <th className="px-4 py-2.5">IUCN</th>
              <th className="px-4 py-2.5">National status</th>
              {onRemove && (
                <th className="px-4 py-2.5 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody className="stagger-in">
            {species.map((sp) => (
              <tr
                key={sp.id}
                className="border-b border-line transition-colors last:border-0 hover:bg-surface-muted"
              >
                <td className="px-4 py-2.5">
                  <Link
                    to={`/species/${sp.id}`}
                    className="font-medium italic text-canopy-900 hover:underline"
                  >
                    {sp.scientific_name}
                  </Link>
                </td>

                <td className="hidden px-4 py-2.5 text-fg-muted md:table-cell">
                  {sp.family ?? (
                    <span className="text-danger">Missing</span>
                  )}
                </td>

                <td className="hidden px-4 py-2.5 text-fg-muted lg:table-cell">
                  {sp.kingdom ?? (
                    <span className="text-danger">Missing</span>
                  )}
                </td>

                <td className="px-4 py-2.5">
                  {sp.iucn_status ? (
                    <Badge tone={getIucnTone(sp.iucn_status)}>
                      {sp.iucn_status}
                    </Badge>
                  ) : (
                    <Badge tone="iucn-ne">NE</Badge>
                  )}
                </td>

                <td className="px-4 py-2.5">
                  <Badge
                    tone={
                      sp.national_status === 'Protected'
                        ? 'accent'
                        : 'neutral'
                    }
                  >
                    {sp.national_status}
                  </Badge>
                </td>

                {onRemove && (
                  <td className="px-4 py-2.5 text-right">
                    {(canRemove?.(sp) ?? true) && (
                      <button
                        type="button"
                        onClick={() => onRemove(sp)}
                        title="Remove from site"
                        aria-label={`Remove ${sp.scientific_name} from this site`}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Unlink size={15} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}