import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Leaf, MapPin, Plus, ShieldAlert, ShieldCheck, Trash2, Trophy } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { SearchInput } from '@/components/ui/SearchInput'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { StatCard } from '@/components/common/StatCard'
import { useAuth } from '@/hooks/useAuth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useSitesQuery } from '@/hooks/useSitesQuery'
import { getErrorMessage } from '@/lib/errors'
import { siteUrl } from '@/lib/constants'
import { queryKeys } from '@/lib/queryKeys'
import * as siteService from '../services/siteService'
import { DeleteSiteDialogs } from '../components/DeleteSiteDialogs'
import type { Site, SiteListItem } from '../types'

/** Older APIs sent sites without counters: default them so the page still renders. */
function withCounters(sites: SiteListItem[]): SiteListItem[] {
  const records = sites.reduce((sum, s) => sum + (s.species_count ?? 0), 0)
  return sites.map((s) => {
    const count = s.species_count ?? 0
    return {
      ...s,
      species_count: count,
      species_share: s.species_share ?? (records > 0 ? (count / records) * 100 : 0),
      protected_count: s.protected_count ?? 0,
      threatened_count: s.threatened_count ?? 0,
      complete_count: s.complete_count ?? 0,
    }
  })
}

function bySpeciesCount(a: SiteListItem, b: SiteListItem): number {
  return b.species_count - a.species_count || a.name.localeCompare(b.name)
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

/** Headline numbers for the whole network of sites (never filtered by the search). */
function SiteKpis({ sites }: { sites: SiteListItem[] }) {
  const records = sites.reduce((sum, s) => sum + s.species_count, 0)
  const richest = [...sites].sort(bySpeciesCount)[0]
  const hasRichest = richest !== undefined && richest.species_count > 0

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Survey sites" value={sites.length} icon={MapPin} />
      <StatCard label="Species records" value={records} icon={Leaf} delay={0.05} />
      <StatCard
        label={hasRichest ? `Richest site · ${richest.name}` : 'Richest site'}
        value={hasRichest ? richest.species_count : '—'}
        icon={Trophy}
        delay={0.1}
      />
    </div>
  )
}

export function SitesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', description: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Without a search term this is the shared ['sites'] query used everywhere.
  const query = useQuery({
    queryKey: debouncedSearch ? [...queryKeys.sites, { search: debouncedSearch }] : queryKeys.sites,
    queryFn: () => siteService.listSites(debouncedSearch || undefined),
    placeholderData: keepPreviousData,
  })
  // Richest sites first.
  const sites = withCounters(query.data ?? []).sort(bySpeciesCount)
  // KPIs always describe every site, whatever the search box says.
  const allSitesQuery = useSitesQuery()

  const createMutation = useMutation({
    mutationFn: () =>
      siteService.createSite({
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
      }),
    onSuccess: () => {
      setIsModalOpen(false)
      setForm({ name: '', code: '', description: '' })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sites })
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Could not create site.')),
  })

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('Site name is required.')
      return
    }
    createMutation.mutate()
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sites…"
          aria-label="Search sites"
          wrapperClassName="max-w-xs"
        />
        {isAdmin && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="w-full gap-2 sm:w-auto"
          >
            <Plus size={16} />
            New site
          </Button>
        )}
      </div>

      {allSitesQuery.data && allSitesQuery.data.length > 0 && (
        <SiteKpis sites={withCounters(allSitesQuery.data)} />
      )}

      {deleteError && <Alert className="mb-4">{deleteError}</Alert>}

      {query.isPending && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {query.isError && (
        <ErrorState
          message={getErrorMessage(query.error, 'Could not load sites.')}
          onRetry={() => query.refetch()}
        />
      )}

      {query.isSuccess && sites.length === 0 && (
        <EmptyState
          icon={<MapPin size={22} />}
          title={debouncedSearch ? 'No matching sites' : 'No sites yet'}
          description={debouncedSearch ? 'Try a different search term.' : 'Create the first survey site to start logging species.'}
        />
      )}

      {query.isSuccess && sites.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site, index) => (
            <Link key={site.id} to={siteUrl(site.id)}>
              <Card className="flex h-full min-h-[210px] flex-col transition-colors hover:border-canopy-700/30 hover:bg-mist-100/40">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className="mt-0.5 shrink-0 rounded-md bg-canopy-700/10 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-canopy-700"
                      title={debouncedSearch ? 'Rank among matching sites' : 'Rank by number of species'}
                    >
                      #{index + 1}
                    </span>

                    <h3 className="min-w-0 break-words font-display text-[15px] font-bold leading-snug text-canopy-950">
                      {site.name}
                    </h3>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeleteError(null)
                        setSiteToDelete(site)
                      }}
                      aria-label={`Delete ${site.name}`}
                      className="shrink-0 rounded-full p-1.5 text-ink-950/30 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Species count and share of all records */}
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="font-display text-3xl font-bold leading-none tabular-nums text-canopy-950">
                    {site.species_count}
                    <span className="ml-1.5 text-sm font-medium text-ink-950/50">
                      species
                    </span>
                  </p>
                  <span className="text-sm font-semibold tabular-nums text-canopy-700">
                    {site.species_share.toFixed(1)}%
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-canopy-900/[0.08]"
                  aria-label={`${site.species_share.toFixed(1)}% of all species records`}
                >
                  <div
                    className="h-full rounded-full bg-canopy-600"
                    style={{ width: `${site.species_share}%` }}
                  />
                </div>

                {/* Conservation and data quality */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="inline-flex items-center gap-1 rounded-full bg-canopy-700/10 px-2 py-1 text-canopy-800">
                    <ShieldCheck size={13} />
                    {site.protected_count} protected
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-red-700">
                    <ShieldAlert size={13} />
                    {site.threatened_count} threatened
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-mist-100 px-2 py-1 text-ink-950/65">
                    <CheckCircle2 size={13} />
                    {percent(site.complete_count, site.species_count)}% complete
                  </span>
                </div>

                {/* Description */}
                <div className="mt-4 flex-1 border-t border-canopy-900/[0.07] pt-3.5">
                  <p className="line-clamp-2 text-sm leading-relaxed text-ink-950/60">
                    {site.description || 'No description provided.'}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New survey site"
        description="Sites are where researchers log species observations."
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Chréa foothills"
            required
          />
          <Input
            label="Code (optional)"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="SITE-014"
          />
          <div className="w-full min-w-0">
            <label
              htmlFor="site-description"
              className="mb-2 block text-sm font-medium text-ink-950/75"
            >
              Description (optional)
            </label>

            <textarea
              id="site-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Mixed oak forest, north-facing slope. The site includes a dense woodland area with seasonal streams."
              rows={4}
              className="w-full resize-none rounded-xl border border-canopy-900/12 bg-paper-0 px-4 py-3 text-[15px] text-ink-950 outline-none transition-all placeholder:text-ink-950/35 focus:border-canopy-600 focus:ring-2 focus:ring-canopy-600/10"
            />
          </div>
          {formError && <Alert>{formError}</Alert>}
          <Button type="submit" isLoading={createMutation.isPending} className="mt-1 w-full">
            Create site
          </Button>
        </form>
      </Modal>

      <DeleteSiteDialogs
        site={siteToDelete}
        onClose={() => setSiteToDelete(null)}
        onError={setDeleteError}
      />
    </>
  )
}

export default SitesPage
