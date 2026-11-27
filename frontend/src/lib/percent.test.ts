import { describe, expect, it } from 'vitest'
import { formatPercent } from './percent'

describe('formatPercent', () => {
  it('returns null for 0 (and for nonsense), so the statistic is not shown', () => {
    expect(formatPercent(0)).toBeNull()
    expect(formatPercent(0, 1)).toBeNull()
    expect(formatPercent(-3)).toBeNull()
    expect(formatPercent(Number.NaN)).toBeNull()
  })

  it('never shows a non-zero share as 0%', () => {
    expect(formatPercent(0.3)).toBe('<1%')
    expect(formatPercent(0.04, 1)).toBe('<0.1%')
  })

  it('formats other values at the given precision', () => {
    expect(formatPercent(42.4)).toBe('42%')
    expect(formatPercent(12.345, 1)).toBe('12.3%')
    expect(formatPercent(100)).toBe('100%')
  })
})
