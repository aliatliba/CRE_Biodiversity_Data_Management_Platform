import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'

import * as siteService from '../services/siteService'
import type { Site } from '../types'

interface DeleteSiteDialogsProps {
  /** The site being deleted; `null` keeps the dialogs closed. */
  site: Pick<Site, 'id' | 'name'> | null
  onClose: () => void
  onDeleted?: () => void
  onError: (message: string) => void
}

/**
 * Two-step site deletion: a normal confirmation, then (if the backend answers
 * 409 because species are linked) a second one that forces the delete.
 */
export function DeleteSiteDialogs({ site, onClose, onDeleted, onError }: DeleteSiteDialogsProps) {
  const queryClient = useQueryClient()
  const [forceStep, setForceStep] = useState(false)

  function close() {
    setForceStep(false)
    onClose()
  }

  const mutation = useMutation({
    mutationFn: (force: boolean) => siteService.deleteSite(site!.id, force),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sites })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.speciesAll })
      close()
      onDeleted?.()
    },
    onError: (err, force) => {
      if (!force && axios.isAxiosError(err) && err.response?.status === 409) {
        setForceStep(true)
        return
      }
      close()
      onError(getErrorMessage(err, 'Could not delete site.'))
    },
  })

  return (
    <>
      <ConfirmDialog
        isOpen={site !== null && !forceStep}
        title={`Delete "${site?.name ?? 'this site'}"?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        isLoading={mutation.isPending}
        onConfirm={() => mutation.mutate(false)}
        onCancel={close}
      />

      <ConfirmDialog
        isOpen={site !== null && forceStep}
        title="Delete site and its species links?"
        description="This site has species linked to it. Deleting it will remove those links as well."
        confirmLabel="Delete anyway"
        destructive
        isLoading={mutation.isPending}
        onConfirm={() => mutation.mutate(true)}
        onCancel={close}
      />
    </>
  )
}
