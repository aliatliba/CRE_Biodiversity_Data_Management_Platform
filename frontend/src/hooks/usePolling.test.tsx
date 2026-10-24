import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePolling } from './usePolling'

describe('usePolling', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('polls until onResult returns true', async () => {
    const poll = vi.fn().mockResolvedValueOnce('running').mockResolvedValueOnce('done')
    const onResult = vi.fn((value: string) => value === 'done')

    renderHook(() => usePolling({ poll, onResult, intervalMs: 100 }))

    await act(() => vi.advanceTimersByTimeAsync(100))
    await act(() => vi.advanceTimersByTimeAsync(100))
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(poll).toHaveBeenCalledTimes(2)
    expect(onResult).toHaveBeenCalledTimes(2)
  })

  it('stops polling on unmount', async () => {
    const poll = vi.fn().mockResolvedValue('running')
    const { unmount } = renderHook(() =>
      usePolling({ poll, onResult: () => false, intervalMs: 100 }),
    )

    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(poll).toHaveBeenCalledTimes(1)

    unmount()
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(poll).toHaveBeenCalledTimes(1)
  })

  it('does not poll while disabled', async () => {
    const poll = vi.fn().mockResolvedValue('x')
    renderHook(() => usePolling({ poll, onResult: () => false, intervalMs: 100, enabled: false }))

    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(poll).not.toHaveBeenCalled()
  })
})
