import { Link } from 'react-router-dom'
import { ChevronRight, MapPin } from 'lucide-react'
import { siteUrl } from '@/lib/constants'
import type { SpeciesSite } from '../types'

export function SpeciesSites({ sites }: { sites: SpeciesSite[] }) {
  if (sites.length === 0) {
    return <p className="text-sm text-fg-subtle">Not recorded at any site yet.</p>
  }

  return (
    <ul className="-mx-2 flex flex-col">
      {sites.map((site) => (
        <li key={site.site_id}>
          <Link
            to={siteUrl(site.site_id)}
            className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-muted"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canopy-700/10 text-canopy-700">
              <MapPin size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">
                {site.site_name}
                {site.site_code && (
                  <span className="ml-2 font-mono text-xs text-fg-subtle">{site.site_code}</span>
                )}
              </p>
              <p className="text-xs text-fg-subtle">
                Recorded {new Date(site.recorded_at).toLocaleDateString()}
              </p>
              {site.notes && (
                <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{site.notes}</p>
              )}
            </div>
            <ChevronRight
              size={15}
              className="shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}
