import { motion, useReducedMotion, type MotionValue, useTransform } from 'framer-motion'

interface SpecimenTagProps {
  code: string
  label: string
  status: 'verified' | 'pending' | 'flagged'
  className?: string
  rotate?: number
  delay?: number
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
  depth?: number
}

const statusColor: Record<SpecimenTagProps['status'], string> = {
  verified: 'bg-canopy-500',
  pending: 'bg-lichen-400',
  flagged: 'bg-amber-500',
}

export function SpecimenTag({
  code,
  label,
  status,
  className,
  rotate = -3,
  delay = 0,
  pointerX,
  pointerY,
  depth = 1,
}: SpecimenTagProps) {
  const shouldReduceMotion = useReducedMotion()
  const x = useTransform(pointerX, (v) => v * depth)
  const y = useTransform(pointerY, (v) => v * depth)

  return (
    <motion.div
      className={className}
      style={shouldReduceMotion ? undefined : { x, y }}
      initial={{ opacity: 0, y: 16, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="animate-drift w-44 rounded-lg border border-canopy-900/10 bg-paper-0/90 px-3.5 py-3 shadow-[0_12px_30px_-14px_rgba(5,59,6,0.35)] backdrop-blur-sm"
        style={{ ['--rot' as string]: `${rotate}deg`, animationDelay: `${delay * 1.2}s` }}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium tracking-tight text-canopy-800">{code}</span>
          <span className={`h-1.5 w-1.5 rounded-full ${statusColor[status]} ${status === 'pending' ? 'animate-blink' : ''}`} />
        </div>
        <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink-950">{label}</p>
      </div>
    </motion.div>
  )
}
