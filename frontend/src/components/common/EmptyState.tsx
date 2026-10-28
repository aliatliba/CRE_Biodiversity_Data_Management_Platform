import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 glass rounded-2xl !border-dashed px-6 py-14 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-on-primary shadow-[0_10px_24px_-10px_var(--color-glow)]" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-fg">{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action}
    </div>
  )
}
