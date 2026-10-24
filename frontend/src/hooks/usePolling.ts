import { useEffect, useRef } from 'react'

interface UsePollingOptions<T> {
  /** Called every `intervalMs` while `enabled`. */
  poll: () => Promise<T>
  /** Receives each result; return true to stop polling. */
  onResult: (result: T) => boolean | void
  onError?: (error: unknown) => void
  intervalMs?: number
  enabled?: boolean
}

/**
 * Cancellable polling: runs `poll` every `intervalMs` while `enabled`, never
 * overlaps two requests, and stops on unmount, when `enabled` turns false, or
 * when `onResult` returns true. A response arriving after cleanup is ignored.
 */
export function usePolling<T>({
  poll,
  onResult,
  onError,
  intervalMs = 2000,
  enabled = true,
}: UsePollingOptions<T>): void {
  // Keep the latest callbacks without restarting the timer on every render.
  const callbacks = useRef({ poll, onResult, onError })
  useEffect(() => {
    callbacks.current = { poll, onResult, onError }
  })

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function tick() {
      try {
        const result = await callbacks.current.poll()
        if (cancelled) return
        if (callbacks.current.onResult(result) === true) return
      } catch (error) {
        if (cancelled) return
        callbacks.current.onError?.(error)
      }
      if (!cancelled) timer = setTimeout(tick, intervalMs)
    }

    timer = setTimeout(tick, intervalMs)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, intervalMs])
}
