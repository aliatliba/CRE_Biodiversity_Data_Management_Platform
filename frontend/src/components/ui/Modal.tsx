import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
}: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-canopy-900/10 bg-paper-0 p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="font-display text-lg font-bold text-canopy-950"
            >
              {title}
            </h2>

            {description && (
              <p
                id="modal-description"
                className="mt-1.5 text-sm leading-relaxed text-ink-950/55"
              >
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-ink-950/45 transition-colors hover:bg-mist-100 hover:text-ink-950"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}