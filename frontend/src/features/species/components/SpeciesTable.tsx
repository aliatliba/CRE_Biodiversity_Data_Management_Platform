import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
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
            <th className="hidden px-5 py-3 sm:table-cell">Family</th>
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
                <Link to={`/species/${sp.id}`} className="font-medium italic text-canopy-900 hover:underline">
                  {sp.scientific_name}
                </Link>
                {sp.common_name && <p className="text-xs text-ink-950/45">{sp.common_name}</p>}
              </td>
              <td className="hidden px-5 py-3.5 text-ink-950/65 sm:table-cell">{sp.family ?? '—'}</td>
              <td className="px-5 py-3.5">
                {sp.iucn_status ? (
                  <Badge tone={iucnTone(sp.iucn_status)}>{sp.iucn_status}</Badge>
                ) : (
                  <span className="text-ink-950/35">—</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                <Badge tone={sp.national_status === 'Protected' ? 'accent' : 'neutral'}>
                  {sp.national_status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
