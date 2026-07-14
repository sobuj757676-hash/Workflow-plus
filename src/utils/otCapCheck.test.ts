import { describe, it, expect } from 'vitest'
import { checkOtCap } from './otCapCheck'

describe('checkOtCap', () => {
  it('returns no warning when well under cap', () => {
    const result = checkOtCap(10, 2, 72)
    expect(result.exceeding).toBe(false)
    expect(result.warning).toBe(false)
    expect(result.remaining).toBe(60)
    expect(result.message).toBe('')
  })

  it('returns warning when approaching cap (80%)', () => {
    const result = checkOtCap(56, 2, 72)
    expect(result.exceeding).toBe(false)
    expect(result.warning).toBe(true)
    expect(result.remaining).toBe(14)
    expect(result.message).toContain('Approaching OT cap')
  })

  it('returns exceeding when over cap', () => {
    const result = checkOtCap(70, 4, 72)
    expect(result.exceeding).toBe(true)
    expect(result.warning).toBe(true)
    expect(result.remaining).toBe(0)
    expect(result.message).toContain('Exceeds monthly OT cap by 2h')
  })

  it('handles exact cap boundary', () => {
    const result = checkOtCap(70, 2, 72)
    expect(result.exceeding).toBe(false)
    expect(result.warning).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('uses custom warning threshold', () => {
    const result = checkOtCap(50, 2, 72, 0.9)
    expect(result.warning).toBe(false)
  })
})
