import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-canopy-900/15 bg-mist-100/40 px-6 py-16 text-center">
      {icon && <div className="text-canopy-600">{icon}</div>}
      <p className="font-display text-base font-semibold text-canopy-950">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-950/55">{description}</p>}
      {action}
    </div>
  )
}
