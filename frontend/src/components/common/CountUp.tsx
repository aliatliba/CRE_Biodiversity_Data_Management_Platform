import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

const format = (n: number) => Math.round(n).toLocaleString()

/** Counts from 0 to `value` once mounted; shows the final value under reduced motion. */
export function CountUp({ value, duration = 1.1 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (shouldReduceMotion) {
      node.textContent = format(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest)
      },
    })
    return () => controls.stop()
  }, [value, duration, shouldReduceMotion])

  // Screen readers get the final value, not every intermediate number.
  return (
    <>
      <span className="sr-only">{format(value)}</span>
      <span ref={ref} aria-hidden="true">
        {format(shouldReduceMotion ? value : 0)}
      </span>
    </>
  )
}
