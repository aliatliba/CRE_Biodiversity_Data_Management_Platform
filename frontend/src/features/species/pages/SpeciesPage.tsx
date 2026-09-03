import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import * as siteService from '@/features/sites/services/siteService'
import type { Site } from '@/features/sites/types'
import * as speciesService from '../services/speciesService'
import type { Species } from '../types'
import { EMPTY_SPECIES_FILTERS } from '../types'
import type { SpeciesFilters } from '../types'
import { SpeciesTable } from '../components/SpeciesTable'
import { SpeciesSearch } from '../components/SpeciesSearch'

const DEFAULT_PAGE_SIZE = 15

export function SpeciesPage() {
  const [items, setItems] = useState<Species[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<SpeciesFilters>(EMPTY_SPECIES_FILTERS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    siteService.listSites().then(setSites).catch(() => setSites([]))
  }, [])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await speciesService.listSpecies({
        page,
        page_size: pageSize,
        search: filters.search || undefined,
        kingdom: filters.kingdom || undefined,
        class_name: filters.class_name || undefined,
        order_name: filters.order_name || undefined,
        family: filters.family || undefined,
        genus: filters.genus || undefined,
        national_status: filters.national_status || undefined,
        site_id: filters.site_id ? Number(filters.site_id) : undefined,
      })
      setItems(result.items)
      setPages(result.pages || 1)
      setTotal(result.total)
    } catch {
      setError('Could not load species.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  useEffect(() => {
    setPage(1)
    const timeout = setTimeout(load, 350)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  return (
    <AppLayout title="Species">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SpeciesSearch filters={filters} onChange={setFilters} sites={sites} />
          <Link to="/species/new" className="shrink-0">
            <Button className="w-full gap-2 sm:w-auto">
              <Plus size={16} />
              Log species
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={<Leaf size={22} />}
          title="No species found"
          description="Try a different filter, or log a new species observation."
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <SpeciesTable species={items} />
          <Pagination
            className="mt-5"
            page={page}
            pages={pages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </>
      )}
    </AppLayout>
  )
}

export default SpeciesPage
