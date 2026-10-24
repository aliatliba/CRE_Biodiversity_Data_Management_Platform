import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Filter, X } from 'lucide-react'
import type { Site } from '@/features/sites/types'
import type { SpeciesFilters } from '../types'
import { EMPTY_SPECIES_FILTERS } from '../types'
import { IUCN_OPTIONS } from '@/lib/iucn'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'

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

/**
 * IUCN status filter, rendered as a multiselect.
 *
 * The selected statuses are kept in `SpeciesFilters.iucn_status` as a single
 * comma-separated string (e.g. "CR,EN,VU"), matching the query param format
 * the backend accepts. This keeps the field a plain string, so nothing else
 * that reads `filters.iucn_status` needs to change.
 */
function IucnStatusMultiSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = value ? value.split(',').filter(Boolean) : []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleStatus(status: string) {
    const next = selected.includes(status)
      ? selected.filter((s) => s !== status)
      : [...selected, status]

    onChange(next.join(','))
  }

  const buttonLabel =
    selected.length === 0
      ? 'All IUCN statuses'
      : selected.length === 1
        ? (IUCN_OPTIONS.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} IUCN statuses`

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-mist-200 bg-paper-0 px-3.5 text-sm text-ink-950/80 outline-none transition-colors focus:border-canopy-600"
      >
        {buttonLabel}
        <ChevronDown size={14} className="text-ink-950/40" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 z-10 mt-2 w-56 rounded-xl border border-mist-200 bg-paper-0 p-2 shadow-lg"
        >
          {IUCN_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-950/80 transition-colors hover:bg-mist-100"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggleStatus(option.value)}
                className="h-3.5 w-3.5 rounded border-mist-300 text-canopy-700 focus:ring-canopy-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function SpeciesSearch({ filters, onChange, sites }: SpeciesSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  function setField<K extends keyof SpeciesFilters>(key: K, value: SpeciesFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  const hasActiveFilters = Object.entries(filters).some(([, value]) => value !== '')

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={filters.search}
          onChange={(e) => setField('search', e.target.value)}
          placeholder="Search by scientific or common name…"
          aria-label="Search species"
        />

        <Select
          aria-label="Site"
          value={filters.site_id}
          onChange={(e) => setField('site_id', e.target.value)}
        >
          <option value="">All sites</option>
          {sites.map((site) => (
            <option key={site.id} value={String(site.id)}>
              {site.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="National status"
          value={filters.national_status}
          onChange={(e) => setField('national_status', e.target.value)}
        >
          <option value="">All national statuses</option>
          <option value="Protected">Protected</option>
          <option value="Non Protected">Non Protected</option>
        </Select>

        <IucnStatusMultiSelect
          value={filters.iucn_status}
          onChange={(value) => setField('iucn_status', value)}
        />

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
