import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, description, children }: ModalProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-shell/50 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-mist-200/80 bg-paper-0 p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="modal-title" className="font-display text-xl font-semibold tracking-tight text-ink-950">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-ink-950/60">{description}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-950/40 transition-colors hover:bg-mist-100 hover:text-ink-950"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
