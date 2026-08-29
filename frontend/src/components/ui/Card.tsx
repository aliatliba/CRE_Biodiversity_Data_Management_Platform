import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-mist-200/70 bg-paper-0/80 p-6 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_12px_32px_-20px_rgba(18,32,24,0.35)] backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
}
