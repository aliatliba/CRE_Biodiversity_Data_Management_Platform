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
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
        aria-hidden="true"
      />
      <input
        type="search"
        className={cn(
          'h-10 w-full rounded-xl border border-line-strong bg-surface pl-9 pr-3 text-sm text-fg outline-none transition-colors duration-150 placeholder:text-fg-subtle hover:border-fg-subtle/50 focus:border-ring focus:ring-2 focus:ring-ring/20',
          className,
        )}
        {...props}
      />
    </div>
  )
}
