import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Plus, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { speciesUrl } from '@/lib/constants'
import { getErrorMessage } from '@/lib/errors'
import { getIucnTone } from '@/lib/iucn'
import { queryKeys } from '@/lib/queryKeys'
import * as protectedSpeciesService from '../services/protectedSpeciesService'
import type { ProtectedSpeciesEntry } from '../types'

const DEFAULT_PAGE_SIZE = 25

const EMPTY_FORM = { scientific_name: '', common_name_fr: '', taxon_group: '', source_reference: '' }

export function ProtectedSpeciesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const [group, setGroup] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // A new search or filter starts again from the first page.
  useEffect(() => setPage(1), [debouncedSearch, group])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [entryToRemove, setEntryToRemove] = useState<ProtectedSpeciesEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const listParams = {
    search: debouncedSearch || undefined,
    taxon_group: group || undefined,
    page,
    page_size: pageSize,
  }
  const query = useQuery({
    queryKey: queryKeys.protectedSpecies(listParams),
    queryFn: () => protectedSpeciesService.listProtectedSpecies(listParams),
    placeholderData: keepPreviousData,
  })
  const groupsQuery = useQuery({
    queryKey: queryKeys.protectedSpeciesGroups,
    queryFn: protectedSpeciesService.listTaxonGroups,
  })
  const groups = groupsQuery.data ?? []
  const groupTotal = groups.reduce((sum, g) => sum + g.count, 0)
  const entries = query.data?.items ?? []

  // Removing the last entry of the last page: step back to the new last page.
  const lastPage = query.data?.pages || 1
  useEffect(() => {
    if (query.isSuccess && page > lastPage) setPage(lastPage)
  }, [query.isSuccess, page, lastPage])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['protected-species'] })
    // The list drives Species.national_status, shown across the app.
    void queryClient.invalidateQueries({ queryKey: queryKeys.speciesAll })
    void queryClient.invalidateQueries({ queryKey: queryKeys.sites })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      protectedSpeciesService.addProtectedSpecies({
        scientific_name: form.scientific_name.trim(),
        common_name_fr: form.common_name_fr.trim() || undefined,
        taxon_group: form.taxon_group || undefined,
        source_reference: form.source_reference.trim() || undefined,
      }),
    onSuccess: () => {
      setIsModalOpen(false)
      setForm(EMPTY_FORM)
      invalidate()
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Could not add this species.')),
  })

  const removeMutation = useMutation({
    mutationFn: (entry: ProtectedSpeciesEntry) => protectedSpeciesService.removeProtectedSpecies(entry.id),
    onSuccess: () => {
      setEntryToRemove(null)
      invalidate()
    },
    onError: (err) => {
      setEntryToRemove(null)
      setActionError(getErrorMessage(err, 'Could not remove this entry.'))
    },
  })

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (!form.scientific_name.trim()) {
      setFormError('Scientific name is required.')
      return
    }
    createMutation.mutate()
  }

  const filtered = Boolean(debouncedSearch || group)

  return (
    <>
      <p className="mb-6 max-w-2xl text-sm text-fg-subtle">
        Taxa protected in Algeria by executive decrees n° 12-03 (plants and lichens) and n° 12-235
        (animals) of 2012, with every printed name checked against current nomenclature. A species
        logged under the current name or any older name of an entry is automatically marked{' '}
        <span className="font-semibold text-canopy-800">Protected</span>.
      </p>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, family or common name…"
            aria-label="Search protected list"
            wrapperClassName="sm:w-72"
          />
          <Select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            aria-label="Filter by group"
            className="sm:w-56"
          >
            <option value="">All groups{groupTotal ? ` (${groupTotal})` : ''}</option>
            {groups.map((g) => (
              <option key={g.taxon_group} value={g.taxon_group}>
                {g.taxon_group} ({g.count})
              </option>
            ))}
          </Select>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={16} />
            Add species
          </Button>
        )}
      </div>

      {actionError && <Alert className="mb-4">{actionError}</Alert>}

      {query.isPending && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {query.isError && (
        <ErrorState
          message={getErrorMessage(query.error, 'Could not load the protected species list.')}
          onRetry={() => query.refetch()}
        />
      )}

      {query.isSuccess && entries.length === 0 && (
        <EmptyState
          icon={<ShieldCheck size={22} />}
          title={filtered ? 'No matching species' : 'Nothing on the protected list yet'}
          description={
            filtered
              ? 'Try a different search term or group.'
              : isAdmin
                ? 'Add a scientific name to have it flagged as Protected whenever it\'s logged.'
                : 'Your administrator hasn\'t added any species to this list yet.'
          }
        />
      )}

      {query.isSuccess && entries.length > 0 && (
        <div className={query.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <div className="overflow-x-auto rounded-2xl glass">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <th className="px-4 py-2.5">Species</th>
                  <th className="px-4 py-2.5">Group</th>
                  <th className="px-4 py-2.5">IUCN</th>
                  <th className="px-4 py-2.5">Recorded</th>
                  {isAdmin && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="stagger-in">
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium italic text-canopy-900">{entry.scientific_name}</p>
                      {(entry.common_name_fr || entry.common_name_ar) && (
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {entry.common_name_fr}
                          {entry.common_name_fr && entry.common_name_ar && ' · '}
                          {entry.common_name_ar && (
                            <span lang="ar" dir="rtl">
                              {entry.common_name_ar}
                            </span>
                          )}
                        </p>
                      )}
                      {entry.printed_names && entry.printed_names.length > 0 && (
                        <p className="mt-0.5 text-xs text-fg-subtle">
                          In decree as{' '}
                          <span className="italic">{entry.printed_names.join('; ')}</span>
                        </p>
                      )}
                      {entry.synonyms && entry.synonyms.length > 0 && (
                        <p className="mt-0.5 text-xs text-fg-subtle">
                          Also matches <span className="italic">{entry.synonyms.join(', ')}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-fg">{entry.taxon_group ?? '—'}</p>
                      {entry.family && <p className="mt-0.5 text-xs text-fg-subtle">{entry.family}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      {entry.iucn_status && (
                        <Badge tone={getIucnTone(entry.iucn_status)}>{entry.iucn_status}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {entry.recorded_species_id ? (
                        <Link
                          to={speciesUrl(entry.recorded_species_id)}
                          className="text-xs font-medium text-canopy-700 hover:underline"
                        >
                          View species
                        </Link>
                      ) : (
                        <span className="text-xs text-fg-subtle">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right">
                        {!entry.decree && (
                          <button
                            onClick={() => {
                              setActionError(null)
                              setEntryToRemove(entry)
                            }}
                            aria-label={`Remove ${entry.scientific_name}`}
                            className="rounded-lg p-2 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          <Pagination
            className="mt-5"
            page={page}
            pages={lastPage}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add to protected list"
        description="Any species logged with this exact scientific name will be marked Protected."
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Scientific name"
            value={form.scientific_name}
            onChange={(e) => setForm((f) => ({ ...f, scientific_name: e.target.value }))}
            placeholder="Quercus afares"
            required
          />
          <Input
            label="Common name (optional)"
            value={form.common_name_fr}
            onChange={(e) => setForm((f) => ({ ...f, common_name_fr: e.target.value }))}
            placeholder="Chêne afarès"
          />
          <Select
            label="Group (optional)"
            name="taxon_group"
            value={form.taxon_group}
            onChange={(e) => setForm((f) => ({ ...f, taxon_group: e.target.value }))}
          >
            <option value="">—</option>
            {groups.map((g) => (
              <option key={g.taxon_group} value={g.taxon_group}>
                {g.taxon_group}
              </option>
            ))}
          </Select>
          <Input
            label="Source reference (optional)"
            value={form.source_reference}
            onChange={(e) => setForm((f) => ({ ...f, source_reference: e.target.value }))}
            placeholder="National decree, IUCN listing, etc."
          />
          {formError && <Alert>{formError}</Alert>}
          <Button type="submit" isLoading={createMutation.isPending} className="mt-1 w-full">
            Add to list
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={entryToRemove !== null}
        title={`Remove "${entryToRemove?.scientific_name ?? ''}"?`}
        description="It will no longer be flagged as Protected when logged."
        confirmLabel="Remove"
        destructive
        isLoading={removeMutation.isPending}
        onConfirm={() => entryToRemove && removeMutation.mutate(entryToRemove)}
        onCancel={() => setEntryToRemove(null)}
      />
    </>
  )
}

export default ProtectedSpeciesPage
