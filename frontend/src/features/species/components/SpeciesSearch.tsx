import { useState } from 'react'
import { Filter, Search, X } from 'lucide-react'
import type { Site } from '@/features/sites/types'
import type { SpeciesFilters } from '../types'
import { EMPTY_SPECIES_FILTERS } from '../types'

interface SpeciesSearchProps {
  filters: SpeciesFilters
  onChange: (filters: SpeciesFilters) => void
  sites: Site[]
}

const FILTER_FIELDS: { key: keyof SpeciesFilters; label: string; placeholder: string }[] = [
  { key: 'search', label: 'Name', placeholder: 'Scientific or common name…' },
  { key: 'kingdom', label: 'Kingdom', placeholder: 'e.g. Plantae' },
  { key: 'class_name', label: 'Class', placeholder: 'e.g. Magnoliopsida' },
  { key: 'order_name', label: 'Order', placeholder: 'e.g. Fagales' },
  { key: 'family', label: 'Family', placeholder: 'e.g. Fagaceae' },
  { key: 'genus', label: 'Genus', placeholder: 'e.g. Quercus' },
]

export function SpeciesSearch({ filters, onChange, sites }: SpeciesSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  function setField<K extends keyof SpeciesFilters>(key: K, value: SpeciesFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  const hasActiveFilters = Object.entries(filters).some(([, value]) => value !== '')

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-950/35"
          />
          <input
            value={filters.search}
            onChange={(e) => setField('search', e.target.value)}
            placeholder="Search by scientific or common name…"
            className="h-11 w-full rounded-xl border border-mist-200 bg-paper-0 pl-10 pr-4 text-sm outline-none transition-colors focus:border-canopy-600"
          />
        </div>

        <select
          value={filters.site_id}
          onChange={(e) => setField('site_id', e.target.value)}
          className="h-11 rounded-xl border border-mist-200 bg-paper-0 px-3.5 text-sm text-ink-950/80 outline-none transition-colors focus:border-canopy-600"
        >
          <option value="">All sites</option>
          {sites.map((site) => (
            <option key={site.id} value={String(site.id)}>
              {site.name}
            </option>
          ))}
        </select>

        <select
          value={filters.national_status}
          onChange={(e) => setField('national_status', e.target.value)}
          className="h-11 rounded-xl border border-mist-200 bg-paper-0 px-3.5 text-sm text-ink-950/80 outline-none transition-colors focus:border-canopy-600"
        >
          <option value="">All national statuses</option>
          <option value="Protected">Protected</option>
          <option value="Non Protected">Non Protected</option>
        </select>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-mist-200 bg-paper-0 px-4 text-sm font-medium text-ink-950/75 transition-colors hover:bg-mist-100"
        >
          <Filter size={15} />
          {showAdvanced ? 'Hide filters' : 'More filters'}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_SPECIES_FILTERS)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-canopy-900/10 bg-mist-100/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {FILTER_FIELDS.filter((f) => f.key !== 'search').map((field) => (
            <label key={field.key} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-canopy-900/60">
                {field.label}
              </span>
              <input
                value={filters[field.key]}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-10 rounded-lg border border-mist-200 bg-paper-0 px-3 text-sm outline-none focus:border-canopy-600"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
