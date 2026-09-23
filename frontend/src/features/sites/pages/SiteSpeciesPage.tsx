import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Leaf, Search } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { Pagination } from '@/components/ui/Pagination'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'

import * as siteService from '../services/siteService'
import type { Site } from '../types'

import * as speciesService from '@/features/species/services/speciesService'
import type { Species } from '@/features/species/types'
import { SpeciesTable } from '@/features/species/components/SpeciesTable'

const DEFAULT_PAGE_SIZE = 15

export type SiteSpeciesMode = 'protected' | 'threatened'

const MODE_CONTENT: Record<
  SiteSpeciesMode,
  { title: string; description: string; emptyTitle: string; emptyDescription: string }
> = {
  protected: {
    title: 'Protected species',
    description: 'Species with a national protected status recorded at this site.',
    emptyTitle: 'No protected species',
    emptyDescription: 'No species at this site currently have a protected national status.',
  },
  threatened: {
    title: 'IUCN threatened species',
    description: 'Species classified as CR, EN, or VU on the IUCN Red List at this site.',
    emptyTitle: 'No threatened species',
    emptyDescription: 'No species at this site are currently classified as CR, EN, or VU.',
  },
}

export function SiteSpeciesPage({ mode }: { mode: SiteSpeciesMode }) {
  const { id } = useParams<{ id: string }>()
  const siteId = Number(id)
  const content = MODE_CONTENT[mode]

  const [site, setSite] = useState<Site | null>(null)
  const [items, setItems] = useState<Species[]>([])

  const [search, setSearch] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(siteId)) return

    siteService
      .getSite(siteId)
      .then(setSite)
      .catch(() => setSite(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  async function load() {
    if (!Number.isFinite(siteId)) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await speciesService.listSpecies({
        site_id: siteId,
        search: search || undefined,
        national_status: mode === 'protected' ? 'Protected' : undefined,
        iucn_status: mode === 'threatened' ? 'CR,EN,VU' : undefined,
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
  }, [page, pageSize, siteId, mode])

  useEffect(() => {
    setPage(1)

    const timeout = setTimeout(() => {
      load()
    }, 350)

    return () => clearTimeout(timeout)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <AppLayout title={content.title}>
      <Link
        to={`/sites/${siteId}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-canopy-700 hover:underline"
      >
        <ArrowLeft size={15} />
        Back to {site?.name ?? 'site'}
      </Link>

      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-canopy-950">
            {content.title}
          </h1>
          <p className="mt-1 text-sm text-ink-950/55">
            {content.description}
            {site ? ` — ${site.name}` : ''}
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
          title={content.emptyTitle}
          description={content.emptyDescription}
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

export default SiteSpeciesPage
