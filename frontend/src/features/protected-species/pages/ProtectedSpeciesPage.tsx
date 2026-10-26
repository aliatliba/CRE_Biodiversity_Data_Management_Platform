import { useEffect, useState, type FormEvent } from 'react'
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
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/lib/errors'
import { getIucnTone } from '@/lib/iucn'
import { queryKeys } from '@/lib/queryKeys'
import * as protectedSpeciesService from '../services/protectedSpeciesService'
import type { ProtectedSpeciesEntry } from '../types'

const DEFAULT_PAGE_SIZE = 25

export function ProtectedSpeciesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // A new search starts again from the first page.
  useEffect(() => setPage(1), [debouncedSearch])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ scientific_name: '', source_reference: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [entryToRemove, setEntryToRemove] = useState<ProtectedSpeciesEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const listParams = { search: debouncedSearch || undefined, page, page_size: pageSize }
  const query = useQuery({
    queryKey: queryKeys.protectedSpecies(listParams),
    queryFn: () => protectedSpeciesService.listProtectedSpecies(listParams),
    placeholderData: keepPreviousData,
  })
  const entries = query.data?.items ?? []

  // Removing the last entry of the last page: step back to the new last page.
  const lastPage = query.data?.pages || 1
  useEffect(() => {
    if (query.isSuccess && page > lastPage) setPage(lastPage)
  }, [query.isSuccess, page, lastPage])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['protected-species'] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      protectedSpeciesService.addProtectedSpecies({
        scientific_name: form.scientific_name.trim(),
        source_reference: form.source_reference.trim() || undefined,
      }),
    onSuccess: () => {
      setIsModalOpen(false)
      setForm({ scientific_name: '', source_reference: '' })
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

  return (
    <>
      <p className="mb-6 max-w-xl text-sm text-ink-950/55">
        Species on this list are automatically marked{' '}
        <span className="font-semibold text-canopy-800">Protected</span> under national status the
        moment they're logged — this reference list drives that check.
      </p>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search protected list…"
          aria-label="Search protected list"
          wrapperClassName="max-w-xs"
        />
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
          title={debouncedSearch ? 'No matching species' : 'Nothing on the protected list yet'}
          description={
            debouncedSearch
              ? 'Try a different search term.'
              : isAdmin
                ? 'Add a scientific name to have it flagged as Protected whenever it\'s logged.'
                : 'Your administrator hasn\'t added any species to this list yet.'
          }
        />
      )}

      {query.isSuccess && entries.length > 0 && (
        <div className={query.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <div className="overflow-hidden rounded-2xl border border-canopy-900/10 bg-paper-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-canopy-900/[0.08] bg-mist-100/50 text-xs font-semibold uppercase tracking-wide text-ink-950/50">
                  <th className="px-5 py-3">Scientific name</th>
                  <th className="px-5 py-3">IUCN</th>
                  <th className="px-5 py-3">Added</th>
                  {isAdmin && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-canopy-900/[0.05] last:border-0">
                    <td className="px-5 py-3.5 font-medium italic text-canopy-900">{entry.scientific_name}</td>
                    <td className="px-5 py-3.5">
                      {entry.iucn_status && (
                        <Badge tone={getIucnTone(entry.iucn_status)}>{entry.iucn_status}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-950/50">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setActionError(null)
                            setEntryToRemove(entry)
                          }}
                          aria-label={`Remove ${entry.scientific_name}`}
                          className="rounded-full p-1.5 text-ink-950/30 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
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
