import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { getIucnTone } from '@/lib/iucn'
import type { SpeciesListItem } from '../types'

export function SpeciesTable({ species }: { species: SpeciesListItem[] }) {
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}