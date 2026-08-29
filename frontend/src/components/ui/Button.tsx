import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-canopy-700 text-paper-0 hover:bg-canopy-800 active:bg-canopy-900 shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset]',
  secondary:
    'bg-paper-0/60 text-ink-950 border border-mist-200 hover:border-canopy-700/40 hover:bg-paper-50',
  ghost: 'bg-transparent text-ink-950/80 hover:bg-mist-100/70 hover:text-ink-950',
}

const sizeClasses: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-all duration-200 ease-out',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'active:scale-[0.98]',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
