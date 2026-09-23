import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Leaf, Search } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { Pagination } from '@/components/ui/Pagination'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'

import * as speciesService from '../services/speciesService'
import type { Species } from '../types'
import { SpeciesTable } from '../components/SpeciesTable'

const DEFAULT_PAGE_SIZE = 15
const THREATENED_IUCN_STATUS = 'CR,EN,VU'

/**
 * Global (all-sites) view of IUCN threatened species, opened from the
 * "IUCN threatened species" card on the dashboard. Mirrors the structure of
 * the site-scoped SiteSpeciesPage (threatened mode), minus the site scoping.
 */
export function ThreatenedSpeciesPage() {
  const [items, setItems] = useState<Species[]>([])

  const [search, setSearch] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await speciesService.listSpecies({
        iucn_status: THREATENED_IUCN_STATUS,
        search: search || undefined,
        page,
        page_size: pageSize,
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

    const timeout = setTimeout(() => {
      load()
    }, 350)

    return () => clearTimeout(timeout)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <AppLayout title="IUCN threatened species">
      <Link
        to="/dashboard"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-canopy-700 hover:underline"
      >
        <ArrowLeft size={15} />
        Back to Dashboard
      </Link>

      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-canopy-950">
            IUCN threatened species
          </h1>
          <p className="mt-1 text-sm text-ink-950/55">
            Species classified as CR, EN, or VU on the IUCN Red List, across all survey sites.
          </p>
        </div>

        <div className="relative w-full max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-950/35"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by scientific or common name…"
            className="h-11 w-full rounded-xl border border-mist-200 bg-paper-0 pl-10 pr-4 text-sm outline-none transition-colors focus:border-canopy-600"
          />
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
          title="No threatened species"
          description="No species are currently classified as CR, EN, or VU."
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

export default ThreatenedSpeciesPage