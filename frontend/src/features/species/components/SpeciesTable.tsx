import { Link } from 'react-router-dom'
import { Badge, getIucnTone } from '@/components/ui/Badge'
import type { Species } from '../types'

export function SpeciesTable({ species }: { species: Species[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-canopy-900/10 bg-paper-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-canopy-900/[0.08] bg-mist-100/50 text-xs font-semibold uppercase tracking-wide text-ink-950/50">
              <th className="px-5 py-3">Scientific name</th>
              <th className="hidden px-5 py-3 md:table-cell">
                Family
              </th>
              <th className="hidden px-5 py-3 lg:table-cell">
                Kingdom
              </th>
              <th className="px-5 py-3">IUCN</th>
              <th className="px-5 py-3">National status</th>
            </tr>
          </thead>

          <tbody>
            {species.map((sp) => (
              <tr
                key={sp.id}
                className="border-b border-canopy-900/[0.05] transition-colors last:border-0 hover:bg-mist-100/40"
              >
                <td className="px-5 py-3.5">
                  <Link
                    to={`/species/${sp.id}`}
                    className="font-medium italic text-canopy-900 hover:underline"
                  >
                    {sp.scientific_name}
                  </Link>
                </td>

                <td className="hidden px-5 py-3.5 text-ink-950/65 md:table-cell">
                  {sp.family ?? (
                    <span className="text-red-500">Missing</span>
                  )}
                </td>

                <td className="hidden px-5 py-3.5 text-ink-950/65 lg:table-cell">
                  {sp.kingdom ?? (
                    <span className="text-red-500">Missing</span>
                  )}
                </td>

                <td className="px-5 py-3.5">
                  {sp.iucn_status ? (
                    <Badge tone={getIucnTone(sp.iucn_status)}>
                      {sp.iucn_status}
                    </Badge>
                  ) : (
                    <Badge tone="iucn-ne">NE</Badge>
                  )}
                </td>

                <td className="px-5 py-3.5">
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