import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-canopy-900/10 bg-paper-0 p-6 shadow-[0_1px_2px_rgba(5,59,6,0.04)]',
        className
      )}
      {...props}
    />
  )
}
