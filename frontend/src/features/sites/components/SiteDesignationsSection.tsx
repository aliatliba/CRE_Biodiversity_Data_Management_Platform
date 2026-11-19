import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, ExternalLink, Plus, X } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'
import * as siteService from '../services/siteService'
import type { Designation, Site } from '../types'
import { TILE_CLASS } from './DesignationTiles'

interface SiteDesignationsSectionProps {
  site: Site
  isAdmin: boolean
}

const byOrder = (a: Designation, b: Designation) => a.sort_order - b.sort_order

/**
 * "Designations & labels" on the site page. Everyone sees the logos; admins can add
 * and remove them. Changes show at once (optimistic) and are rolled back on failure.
 * Hidden for non-admins when the site has no designation.
 */
export function SiteDesignationsSection({ site, isAdmin }: SiteDesignationsSectionProps) {
  const queryClient = useQueryClient()
  const siteKey = queryKeys.site(site.id)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [toRemove, setToRemove] = useState<Designation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const catalogQuery = useQuery({
    queryKey: queryKeys.designations,
    queryFn: siteService.listDesignations,
    enabled: isAdmin,
    staleTime: Infinity, // the catalog only changes with a deploy
  })

  const designations = site.designations ?? []
  const assigned = new Set(designations.map((d) => d.id))
  const available = (catalogQuery.data ?? []).filter((d) => !assigned.has(d.id))

  /** Apply a change to the cached site at once; returns the previous value for rollback. */
  async function optimistic(update: (current: Designation[]) => Designation[]) {
    await queryClient.cancelQueries({ queryKey: siteKey })
    const previous = queryClient.getQueryData<Site>(siteKey)
    if (previous) {
      queryClient.setQueryData<Site>(siteKey, {
        ...previous,
        designations: update(previous.designations ?? []).sort(byOrder),
      })
    }
    return { previous }
  }

  function rollback(context: { previous?: Site } | undefined) {
    if (context?.previous) queryClient.setQueryData(siteKey, context.previous)
  }

  function settle() {
    // The site page and the site cards (list) both show designations.
    void queryClient.invalidateQueries({ queryKey: queryKeys.sites })
  }

  const addMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await siteService.addSiteDesignation(site.id, id)
    },
    onMutate: (ids: string[]) => {
      setError(null)
      const added = (catalogQuery.data ?? []).filter((d) => ids.includes(d.id))
      setIsAddOpen(false)
      setSelected([])
      return optimistic((current) => [...current.filter((d) => !ids.includes(d.id)), ...added])
    },
    onError: (err, _ids, context) => {
      rollback(context)
      setError(getErrorMessage(err, 'Could not add the designation.'))
    },
    onSettled: settle,
  })

  const removeMutation = useMutation({
    mutationFn: (designation: Designation) =>
      siteService.removeSiteDesignation(site.id, designation.id),
    onMutate: (designation: Designation) => {
      setError(null)
      setToRemove(null)
      return optimistic((current) => current.filter((d) => d.id !== designation.id))
    },
    onError: (err, designation, context) => {
      rollback(context)
      setError(getErrorMessage(err, `Could not remove ${designation.name_en}.`))
    },
    onSettled: settle,
  })

  if (!isAdmin && designations.length === 0) return null

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  // The dialogs are rendered outside the Card: its glass backdrop-filter would
  // otherwise become the containing block of their fixed-position overlay.
  return (
    <>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-canopy-700" />
            <h2 className="font-display text-[15px] font-bold text-fg">Designations &amp; labels</h2>
          </div>
          {isAdmin && designations.length > 0 && (
            <Button
              variant="secondary"
              className="gap-1.5"
              onClick={() => setIsAddOpen(true)}
              disabled={catalogQuery.isSuccess && available.length === 0}
            >
              <Plus size={15} />
              Add designation
            </Button>
          )}
        </div>

        {error && <Alert className="mb-4">{error}</Alert>}

        {designations.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">No designation for this site yet.</p>
            <Button className="gap-1.5" onClick={() => setIsAddOpen(true)}>
              <Plus size={15} />
              Add designation
            </Button>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-x-5 gap-y-4">
            {designations.map((d) => (
              <li key={d.id} className="flex w-[120px] flex-col items-center text-center">
                <div className="relative">
                  <div className={cn(TILE_CLASS, 'h-[72px] w-[72px] p-2')}>
                    <img
                      src={d.icon}
                      alt={d.name_en}
                      width={72}
                      height={72}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setToRemove(d)}
                      aria-label={`Remove ${d.name_en}`}
                      title={`Remove ${d.name_en}`}
                      className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-fg-subtle shadow-sm transition-colors hover:border-danger/40 hover:text-danger"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium leading-snug text-fg">{d.name_en}</p>
                {d.official_url && (
                  <a
                    href={d.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-canopy-700 hover:underline"
                  >
                    Official website
                    <ExternalLink size={11} aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false)
          setSelected([])
        }}
        title="Add designation"
        description={`Designations and labels held by ${site.name}.`}
      >
        {catalogQuery.isPending ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : catalogQuery.isError ? (
          <Alert>{getErrorMessage(catalogQuery.error, 'Could not load the designations.')}</Alert>
        ) : available.length === 0 ? (
          <p className="text-sm text-fg-muted">This site already has every designation.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-1.5" aria-label="Available designations">
              {available.map((d) => (
                <li key={d.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-2.5 transition-colors hover:bg-surface-muted has-[:checked]:border-canopy-600/50 has-[:checked]:bg-primary-soft">
                    <input
                      type="checkbox"
                      checked={selected.includes(d.id)}
                      onChange={() => toggle(d.id)}
                      className="h-4 w-4 rounded border-line-strong text-canopy-700 focus:ring-ring"
                    />
                    <span className={cn(TILE_CLASS, 'h-10 w-10 p-1')}>
                      <img src={d.icon} alt="" width={40} height={40} className="h-full w-full object-contain" />
                    </span>
                    <span className="min-w-0 text-sm text-fg">{d.name_en}</span>
                  </label>
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              disabled={selected.length === 0}
              isLoading={addMutation.isPending}
              onClick={() => addMutation.mutate(selected)}
            >
              {selected.length > 1 ? `Add ${selected.length} designations` : 'Add designation'}
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={toRemove !== null}
        title={`Remove "${toRemove?.name_en ?? ''}"?`}
        description="The label will no longer be shown on this site."
        confirmLabel="Remove"
        destructive
        onConfirm={() => toRemove && removeMutation.mutate(toRemove)}
        onCancel={() => setToRemove(null)}
      />
    </>
  )
}
