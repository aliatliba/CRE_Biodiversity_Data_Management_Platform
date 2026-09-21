import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const variantClasses =
    variant === 'primary'
      ? 'bg-canopy-900 text-white shadow-sm hover:bg-canopy-800'
      : variant === 'secondary'
        ? 'border border-canopy-900/15 bg-paper-0 text-canopy-900 hover:bg-mist-100'
        : 'text-ink-950/65 hover:bg-mist-100 hover:text-canopy-900'

  const sizeClasses =
    size === 'lg'
      ? 'h-13 px-7 text-base'
      : 'h-11 px-5 text-sm'

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-tight transition-all duration-200 ease-out',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.98]',
        variantClasses,
        sizeClasses,
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}