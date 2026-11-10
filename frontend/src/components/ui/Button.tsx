import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary bg-[image:var(--gradient-primary)] text-on-primary shadow-[0_8px_22px_-10px_var(--color-glow)] hover:shadow-[0_12px_30px_-10px_var(--color-glow)] hover:brightness-110',
  secondary: 'border border-line-strong bg-surface/70 text-fg backdrop-blur-md hover:border-primary/40 hover:bg-surface',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  danger: 'bg-danger text-on-danger shadow-[0_8px_22px_-10px_rgba(220,38,38,0.55)] hover:bg-danger-hover',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

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
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[color,background-color,border-color,box-shadow,filter,transform] duration-200 ease-out',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.97]',
        VARIANTS[variant],
        SIZES[size],
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