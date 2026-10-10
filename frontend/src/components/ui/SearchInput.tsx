import type { InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  wrapperClassName?: string
}

export function SearchInput({ className, wrapperClassName, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative w-full max-w-sm', wrapperClassName)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-950/35"
        aria-hidden="true"
      />
      <input
        type="search"
        className={cn(
          'h-11 w-full rounded-xl border border-mist-200 bg-paper-0 pl-10 pr-4 text-sm outline-none transition-colors focus:border-canopy-600',
          className,
        )}
        {...props}
      />
    </div>
  )
}
