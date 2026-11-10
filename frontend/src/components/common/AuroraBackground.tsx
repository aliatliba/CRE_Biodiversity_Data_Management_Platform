import { cn } from '@/lib/utils'

/**
 * Soft, slowly drifting glows behind glass panels. Pure CSS gradients (no blur
 * filter) so it stays cheap; the global reduced-motion rule freezes it.
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      <div
        className="absolute -left-[15%] -top-[25%] h-[75%] w-[70%] animate-[aurora-a_26s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(closest-side, var(--aurora-1), transparent)' }}
      />
      <div
        className="absolute -right-[20%] top-[5%] h-[70%] w-[65%] animate-[aurora-b_32s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(closest-side, var(--aurora-2), transparent)' }}
      />
      <div
        className="absolute -bottom-[30%] left-[20%] h-[70%] w-[70%] animate-[aurora-c_38s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(closest-side, var(--aurora-3), transparent)' }}
      />
    </div>
  )
}
