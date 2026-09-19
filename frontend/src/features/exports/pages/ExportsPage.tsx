import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import * as exportService from '../services/exportService'
import type { ExportFilters, ExportJob, ExportOptions } from '../types'

export function ExportsPage() {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [job, setJob] = useState<ExportJob | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<ExportFilters>({})
  const [options, setOptions] = useState<ExportOptions | null>(null)

  const [siteSearch, setSiteSearch] = useState('')
  const [sitesOpen, setSitesOpen] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sitesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    async function loadOptions() {
      try {
        const data = await exportService.getExportOptions()
        setOptions(data)
      } catch (err) {
        console.error('Failed to load export options:', err)
      }
    }

    loadOptions()

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sitesRef.current &&
        !sitesRef.current.contains(event.target as Node)
      ) {
        setSitesOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function updateFilter<K extends keyof ExportFilters>(
    key: K,
    value: ExportFilters[K],
  ) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  function clearFilters() {
    setFilters({})
    setSiteSearch('')
  }

  function toggleSite(siteId: number) {
    const current = filters.site_ids ?? []

    const next = current.includes(siteId)
      ? current.filter((id) => id !== siteId)
      : [...current, siteId]

    updateFilter('site_ids', next.length > 0 ? next : undefined)
  }

  function removeSite(siteId: number) {
    const current = filters.site_ids ?? []
    const next = current.filter((id) => id !== siteId)

    updateFilter('site_ids', next.length > 0 ? next : undefined)
  }

  function selectAllSites() {
    if (!options?.sites.length) return

    updateFilter(
      'site_ids',
      options.sites.map((site) => site.id),
    )
  }

  function clearSites() {
    updateFilter('site_ids', undefined)
  }

  async function handleCreate() {
    setError(null)
    setIsCreating(true)
    setJob(null)

    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    try {
      const created = await exportService.createExport(format, filters)
      setJob(created)

      if (created.status !== 'done') {
        pollRef.current = setInterval(async () => {
          try {
            const updated = await exportService.getExport(created.id)
            setJob(updated)

            if (
              updated.status === 'done' ||
              updated.status === 'failed'
            ) {
              if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
              }
            }
          } catch {
            if (pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
            }

            setError('Could not check the export status.')
          }
        }, 1500)
      }
    } catch {
      setError('Could not start the export.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDownload() {
    if (!job) return

    try {
      await exportService.downloadExport(job)
    } catch {
      setError('Could not download the file.')
    }
  }

  const hasFilters = Object.values(filters).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0
    }

    return value !== undefined && value !== ''
  })

  const activeFilterCount = Object.values(filters).filter((value) => {
    if (Array.isArray(value)) {
      return value.length > 0
    }

    return value !== undefined && value !== ''
  }).length

  const selectedSites =
    options?.sites.filter((site) =>
      filters.site_ids?.includes(site.id),
    ) ?? []

  const filteredSites =
    options?.sites.filter((site) =>
      site.name.toLowerCase().includes(siteSearch.toLowerCase()),
    ) ?? []

  return (
    <AppLayout title="Exports">
      <div className="mb-7 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-canopy-700/10 text-canopy-700">
            <Download size={18} />
          </div>

          <div>
            <h1 className="font-display text-lg font-bold text-canopy-950">
              Export catalogue
            </h1>
            <p className="text-sm text-ink-950/50">
              Create a filtered snapshot of the validated species catalogue.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* FILTERS */}
        <Card className="overflow-visible">
          <div className="flex flex-col gap-4 border-b border-mist-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canopy-700/10 text-canopy-700">
                <Filter size={17} />
              </div>

              <div>
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  Filter species
                </h2>
                <p className="mt-0.5 text-xs text-ink-950/50">
                  Choose the records you want to include.
                </p>
              </div>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold text-canopy-700 transition hover:bg-canopy-700/10 hover:text-canopy-900"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-7 pt-6">
            {/* SPECIES */}
            <FilterSection
              title="Species"
              description="Search by scientific or common name."
            >
              <div>
                <FieldLabel htmlFor="export-search">
                  Species search
                </FieldLabel>

                <div className="relative">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-950/35"
                  />

                  <input
                    id="export-search"
                    type="text"
                    value={filters.search ?? ''}
                    onChange={(event) =>
                      updateFilter(
                        'search',
                        event.target.value || undefined,
                      )
                    }
                    placeholder="Search scientific or common name..."
                    className="h-11 w-full rounded-xl border border-mist-200 bg-white pl-10 pr-4 text-sm text-ink-950 outline-none transition placeholder:text-ink-950/35 hover:border-mist-300 focus:border-canopy-600 focus:ring-4 focus:ring-canopy-600/10"
                  />

                  {filters.search && (
                    <button
                      type="button"
                      onClick={() => updateFilter('search', undefined)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-950/35 hover:bg-mist-100 hover:text-ink-950"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            </FilterSection>

            {/* LOCATION */}
            <FilterSection
              title="Location"
              description="Select one or multiple research sites."
            >
              <div ref={sitesRef} className="relative">
                <FieldLabel>Sites</FieldLabel>

                <button
                  type="button"
                  onClick={() => setSitesOpen((open) => !open)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm transition ${
                    sitesOpen
                      ? 'border-canopy-600 ring-4 ring-canopy-600/10'
                      : 'border-mist-200 hover:border-mist-300'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {selectedSites.length > 0 ? (
                      selectedSites.slice(0, 3).map((site) => (
                        <span
                          key={site.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-canopy-700/10 px-2.5 py-1 text-xs font-semibold text-canopy-800"
                        >
                          {site.name}

                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation()
                              removeSite(site.id)
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.key === 'Enter' ||
                                event.key === ' '
                              ) {
                                event.preventDefault()
                                event.stopPropagation()
                                removeSite(site.id)
                              }
                            }}
                            className="rounded-full p-0.5 hover:bg-canopy-700/15"
                          >
                            <X size={12} />
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-ink-950/40">
                        All sites
                      </span>
                    )}

                    {selectedSites.length > 3 && (
                      <span className="rounded-lg bg-mist-100 px-2.5 py-1 text-xs font-semibold text-ink-950/55">
                        +{selectedSites.length - 3} more
                      </span>
                    )}
                  </div>

                  <ChevronDown
                    size={17}
                    className={`shrink-0 text-ink-950/40 transition-transform ${
                      sitesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {sitesOpen && (
                  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-xl shadow-ink-950/10">
                    <div className="border-b border-mist-200 p-3">
                      <div className="relative">
                        <Search
                          size={15}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-950/35"
                        />

                        <input
                          type="text"
                          value={siteSearch}
                          onChange={(event) =>
                            setSiteSearch(event.target.value)
                          }
                          placeholder="Search sites..."
                          autoFocus
                          className="h-10 w-full rounded-lg border border-mist-200 bg-mist-50 pl-9 pr-3 text-sm outline-none transition focus:border-canopy-600 focus:bg-white focus:ring-2 focus:ring-canopy-600/10"
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={selectAllSites}
                          className="text-xs font-semibold text-canopy-700 hover:text-canopy-900"
                        >
                          Select all
                        </button>

                        {selectedSites.length > 0 && (
                          <button
                            type="button"
                            onClick={clearSites}
                            className="text-xs font-semibold text-ink-950/45 hover:text-ink-950"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2">
                      {filteredSites.length > 0 ? (
                        filteredSites.map((site) => {
                          const selected =
                            filters.site_ids?.includes(site.id) ?? false

                          return (
                            <button
                              key={site.id}
                              type="button"
                              onClick={() => toggleSite(site.id)}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                selected
                                  ? 'bg-canopy-700/8'
                                  : 'hover:bg-mist-100'
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                  selected
                                    ? 'border-canopy-700 bg-canopy-700 text-white'
                                    : 'border-mist-300 bg-white'
                                }`}
                              >
                                {selected && <Check size={13} strokeWidth={3} />}
                              </span>

                              <span
                                className={`text-sm ${
                                  selected
                                    ? 'font-semibold text-canopy-900'
                                    : 'text-ink-950/75'
                                }`}
                              >
                                {site.name}
                              </span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="px-3 py-8 text-center text-sm text-ink-950/40">
                          No sites found.
                        </div>
                      )}
                    </div>

                    <div className="border-t border-mist-200 bg-mist-50 px-3 py-2.5 text-xs text-ink-950/45">
                      {selectedSites.length === 0
                        ? 'All sites included'
                        : `${selectedSites.length} site${
                            selectedSites.length === 1 ? '' : 's'
                          } selected`}
                    </div>
                  </div>
                )}
              </div>
            </FilterSection>

            {/* TAXONOMY */}
            <FilterSection
              title="Taxonomy"
              description="Narrow the export using taxonomic classification."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FilterSelect
                  label="Kingdom"
                  value={filters.kingdom ?? ''}
                  options={options?.kingdoms ?? []}
                  placeholder="All kingdoms"
                  onChange={(value) =>
                    updateFilter('kingdom', value || undefined)
                  }
                />

                <FilterSelect
                  label="Class"
                  value={filters.class_name ?? ''}
                  options={options?.classes ?? []}
                  placeholder="All classes"
                  onChange={(value) =>
                    updateFilter('class_name', value || undefined)
                  }
                />

                <FilterSelect
                  label="Order"
                  value={filters.order_name ?? ''}
                  options={options?.orders ?? []}
                  placeholder="All orders"
                  onChange={(value) =>
                    updateFilter('order_name', value || undefined)
                  }
                />

                <FilterSelect
                  label="Family"
                  value={filters.family ?? ''}
                  options={options?.families ?? []}
                  placeholder="All families"
                  onChange={(value) =>
                    updateFilter('family', value || undefined)
                  }
                />

                <FilterSelect
                  label="Genus"
                  value={filters.genus ?? ''}
                  options={options?.genera ?? []}
                  placeholder="All genera"
                  onChange={(value) =>
                    updateFilter('genus', value || undefined)
                  }
                />
              </div>
            </FilterSection>

            {/* CONSERVATION */}
            <FilterSection
              title="Conservation"
              description="Filter according to conservation classification."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FilterSelect
                  label="IUCN status"
                  value={filters.iucn_status ?? ''}
                  options={options?.iucn_statuses ?? []}
                  placeholder="All IUCN statuses"
                  onChange={(value) =>
                    updateFilter('iucn_status', value || undefined)
                  }
                />

                <FilterSelect
                  label="IUCN trend"
                  value={filters.iucn_trend ?? ''}
                  options={options?.iucn_trends ?? []}
                  placeholder="All IUCN trends"
                  onChange={(value) =>
                    updateFilter('iucn_trend', value || undefined)
                  }
                />

                <FilterSelect
                  label="National status"
                  value={filters.national_status ?? ''}
                  options={options?.national_statuses ?? []}
                  placeholder="All national statuses"
                  onChange={(value) =>
                    updateFilter(
                      'national_status',
                      value || undefined,
                    )
                  }
                />
              </div>
            </FilterSection>

            {/* VALIDATION */}
            <FilterSection
              title="Validation"
              description="Filter species by their validation date."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  label="Validated from"
                  value={filters.date_from ?? ''}
                  onChange={(value) =>
                    updateFilter(
                      'date_from',
                      value || undefined,
                    )
                  }
                />

                <DateField
                  label="Validated to"
                  value={filters.date_to ?? ''}
                  onChange={(value) =>
                    updateFilter(
                      'date_to',
                      value || undefined,
                    )
                  }
                />
              </div>
            </FilterSection>
          </div>
        </Card>

        {/* EXPORT SETTINGS */}
        <div className="space-y-6">
          <Card className="h-fit">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canopy-700/10 text-canopy-700">
                <Download size={17} />
              </div>

              <div>
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  Export format
                </h2>
                <p className="mt-0.5 text-xs text-ink-950/50">
                  Choose the file format for your export.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <FormatOption
                selected={format === 'csv'}
                icon={<FileText size={19} />}
                title="CSV"
                description="Simple comma-separated file"
                onClick={() => setFormat('csv')}
              />

              <FormatOption
                selected={format === 'xlsx'}
                icon={<FileSpreadsheet size={19} />}
                title="Excel"
                description="Microsoft Excel workbook"
                onClick={() => setFormat('xlsx')}
              />
            </div>

            {hasFilters && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-mist-100 px-3.5 py-3 text-xs text-ink-950/60">
                <Filter size={14} className="shrink-0 text-canopy-700" />

                <span>
                  <strong className="text-ink-950">
                    {activeFilterCount}
                  </strong>{' '}
                  filter{activeFilterCount === 1 ? '' : 's'} active
                </span>
              </div>
            )}

            <Button
              onClick={handleCreate}
              isLoading={isCreating}
              className="mt-5 w-full"
            >
              Generate export
            </Button>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}

            {job && (
              <div className="mt-5 rounded-xl border border-canopy-900/10 bg-mist-100/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {job.status === 'done' && (
                      <CheckCircle2
                        size={18}
                        className="shrink-0 text-canopy-600"
                      />
                    )}

                    {job.status === 'failed' && (
                      <XCircle
                        size={18}
                        className="shrink-0 text-red-500"
                      />
                    )}

                    {job.status !== 'done' &&
                      job.status !== 'failed' && (
                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-canopy-700 border-t-transparent" />
                      )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-950">
                        Export #{job.id}
                      </p>

                      <Badge
                        tone={
                          job.status === 'done'
                            ? 'success'
                            : job.status === 'failed'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                  </div>

                  {job.status === 'done' && (
                    <Button
                      size="md"
                      variant="secondary"
                      onClick={handleDownload}
                      className="shrink-0 gap-2"
                    >
                      <Download size={15} />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* SUMMARY */}
          <Card className="h-fit bg-canopy-950 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
              Export summary
            </p>

            <div className="mt-4 space-y-3">
              <SummaryRow
                label="Format"
                value={format.toUpperCase()}
              />

              <SummaryRow
                label="Sites"
                value={
                  selectedSites.length === 0
                    ? 'All sites'
                    : `${selectedSites.length} selected`
                }
              />

              <SummaryRow
                label="Filters"
                value={
                  activeFilterCount === 0
                    ? 'None'
                    : `${activeFilterCount} active`
                }
              />
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

interface FilterSectionProps {
  title: string
  description: string
  children: React.ReactNode
}

function FilterSection({
  title,
  description,
  children,
}: FilterSectionProps) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-950/55">
          {title}
        </h3>

        <p className="mt-1 text-xs text-ink-950/40">
          {description}
        </p>
      </div>

      {children}
    </section>
  )
}

interface FieldLabelProps {
  htmlFor?: string
  children: React.ReactNode
}

function FieldLabel({ htmlFor, children }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold text-ink-950/70"
    >
      {children}
    </label>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  options: string[]
  placeholder: string
  onChange: (value: string) => void
}

function FilterSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: FilterSelectProps) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-mist-200 bg-white px-3.5 pr-10 text-sm text-ink-950 outline-none transition hover:border-mist-300 focus:border-canopy-600 focus:ring-4 focus:ring-canopy-600/10"
        >
          <option value="">{placeholder}</option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-950/35"
        />
      </div>
    </div>
  )
}

