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
        'h-11 rounded-xl border border-mist-200 bg-paper-0 px-3.5 text-sm text-ink-950/80 outline-none transition-colors focus:border-canopy-600',
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
        className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/70"
      >
        {label}
      </label>
      {select}
    </div>
  )
}
