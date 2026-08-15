import { Link } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Species } from '../types'

interface DuplicateSpeciesDialogProps {
  isOpen: boolean
  species: Species | null
  onClose: () => void
  onAssociate: () => void
  isAssociating: boolean
}

export function DuplicateSpeciesDialog({
  isOpen,
  species,
  onClose,
  onAssociate,
  isAssociating,
}: DuplicateSpeciesDialogProps) {
  if (!species) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Already in the catalogue"
      description={`"${species.scientific_name}" has already been logged.`}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-canopy-900/10 bg-mist-100/50 p-4">
          <p className="font-display italic font-semibold text-canopy-950">{species.scientific_name}</p>
          {species.common_name && <p className="text-sm text-ink-950/55">{species.common_name}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {species.iucn_status && <Badge tone="warning">{species.iucn_status}</Badge>}
            <Badge tone={species.national_status === 'Protected' ? 'accent' : 'neutral'}>
              {species.national_status}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-ink-950/60">
          You can link this existing record to your site instead of creating a duplicate entry.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onAssociate} isLoading={isAssociating} className="flex-1">
            Link to this site
          </Button>
        </div>

        <Link
          to={`/species/${species.id}`}
          className="text-center text-xs font-medium text-canopy-700 underline underline-offset-4"
        >
          View full record
        </Link>
      </div>
    </Modal>
  )
}