interface DateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function DateField({
  label,
  value,
  onChange,
}: DateFieldProps) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>

      <div className="relative">
        <CalendarDays
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-950/35"
        />

        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-mist-200 bg-white pl-10 pr-3.5 text-sm text-ink-950 outline-none transition hover:border-mist-300 focus:border-canopy-600 focus:ring-4 focus:ring-canopy-600/10"
        />
      </div>
    </div>
  )
}

interface FormatOptionProps {
  selected: boolean
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}

function FormatOption({
  selected,
  icon,
  title,
  description,
  onClick,
}: FormatOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
        selected
          ? 'border-canopy-700 bg-canopy-700/8 shadow-sm'
          : 'border-mist-200 bg-white hover:border-mist-300 hover:bg-mist-50'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          selected
            ? 'bg-canopy-700 text-white'
            : 'bg-mist-100 text-ink-950/50'
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${
            selected ? 'text-canopy-900' : 'text-ink-950'
          }`}
        >
          {title}
        </p>

        <p className="mt-0.5 text-xs text-ink-950/45">
          {description}
        </p>
      </div>

      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected
            ? 'border-canopy-700 bg-canopy-700 text-white'
            : 'border-mist-300'
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  )
}

interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-xs font-semibold text-white">
        {value}
      </span>
    </div>
  )
}

export default ExportsPage