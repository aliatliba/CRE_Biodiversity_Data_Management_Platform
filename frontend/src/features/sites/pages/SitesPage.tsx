import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { SearchInput } from '@/components/ui/SearchInput'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/lib/errors'
import { siteUrl } from '@/lib/constants'
import { queryKeys } from '@/lib/queryKeys'
import * as siteService from '../services/siteService'
import { DeleteSiteDialogs } from '../components/DeleteSiteDialogs'
import type { Site } from '../types'

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
  const sites = query.data ?? []

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
          {sites.map((site) => (
            <Link key={site.id} to={siteUrl(site.id)}>
              <Card className="flex h-full min-h-[210px] flex-col transition-colors hover:border-canopy-700/30 hover:bg-mist-100/40">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <MapPin
                      size={17}
                      className="mt-0.5 shrink-0 text-canopy-700"
                    />

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

                {/* Description */}
                <div className="mt-4 flex-1 border-t border-canopy-900/[0.07] pt-3.5">
                  <p className="line-clamp-4 text-sm leading-relaxed text-ink-950/60">
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
