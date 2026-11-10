import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { ArrowLeft, Edit2, Leaf, MapPin, Search, ShieldCheck, Trash2 } from 'lucide-react'

import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { AnimatedBarChart } from '@/components/charts/AnimatedBarChart'
import { AnimatedPieChart } from '@/components/charts/AnimatedPieChart'
import { ChartCard } from '@/components/charts/ChartCard'
import { useAuth } from '@/hooks/useAuth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toChartData, toCompositionData, toIucnChartData } from '@/lib/chartData'
import { ROUTES, speciesListUrl } from '@/lib/constants'
import { getErrorMessage } from '@/lib/errors'
import { IUCN_COLORS, THREATENED_STATUSES_PARAM } from '@/lib/iucn'
import { queryKeys } from '@/lib/queryKeys'

import * as dashboardService from '@/features/dashboard/services/dashboardService'
import { StatCard } from '@/components/common/StatCard'

import * as siteService from '../services/siteService'
import { DeleteSiteDialogs } from '../components/DeleteSiteDialogs'

import * as speciesService from '@/features/species/services/speciesService'
import { SpeciesTable } from '@/features/species/components/SpeciesTable'
import type { SpeciesListItem } from '@/features/species/types'

const PAGE_SIZE = 15

export function SiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const siteId = Number(id)
  const validId = Number.isFinite(siteId)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', code: '', description: '' })
  const [editError, setEditError] = useState<string | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [speciesToRemove, setSpeciesToRemove] = useState<SpeciesListItem | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const siteQuery = useQuery({
    queryKey: queryKeys.site(siteId),
    queryFn: () => siteService.getSite(siteId),
    enabled: validId,
  })

  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard(siteId),
    queryFn: () => dashboardService.getStats(siteId),
    enabled: validId,
  })

  // One species fetch for the table; the page and search params are part of the key.
  const speciesParams = {
    site_id: siteId,
    search: debouncedSearch || undefined,
    page,
    page_size: PAGE_SIZE,
  }
  const speciesQuery = useQuery({
    queryKey: queryKeys.species(speciesParams),
    queryFn: () => speciesService.listSpecies(speciesParams),
    enabled: validId,
    placeholderData: keepPreviousData,
  })

  // Who recorded each link: researchers may only unlink species they recorded.
  const linksQuery = useQuery({
    queryKey: queryKeys.siteSpeciesLinks(siteId),
    queryFn: () => speciesService.listSiteSpeciesLinks(siteId),
    enabled: validId && !isAdmin,
  })
  const recorderBySpecies = new Map(
    (linksQuery.data ?? []).map((link) => [link.species_id, link.recorded_by]),
  )
  const canRemoveSpecies = (sp: SpeciesListItem) =>
    isAdmin || (user != null && recorderBySpecies.get(sp.id) === user.id)

  const site = siteQuery.data
  const stats = statsQuery.data
  const species = speciesQuery.data?.items ?? []

  const isPending = siteQuery.isPending || statsQuery.isPending
  const loadError = siteQuery.error ?? statsQuery.error

  function refetchAll() {
    void siteQuery.refetch()
    void statsQuery.refetch()
    void speciesQuery.refetch()
  }

  function openEdit() {
    if (!site) return
    setEditForm({
      name: site.name,
      code: site.code ?? '',
      description: site.description ?? '',
    })
    setEditError(null)
    setIsEditOpen(true)
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      siteService.updateSite(siteId, {
        name: editForm.name.trim(),
        code: editForm.code.trim() || undefined,
        description: editForm.description.trim() || undefined,
      }),
    onSuccess: () => {
      setIsEditOpen(false)
      void queryClient.invalidateQueries({ queryKey: queryKeys.sites })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(siteId) })
    },
    onError: (err) => setEditError(getErrorMessage(err, 'Could not update site.')),
  })

  const removeMutation = useMutation({
    mutationFn: (sp: SpeciesListItem) => speciesService.removeSpeciesFromSite(siteId, sp.id),
    onSuccess: () => {
      // Removing the last row of a page would leave an empty page behind.
      if (species.length === 1 && page > 1) setPage(page - 1)
      void queryClient.invalidateQueries({ queryKey: queryKeys.speciesAll })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sites })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(siteId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
    },
    onError: (err) => {
      setRemoveError(getErrorMessage(err, 'Could not remove this species from the site.'))
      void speciesQuery.refetch()
    },
    onSettled: () => setSpeciesToRemove(null),
  })

  function handleEdit(event: FormEvent) {
    event.preventDefault()
    setEditError(null)
    updateMutation.mutate()
  }

  const compositionData = toCompositionData(stats?.biodiversity_composition)
  const iucnData = toIucnChartData(stats?.iucn_breakdown)
  const statusData = toChartData(stats?.status_breakdown)
  const familyData =
    stats && stats.total_species > 0
      ? stats.top_families.map((family) => ({ label: family.family, value: family.count }))
      : []

  return (
    <>
      <Link
        to={ROUTES.sites}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-canopy-700 hover:underline"
      >
        <ArrowLeft size={15} />
        Back to sites
      </Link>

      {isPending && validId && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {(!validId || (loadError && !site)) && (
        <ErrorState
          message={getErrorMessage(loadError, 'Could not load this site.')}
          onRetry={refetchAll}
        />
      )}

      {deleteError && <Alert className="mb-4">{deleteError}</Alert>}

      {site && stats && (
        <div className="flex flex-col gap-6">

          {/* -------------------------------------------------
              SITE HEADER
          ------------------------------------------------- */}

          <Card className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-canopy-700">
                <MapPin size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Survey site
                </span>
              </div>

              <h1 className="mt-1 break-words font-display text-2xl font-bold text-fg">
                {site.name}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
                {site.description || 'No description provided.'}
              </p>
            </div>

            {isAdmin && (
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={openEdit}
                >
                  <Edit2 size={15} />
                  Edit
                </Button>

                <Button
                  variant="ghost"
                  className="gap-2 !text-danger hover:!bg-danger/10"
                  onClick={() => {
                    setDeleteError(null)
                    setIsDeleteOpen(true)
                  }}
                >
                  <Trash2 size={15} />
                  Delete
                </Button>
              </div>
            )}
          </Card>

          {/* -------------------------------------------------
              SUMMARY STAT CARDS
          ------------------------------------------------- */}

          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Species at site"
              value={stats.total_species}
              icon={Leaf}
              delay={0}
            />

            <Link
              to={speciesListUrl({ site_id: siteId, national_status: 'Protected' })}
              className="block rounded-xl transition-transform duration-200 hover:-translate-y-0.5"
            >
              <StatCard
                label="Protected species"
                value={stats.status_breakdown['Protected'] ?? 0}
                icon={ShieldCheck}
                delay={0.05}
              />
            </Link>

            <Link
              to={speciesListUrl({ site_id: siteId, iucn_status: THREATENED_STATUSES_PARAM })}
              className="block rounded-xl transition-transform duration-200 hover:-translate-y-0.5"
            >
              <StatCard
                label="IUCN threatened species - NT · VU · EN · CR"
                value={stats.iucn_threatened_species}
                icon={ShieldCheck}
                delay={0.1}
              />
            </Link>
          </div>

          {/* -------------------------------------------------
              DASHBOARD-STYLE ANALYTICS
          ------------------------------------------------- */}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Biodiversity composition"
              subtitle="Species composition recorded at this site"
              delay={0.1}
            >
              <AnimatedPieChart data={compositionData} delay={0.15} showValues />
            </ChartCard>

            <ChartCard
              title="IUCN status breakdown"
              subtitle="Conservation status of species at this site"
              delay={0.15}
            >
              <AnimatedPieChart data={iucnData} delay={0.2} showValues colorMap={IUCN_COLORS} />
            </ChartCard>

            <ChartCard
              title="National status"
              subtitle="Protected and non-protected species at this site"
              delay={0.2}
            >
              <AnimatedPieChart data={statusData} delay={0.25} showValues />
            </ChartCard>

            <ChartCard
              title="Top families"
              subtitle="Number of species in each family"
              delay={0.25}
            >
              <AnimatedBarChart
                data={familyData}
                colors={[
                  '#3C8D69',
                  '#47A377',
                  '#52BA85',
                  '#63B98D',
                  '#77C99E',
                  '#8AD2AD',
                  '#9BD9BA',
                  '#ABDFC4',
                  '#BAE4CC',
                  '#C7E9D4',
                ]}
                delay={0.3}
              />
            </ChartCard>
          </div>

          {/* -------------------------------------------------
              SPECIES TABLE
          ------------------------------------------------- */}

          <Card>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-fg">
                  Species at this site
                </h2>

                <p className="mt-1 text-xs text-fg-subtle">
                  Species records associated with {site.name}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchInput
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search by scientific or common name…"
                  aria-label="Search species at this site"
                  wrapperClassName="sm:w-72"
                />

                <Link to={ROUTES.addSpecies}>
                  <Button size="md" className="w-full gap-2 sm:w-auto">
                    <Leaf size={15} />
                    Log species
                  </Button>
                </Link>
              </div>
            </div>

            {removeError && <Alert className="mb-4">{removeError}</Alert>}

            {speciesQuery.isError ? (
              <ErrorState
                message={getErrorMessage(speciesQuery.error, 'Could not load species.')}
                onRetry={() => speciesQuery.refetch()}
              />
            ) : species.length === 0 && !speciesQuery.isPending && debouncedSearch ? (
              <EmptyState
                icon={<Search size={22} />}
                title="No matching species"
                description={`No species at this site match "${debouncedSearch}".`}
                action={
                  <Button variant="secondary" onClick={() => setSearch('')}>
                    Clear search
                  </Button>
                }
              />
            ) : species.length === 0 && !speciesQuery.isPending ? (
              <EmptyState
                icon={<Leaf size={22} />}
                title="No species at this site"
                description="Log the first species observation for this site."
              />
            ) : (
              <>
                <SpeciesTable
                  species={species}
                  canRemove={canRemoveSpecies}
                  onRemove={(sp) => {
                    setRemoveError(null)
                    setSpeciesToRemove(sp)
                  }}
                />

                <Pagination
                  className="mt-5"
                  page={page}
                  pages={speciesQuery.data?.pages || 1}
                  total={speciesQuery.data?.total ?? 0}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </>
            )}
          </Card>
        </div>
      )}

      {/* -------------------------------------------------
          EDIT SITE MODAL
      ------------------------------------------------- */}

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit survey site"
        description="Update site name, code, or description."
      >
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) =>
              setEditForm((form) => ({
                ...form,
                name: e.target.value,
              }))
            }
            required
          />

          <Input
            label="Code (optional)"
            value={editForm.code}
            onChange={(e) =>
              setEditForm((form) => ({
                ...form,
                code: e.target.value,
              }))
            }
          />

          <Input
            label="Description (optional)"
            value={editForm.description}
            onChange={(e) =>
              setEditForm((form) => ({
                ...form,
                description: e.target.value,
              }))
            }
          />

          {editError && <Alert>{editError}</Alert>}

          <Button
            type="submit"
            isLoading={updateMutation.isPending}
            className="w-full"
          >
            Save changes
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={speciesToRemove !== null}
        title={`Remove "${speciesToRemove?.scientific_name ?? 'this species'}" from ${site?.name ?? 'this site'}?`}
        description="Only the link to this site is removed. The species record and its links to other sites are kept."
        confirmLabel="Remove from site"
        destructive
        isLoading={removeMutation.isPending}
        onConfirm={() => speciesToRemove && removeMutation.mutate(speciesToRemove)}
        onCancel={() => setSpeciesToRemove(null)}
      />

      <DeleteSiteDialogs
        site={isDeleteOpen && site ? site : null}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={() => navigate(ROUTES.sites)}
        onError={setDeleteError}
      />
    </>
  )
}

export default SiteDetailPage