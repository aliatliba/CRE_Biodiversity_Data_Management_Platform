import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, className, id, children, ...props }: SelectProps) {
  const selectId = id ?? props.name
  const select = (
    <select
      id={selectId}
      className={cn(
        'h-10 rounded-xl border border-line-strong bg-surface px-3 text-sm text-fg outline-none transition-colors duration-150 hover:border-fg-subtle/50 focus:border-ring focus:ring-2 focus:ring-ring/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )

  if (!label) return select

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="text-xs font-medium text-fg-muted"
      >
        {label}
      </label>
      {select}
    </div>
  )
}
