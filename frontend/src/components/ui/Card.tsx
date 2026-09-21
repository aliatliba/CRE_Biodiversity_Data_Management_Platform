import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border border-canopy-900/10 bg-paper-0 p-4 shadow-[0_1px_2px_rgba(5,59,6,0.04)] sm:p-6',
        'dark:border-canopy-400/12 dark:shadow-[0_1px_2px_rgba(0,0,0,0.18)]',
        className,
      )}
      {...props}
    />
  )
}