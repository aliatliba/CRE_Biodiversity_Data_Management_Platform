import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({
  label,
  error,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? props.name

  return (
    <div className="w-full min-w-0">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-medium text-ink-950/75"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={cn(
          'h-12 w-full min-w-0 rounded-xl border bg-paper-0 px-4 text-[15px] text-ink-950 outline-none transition-all',
          'placeholder:text-ink-950/35',
          'focus:border-canopy-600 focus:ring-2 focus:ring-canopy-600/10',
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/10'
            : 'border-canopy-900/12',
          className,
        )}
        {...props}
      />

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}