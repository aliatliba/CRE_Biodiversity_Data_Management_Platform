import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Combobox } from '@/components/ui/Combobox'
import { SearchInput } from '@/components/ui/SearchInput'
import { usePolling } from '@/hooks/usePolling'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import * as exportService from '../services/exportService'
import type { ExportFilters, ExportJob, ExportOptions } from '../types'

const ACTIVE_STATUSES = new Set(['pending', 'processing'])

function isActiveFilter(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== ''
}

export function ExportsPage() {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [job, setJob] = useState<ExportJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<ExportFilters>({})

  const [siteSearch, setSiteSearch] = useState('')
  const [sitesOpen, setSitesOpen] = useState(false)

  const sitesRef = useRef<HTMLDivElement | null>(null)

  const optionsQuery = useQuery({
    queryKey: queryKeys.exportOptions,
    queryFn: exportService.getExportOptions,
    staleTime: 5 * 60_000,
  })
  const options: ExportOptions | undefined = optionsQuery.data

  const createMutation = useMutation({
    mutationFn: () => exportService.createExport(format, filters),
    onMutate: () => {
      setError(null)
      setJob(null)
    },
    onSuccess: setJob,
    onError: (err) => setError(getErrorMessage(err, 'Could not start the export.')),
  })

  // Poll until the job is finished; stops on unmount or a terminal status.
  usePolling({
    enabled: job !== null && ACTIVE_STATUSES.has(job.status),
    poll: () => exportService.getExport(job!.id),
    onResult: (updated) => {
      setJob(updated)
      return !ACTIVE_STATUSES.has(updated.status)
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not check the export status.')),
    intervalMs: 1500,
  })

  const downloadMutation = useMutation({
    mutationFn: (target: ExportJob) => exportService.downloadExport(target),
    onError: (err) => setError(getErrorMessage(err, 'Could not download the file.')),
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sitesRef.current && !sitesRef.current.contains(event.target as Node)) {
        setSitesOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function updateFilter<K extends keyof ExportFilters>(key: K, value: ExportFilters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }))
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
    const next = (filters.site_ids ?? []).filter((id) => id !== siteId)
    updateFilter('site_ids', next.length > 0 ? next : undefined)
  }

  function selectAllSites() {
    if (!options?.sites.length) return
    updateFilter('site_ids', options.sites.map((site) => site.id))
  }

  function clearSites() {
    updateFilter('site_ids', undefined)
  }

  const activeFilterCount = Object.values(filters).filter(isActiveFilter).length
  const hasFilters = activeFilterCount > 0
  const isCreating = createMutation.isPending

  const selectedSites =
    options?.sites.filter((site) =>
      filters.site_ids?.includes(site.id),
    ) ?? []

  const filteredSites =
    options?.sites.filter((site) =>
      site.name.toLowerCase().includes(siteSearch.toLowerCase()),
    ) ?? []

  return (
    <>
      {/* PAGE HEADER */}
      <div className="mb-7 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-canopy-700/10 text-canopy-700 dark:bg-canopy-700/15 dark:text-canopy-700">
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

      {optionsQuery.isError && (
        <Alert tone="warning" className="mb-6">
          Could not load the filter options ({getErrorMessage(optionsQuery.error, 'unknown error')}).
          You can still export without filters.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ============================================================
            FILTERS
        ============================================================ */}
        <Card className="overflow-visible">
          <div className="flex flex-col gap-4 border-b border-mist-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canopy-700/10 text-canopy-700 dark:bg-canopy-700/15 dark:text-canopy-700">
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
                className="self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold text-canopy-700 transition hover:bg-canopy-700/10 hover:text-canopy-900 dark:hover:bg-canopy-700/15"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-7 pt-6">
            {/* ========================================================
                SPECIES
            ======================================================== */}
            <FilterSection
              title="Species"
              description="Search by scientific or common name."
            >
              <div>
                <FieldLabel htmlFor="export-search">
                  Species search
                </FieldLabel>

                <SearchInput
                  id="export-search"
                  value={filters.search ?? ''}
                  onChange={(event) => updateFilter('search', event.target.value || undefined)}
                  placeholder="Search scientific or common name..."
                  wrapperClassName="max-w-none"
                />
              </div>
            </FilterSection>

            {/* ========================================================
                LOCATION
            ======================================================== */}
            <FilterSection
              title="Location"
              description="Select one or multiple research sites."
            >
              <div ref={sitesRef} className="relative">
                <FieldLabel>Sites</FieldLabel>

                <button
                  type="button"
                  onClick={() => setSitesOpen((open) => !open)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm text-ink-950 transition dark:bg-paper-50 ${
                    sitesOpen
                      ? 'border-canopy-600 bg-white ring-4 ring-canopy-600/10 dark:border-canopy-600 dark:ring-canopy-600/10'
                      : 'border-mist-200 bg-white hover:border-mist-300 dark:hover:border-canopy-400/40'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {selectedSites.length > 0 ? (
                      selectedSites.slice(0, 3).map((site) => (
                        <span
                          key={site.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-canopy-700/10 px-2.5 py-1 text-xs font-semibold text-canopy-800 dark:bg-canopy-700/15 dark:text-canopy-700"
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
                            className="rounded-full p-0.5 transition hover:bg-canopy-700/15"
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
                  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-xl shadow-ink-950/10 dark:bg-paper-0 dark:shadow-black/30">
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
                          className="h-10 w-full rounded-lg border border-mist-200 bg-mist-50 pl-9 pr-3 text-sm text-ink-950 outline-none transition placeholder:text-ink-950/35 focus:border-canopy-600 focus:bg-white focus:ring-2 focus:ring-canopy-600/10 dark:focus:bg-paper-50"
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={selectAllSites}
                          className="text-xs font-semibold text-canopy-700 transition hover:text-canopy-900 dark:hover:text-canopy-800"
                        >
                          Select all
                        </button>

                        {selectedSites.length > 0 && (
                          <button
                            type="button"
                            onClick={clearSites}
                            className="text-xs font-semibold text-ink-950/45 transition hover:text-ink-950"
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
                                  ? 'bg-canopy-700/8 dark:bg-canopy-700/12'
                                  : 'hover:bg-mist-100'
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                  selected
                                    ? 'border-canopy-700 bg-canopy-700 text-white'
                                    : 'border-mist-300 bg-white dark:bg-paper-50'
                                }`}
                              >
                                {selected && (
                                  <Check size={13} strokeWidth={3} />
                                )}
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

            {/* ========================================================
                TAXONOMY
            ======================================================== */}
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

                <Combobox
                  label="Family"
                  value={filters.family ?? ''}
                  options={options?.families ?? []}
                  placeholder="All families"
                  onChange={(value) => updateFilter('family', value || undefined)}
                />

                <Combobox
                  label="Genus"
                  value={filters.genus ?? ''}
                  options={options?.genera ?? []}
                  placeholder="All genera"
                  onChange={(value) => updateFilter('genus', value || undefined)}
                />
              </div>
            </FilterSection>

            {/* ========================================================
                CONSERVATION
            ======================================================== */}
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

            {/* ========================================================
                VALIDATION
            ======================================================== */}
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

        {/* ============================================================
            EXPORT SETTINGS
        ============================================================ */}
        <div className="space-y-6">
          <Card className="h-fit">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canopy-700/10 text-canopy-700 dark:bg-canopy-700/15 dark:text-canopy-700">
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
                <Filter
                  size={14}
                  className="shrink-0 text-canopy-700"
                />

                <span>
                  <strong className="text-ink-950">
                    {activeFilterCount}
                  </strong>{' '}
                  filter{activeFilterCount === 1 ? '' : 's'} active
                </span>
              </div>
            )}

            <Button
              onClick={() => createMutation.mutate()}
              isLoading={isCreating}
              className="mt-5 w-full dark:!bg-canopy-700 dark:!text-white dark:hover:!bg-canopy-600"
            >
              Generate export
            </Button>

            {error && <Alert className="mt-4">{error}</Alert>}

            {job && (
              <div className="mt-5 rounded-xl border border-canopy-900/10 bg-mist-100/50 p-4 dark:border-canopy-400/15">
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
                      onClick={() => job && downloadMutation.mutate(job)}
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

          {/* ============================================================
              SUMMARY
          ============================================================ */}
          <Card className="h-fit bg-canopy-950 text-white dark:border-canopy-700/20 dark:bg-[#0a2111]">
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
    </>
  )
}

/* ================================================================
   FILTER SECTION
================================================================ */

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

/* ================================================================
   FIELD LABEL
================================================================ */

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

/* ================================================================
   FILTER SELECT
================================================================ */

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
          className="h-11 w-full appearance-none rounded-xl border border-mist-200 bg-white px-3.5 pr-10 text-sm text-ink-950 outline-none transition hover:border-mist-300 focus:border-canopy-600 focus:ring-4 focus:ring-canopy-600/10 dark:bg-paper-50 dark:hover:border-canopy-400/40 dark:[color-scheme:dark]"
        >
          <option
            value=""
            className="bg-white text-ink-950 dark:bg-paper-50 dark:text-ink-950"
          >
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={option}
              value={option}
              className="bg-white text-ink-950 dark:bg-paper-50 dark:text-ink-950"
            >
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

/* ================================================================
   DATE FIELD
================================================================ */

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
          className="h-11 w-full rounded-xl border border-mist-200 bg-white pl-10 pr-3.5 text-sm text-ink-950 outline-none transition hover:border-mist-300 focus:border-canopy-600 focus:ring-4 focus:ring-canopy-600/10 dark:bg-paper-50 dark:hover:border-canopy-400/40 dark:[color-scheme:dark]"
        />
      </div>
    </div>
  )
}

/* ================================================================
   FORMAT OPTION
================================================================ */

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
          ? 'border-canopy-700 bg-canopy-700/8 shadow-sm dark:border-canopy-500 dark:bg-canopy-700/10'
          : 'border-mist-200 bg-white hover:border-mist-300 hover:bg-mist-50 dark:bg-paper-50 dark:hover:border-canopy-400/40 dark:hover:bg-mist-100'
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
            : 'border-mist-300 dark:border-mist-200'
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  )
}

/* ================================================================
   SUMMARY ROW
================================================================ */

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