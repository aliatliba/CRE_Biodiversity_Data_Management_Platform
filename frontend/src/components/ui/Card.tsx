import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'glass min-w-0 rounded-2xl p-4 lg:p-5',
        className,
      )}
      {...props}
    />
  )
}