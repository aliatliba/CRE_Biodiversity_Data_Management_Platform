import { useRef, useState, type DragEvent } from 'react'
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { getErrorMessage } from '@/lib/errors'
import { useObjectUrl, useSitePhotoUrl } from '../hooks/useSitePhoto'
import { PHOTO_ACCEPT, preparePhoto } from '../lib/preparePhoto'
import type { PhotoChange, Site } from '../types'

interface SitePhotoPickerProps {
  /** The site being edited (its current photo is shown); omit when creating one. */
  site?: Pick<Site, 'id' | 'photo_updated_at'> | null
  change: PhotoChange
  onChange: (change: PhotoChange) => void
  disabled?: boolean
}

const NO_SITE = { id: 0, photo_updated_at: null }

/**
 * Landscape photo field of the site forms. Nothing is uploaded here: the chosen
 * photo is resized in the browser and handed to the form as a PhotoChange, which
 * the form applies when it is saved.
 */
export function SitePhotoPicker({ site, change, onChange, disabled = false }: SitePhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPortrait, setIsPortrait] = useState(false)

  const current = useSitePhotoUrl(site ?? NO_SITE)
  const newPhotoUrl = useObjectUrl(change.kind === 'set' ? change.photo : null)
  const hasCurrent = site?.photo_updated_at != null

  const showsPhoto = change.kind === 'set' || (change.kind === 'keep' && hasCurrent)
  const photoUrl = change.kind === 'set' ? newPhotoUrl : current.url
  const busy = disabled || isProcessing

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setIsProcessing(true)
    try {
      const { blob, width, height } = await preparePhoto(file)
      setIsPortrait(height > width)
      onChange({ kind: 'set', photo: blob })
    } catch (err) {
      setError(getErrorMessage(err, 'This image could not be used.'))
    } finally {
      setIsProcessing(false)
      // Choosing the same file again must still fire onChange.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    if (!busy) void handleFile(event.dataTransfer.files[0])
  }

  const pick = () => inputRef.current?.click()

  return (
    <div className="w-full min-w-0">
      <span className="mb-2 block text-sm font-medium text-fg-muted">Landscape photo (optional)</span>

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        className="hidden"
        aria-label="Landscape photo file"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {showsPhoto ? (
        <>
          <div
            className="relative aspect-[16/9] overflow-hidden rounded-xl border border-line bg-canopy-700/10"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Selected landscape photo" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 animate-pulse bg-canopy-700/10" aria-hidden="true" />
            )}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/60 backdrop-blur-sm">
                <LoadingSpinner className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="gap-2" onClick={pick} disabled={busy}>
              <RefreshCw size={14} />
              Change photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 !text-danger hover:!bg-danger/10"
              disabled={busy}
              onClick={() => {
                setError(null)
                onChange(hasCurrent ? { kind: 'remove' } : { kind: 'keep' })
              }}
            >
              <Trash2 size={14} />
              Remove
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={pick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          disabled={busy}
          className="flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong px-4 text-center text-fg-subtle transition-colors hover:border-primary/50 hover:text-canopy-700 disabled:pointer-events-none disabled:opacity-60"
        >
          {isProcessing ? <LoadingSpinner className="h-6 w-6" /> : <ImagePlus size={24} strokeWidth={1.75} />}
          <span className="text-sm font-semibold">{isProcessing ? 'Preparing photo…' : 'Choose a photo'}</span>
          <span className="text-xs">or drop it here · JPEG, PNG or WebP</span>
        </button>
      )}

      {change.kind === 'remove' && (
        <p className="mt-2 text-xs text-fg-subtle">
          The current photo will be removed when you save.{' '}
          <button
            type="button"
            className="cursor-pointer font-semibold text-canopy-700 hover:underline"
            onClick={() => onChange({ kind: 'keep' })}
          >
            Undo
          </button>
        </p>
      )}
      {change.kind === 'set' && isPortrait && (
        <p className="mt-2 text-xs text-fg-subtle">
          Wide (landscape) photos fit best: this one will be cropped top and bottom.
        </p>
      )}
      {error && <Alert className="mt-2">{error}</Alert>}
    </div>
  )
}
