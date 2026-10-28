import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface-muted/60 px-6 py-14 text-center">
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-fg">{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action}
    </div>
  )
}
