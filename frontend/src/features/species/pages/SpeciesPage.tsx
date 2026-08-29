import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import * as speciesService from '../services/speciesService'
import type { Species } from '../types'
import { SpeciesTable } from '../components/SpeciesTable'
import { SpeciesSearch } from '../components/SpeciesSearch'

const PAGE_SIZE = 15

export function SpeciesPage() {
  const [items, setItems] = useState<Species[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [family, setFamily] = useState('')
  const [nationalStatus, setNationalStatus] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await speciesService.listSpecies({
        page,
        page_size: PAGE_SIZE,
        family: family || undefined,
        national_status: nationalStatus || undefined,
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
  }, [page])

  useEffect(() => {
    setPage(1)
    const timeout = setTimeout(load, 350)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, nationalStatus])

  return (
    <AppLayout title="Species">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SpeciesSearch
          familyFilter={family}
          onFamilyChange={setFamily}
          nationalStatusFilter={nationalStatus}
          onNationalStatusChange={setNationalStatus}
        />
        <Link to="/species/new">
          <Button className="w-full gap-2 sm:w-auto">
            <Plus size={16} />
            Log species
          </Button>
        </Link>
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
          <div className="mt-5 flex items-center justify-between text-sm text-ink-950/55">
            <span>
              {total} species · page {page} of {pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-mist-200 text-ink-950/60 transition-colors hover:bg-paper-50 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-mist-200 text-ink-950/60 transition-colors hover:bg-paper-50 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  )
}

export default SpeciesPage
