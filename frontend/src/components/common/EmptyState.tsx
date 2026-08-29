import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-mist-200 bg-paper-50 px-6 py-16 text-center">
      {icon && <div className="text-canopy-600">{icon}</div>}
      <p className="font-display text-lg font-medium text-ink-950">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-950/55">{description}</p>}
      {action}
    </div>
  )
}
