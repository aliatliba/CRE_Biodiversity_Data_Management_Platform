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
import { formatPercent } from '@/lib/percent'
import { siteUrl } from '@/lib/constants'
import { queryKeys } from '@/lib/queryKeys'
import * as siteService from '../services/siteService'
import { DesignationTiles } from '../components/DesignationTiles'
import { DeleteSiteDialogs } from '../components/DeleteSiteDialogs'
import { SitePhotoBanner } from '../components/SitePhotoBanner'
import { SitePhotoPicker } from '../components/SitePhotoPicker'
import { SHOW_PHOTO_ON_SITE_CARDS } from '../config'
import { savePhotoChange } from '../hooks/useSitePhoto'
import type { PhotoChange, Site, SiteListItem } from '../types'

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
  return whole > 0 ? (part / whole) * 100 : 0
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
  const [photoChange, setPhotoChange] = useState<PhotoChange>({ kind: 'keep' })
  const [formError, setFormError] = useState<string | null>(null)
  // The site was created but its photo upload failed (the form is closed by then).
  const [photoNotice, setPhotoNotice] = useState<string | null>(null)
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
  // Placeholders keep the cards of a row aligned, but only when there is a photo to align with.
  const showPhotoBanners = SHOW_PHOTO_ON_SITE_CARDS && sites.some((s) => s.photo_updated_at != null)

  const createMutation = useMutation({
    mutationFn: async () => {
      const site = await siteService.createSite({
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
      })
      // The site exists from here on: a failed upload must not keep the form open,
      // or submitting again would try to create the site a second time.
      try {
        await savePhotoChange(queryClient, site.id, photoChange)
        return { site, photoError: null }
      } catch (err) {
        return { site, photoError: getErrorMessage(err, 'Could not upload the photo.') }
      }
    },
    onSuccess: ({ site, photoError }) => {
      setIsModalOpen(false)
      setForm({ name: '', code: '', description: '' })
      setPhotoChange({ kind: 'keep' })
      if (photoError) {
        setPhotoNotice(
          `"${site.name}" was created, but its photo could not be uploaded (${photoError}). Open the site and use Edit to add it.`,
        )
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.sites })
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Could not create site.')),
  })

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setPhotoNotice(null)
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
      {photoNotice && <Alert tone="warning" className="mb-4">{photoNotice}</Alert>}

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
        <div className="stagger-in grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site, index) => {
            // 0% statistics are left out of the card (formatPercent returns null).
            const share = formatPercent(site.species_share, 1)
            const complete = formatPercent(percent(site.complete_count, site.species_count))
            return (
            <Link key={site.id} to={siteUrl(site.id)} className="rounded-2xl">
              <Card className="lift flex h-full min-h-[210px] flex-col">
                {showPhotoBanners && (
                  <SitePhotoBanner
                    site={site}
                    placeholder
                    className="-mx-4 -mt-4 mb-4 h-36 rounded-t-2xl lg:-mx-5 lg:-mt-5"
                  />
                )}

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className="mt-0.5 shrink-0 rounded-md bg-canopy-700/10 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-canopy-700"
                      title={debouncedSearch ? 'Rank among matching sites' : 'Rank by number of species'}
                    >
                      #{index + 1}
                    </span>

                    <h3 className="min-w-0 break-words font-display text-[15px] font-bold leading-snug text-fg">
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
                      className="shrink-0 rounded-lg p-2 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <DesignationTiles designations={site.designations} className="mt-3" />

                {/* Species count and share of all records */}
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="font-display text-3xl font-bold leading-none tabular-nums text-fg">
                    {site.species_count}
                    <span className="ml-1.5 text-sm font-medium text-fg-subtle">
                      species
                    </span>
                  </p>
                  {share && (
                    <span className="text-sm font-semibold tabular-nums text-canopy-700">
                      {share}
                    </span>
                  )}
                </div>
                {share && (
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-canopy-900/[0.08]"
                    aria-label={`${share} of all species records`}
                  >
                    <div
                      className="h-full rounded-full bg-canopy-600"
                      style={{ width: `${site.species_share}%` }}
                    />
                  </div>
                )}

                {/* Conservation and data quality */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="inline-flex items-center gap-1 rounded-full bg-canopy-700/10 px-2 py-1 text-canopy-800">
                    <ShieldCheck size={13} />
                    {site.protected_count} protected
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-danger">
                    <ShieldAlert size={13} />
                    {site.threatened_count} threatened
                  </span>
                  {complete && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-mist-100 px-2 py-1 text-fg-muted">
                      <CheckCircle2 size={13} />
                      {complete} complete
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="mt-4 flex-1 border-t border-line pt-3.5">
                  <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">
                    {site.description || 'No description provided.'}
                  </p>
                </div>
              </Card>
            </Link>
            )
          })}
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
              className="mb-2 block text-sm font-medium text-fg-muted"
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
              className="w-full resize-none rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm text-fg outline-none transition-all placeholder:text-fg-subtle focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <SitePhotoPicker
            change={photoChange}
            onChange={setPhotoChange}
            disabled={createMutation.isPending}
          />
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
