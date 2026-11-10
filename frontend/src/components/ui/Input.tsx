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
  const errorId = error && inputId ? `${inputId}-error` : undefined

  return (
    <div className="w-full min-w-0">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-fg"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          'h-10 w-full min-w-0 rounded-xl border bg-surface px-3.5 text-sm text-fg outline-none transition-colors duration-150',
          'placeholder:text-fg-subtle',
          'focus:border-ring focus:ring-2 focus:ring-ring/20',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-muted',
          error
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-line-strong hover:border-fg-subtle/50',
          className,
        )}
        {...props}
      />

      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}