import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-950/50">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-12 rounded-xl border bg-paper-0/70 px-4 text-[15px] text-ink-950 placeholder:text-ink-950/35',
            'transition-colors duration-150 outline-none',
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-mist-200 focus:border-canopy-600',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
