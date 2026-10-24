import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ArrowLeft, Leaf, Plus } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'

import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSitesQuery } from '@/hooks/useSitesQuery'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import { ROUTES, siteUrl } from '@/lib/constants'

import * as speciesService from '../services/speciesService'
import type { SpeciesFilters } from '../types'
import { EMPTY_SPECIES_FILTERS } from '../types'
import { SpeciesTable } from '../components/SpeciesTable'
import { SpeciesSearch } from '../components/SpeciesSearch'

const DEFAULT_PAGE_SIZE = 15

/** Filters that live in the URL (shareable / linkable from the dashboard and site pages). */
const URL_FILTER_KEYS = ['site_id', 'national_status', 'iucn_status', 'search'] as const

function filtersFromParams(params: URLSearchParams): SpeciesFilters {
  const filters = { ...EMPTY_SPECIES_FILTERS }
  for (const key of URL_FILTER_KEYS) filters[key] = params.get(key) ?? ''
  return filters
}

function toListParams(filters: SpeciesFilters, page: number, pageSize: number) {
  return {
    page,
    page_size: pageSize,
    search: filters.search || undefined,
    kingdom: filters.kingdom || undefined,
    class_name: filters.class_name || undefined,
    order_name: filters.order_name || undefined,
    family: filters.family || undefined,
    genus: filters.genus || undefined,
    national_status: filters.national_status || undefined,
    iucn_status: filters.iucn_status || undefined,
    site_id: filters.site_id ? Number(filters.site_id) : undefined,
  }
}

/** The one species list. Site / status scoping comes from the URL query string. */
export function SpeciesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Filters are edited locally (so typing is instant) and mirrored to the URL.
  const [filters, setFilters] = useState<SpeciesFilters>(() => filtersFromParams(searchParams))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const debouncedFilters = useDebouncedValue(filters)

  function updateFilters(next: SpeciesFilters) {
    setFilters(next)
    setPage(1)

    const params = new URLSearchParams()
    for (const key of URL_FILTER_KEYS) if (next[key]) params.set(key, next[key])
    setSearchParams(params, { replace: true })
  }

  const sitesQuery = useSitesQuery()
  const sites = sitesQuery.data ?? []

  const listParams = toListParams(debouncedFilters, page, pageSize)
  const query = useQuery({
    queryKey: queryKeys.species(listParams),
    queryFn: () => speciesService.listSpecies(listParams),
    placeholderData: keepPreviousData,
  })

  const items = query.data?.items ?? []
  const scopedSite = filters.site_id
    ? sites.find((site) => String(site.id) === filters.site_id)
    : undefined

  return (
    <>
      {filters.site_id && (
        <Link
          to={siteUrl(filters.site_id)}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-canopy-700 hover:underline"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to {scopedSite?.name ?? 'site'}
        </Link>
      )}

      <div className="mb-6 flex flex-col gap-4">
        {scopedSite && (
          <p className="text-sm text-ink-950/55">Showing species recorded at {scopedSite.name}.</p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SpeciesSearch filters={filters} onChange={updateFilters} sites={sites} />

          <Link to={ROUTES.addSpecies} className="shrink-0">
            <Button className="w-full gap-2 sm:w-auto">
              <Plus size={16} />
              Log species
            </Button>
          </Link>
        </div>
      </div>

      {query.isPending && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {query.isError && (
        <ErrorState
          message={getErrorMessage(query.error, 'Could not load species.')}
          onRetry={() => query.refetch()}
        />
      )}

      {query.isSuccess && items.length === 0 && (
        <EmptyState
          icon={<Leaf size={22} />}
          title="No species found"
          description="Try a different filter, or log a new species observation."
        />
      )}

      {query.isSuccess && items.length > 0 && (
        <div className={query.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <SpeciesTable species={items} />

          <Pagination
            className="mt-5"
            page={page}
            pages={query.data.pages || 1}
            total={query.data.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </div>
      )}
    </>
  )
}

export default SpeciesPage
