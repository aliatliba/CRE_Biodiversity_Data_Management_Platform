import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import {
  getCompletenessLabel,
  getCompletenessStatus,
  getCompletenessTone,
} from '@/lib/speciesCompleteness'
import type { Species } from '../types'

function iucnTone(status: string | null): 'danger' | 'warning' | 'success' | 'neutral' {
  if (!status) return 'neutral'
  if (['CR', 'EN'].includes(status)) return 'danger'
  if (['VU', 'NT'].includes(status)) return 'warning'
  if (['LC'].includes(status)) return 'success'
  return 'neutral'
}

export function SpeciesTable({ species }: { species: Species[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-canopy-900/10 bg-paper-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-canopy-900/[0.08] bg-mist-100/50 text-xs font-semibold uppercase tracking-wide text-ink-950/50">
            <th className="px-5 py-3">Scientific name</th>
            <th className="hidden px-5 py-3 md:table-cell">Family</th>
            <th className="hidden px-5 py-3 lg:table-cell">Kingdom</th>
            <th className="px-5 py-3">IUCN</th>
            <th className="px-5 py-3">National status</th>
            <th className="px-5 py-3">Data quality</th>
          </tr>
        </thead>
        <tbody>
          {species.map((sp) => {
            const completeness = getCompletenessStatus(sp)
            return (
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
                  {sp.common_name && <p className="text-xs text-ink-950/45">{sp.common_name}</p>}
                </td>
                <td className="hidden px-5 py-3.5 text-ink-950/65 md:table-cell">
                  {sp.family ?? <span className="text-red-500">Missing</span>}
                </td>
                <td className="hidden px-5 py-3.5 text-ink-950/65 lg:table-cell">
                  {sp.kingdom ?? <span className="text-red-500">Missing</span>}
                </td>
                <td className="px-5 py-3.5">
                  {sp.iucn_status ? (
                    <Badge tone={iucnTone(sp.iucn_status)}>{sp.iucn_status}</Badge>
                  ) : (
                    <span className="text-xs font-medium text-amber-600">Missing</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <Badge tone={sp.national_status === 'Protected' ? 'accent' : 'neutral'}>
                    {sp.national_status}
                  </Badge>
                </td>
                <td className="px-5 py-3.5">
                  <Badge tone={getCompletenessTone(completeness)}>
                    {getCompletenessLabel(completeness)}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
