/**
 * Unit tests for the Time Shorthand Parser.
 * Run with: npx vitest run src/utils/timeParser.test.ts
 */

import { describe, it, expect } from 'vitest'
import { parseTimeShorthand } from './timeParser'

describe('parseTimeShorthand', () => {
  const config = { normalHoursPerDay: 8, breakMinutes: 60 }

  it('parses "8am-8.30pm+2" (explicit OT)', () => {
    const result = parseTimeShorthand('8am-8.30pm+2', config)
    expect(result).not.toBeNull()
    expect(result!.timeIn).toBe('08:00')
    expect(result!.timeOut).toBe('20:30')
    expect(result!.otHours).toBe(2)
    // Total worked = 12.5h - 1h break = 11.5h; normal = 11.5 - 2 = 9.5 → capped to 8
    expect(result!.normalHours).toBe(8)
    expect(result!.totalWorked).toBe(11.5)
  })

  it('parses "8am 5pm" (space separator, auto OT)', () => {
    const result = parseTimeShorthand('8am 5pm', config)
    expect(result).not.toBeNull()
    expect(result!.timeIn).toBe('08:00')
    expect(result!.timeOut).toBe('17:00')
    // Total = 9h - 1h break = 8h; normal = 8, ot = 0
    expect(result!.normalHours).toBe(8)
    expect(result!.otHours).toBe(0)
    expect(result!.totalWorked).toBe(8)
  })

  it('parses "08:00-17:00" (24h format)', () => {
    const result = parseTimeShorthand('08:00-17:00', config)
    expect(result).not.toBeNull()
    expect(result!.timeIn).toBe('08:00')
    expect(result!.timeOut).toBe('17:00')
    expect(result!.normalHours).toBe(8)
    expect(result!.otHours).toBe(0)
  })

  it('parses "8am-8.30pm" (auto calculates OT)', () => {
    const result = parseTimeShorthand('8am-8.30pm', config)
    expect(result).not.toBeNull()
    expect(result!.timeIn).toBe('08:00')
    expect(result!.timeOut).toBe('20:30')
    // 12.5h - 1h break = 11.5h worked; normal = 8, OT = 3.5
    expect(result!.normalHours).toBe(8)
    expect(result!.otHours).toBe(3.5)
  })

  it('parses "7am-4pm" with custom config (9h normal)', () => {
    const result = parseTimeShorthand('7am-4pm', { normalHoursPerDay: 9, breakMinutes: 0 })
    expect(result).not.toBeNull()
    expect(result!.timeIn).toBe('07:00')
    expect(result!.timeOut).toBe('16:00')
    // 9h - 0 break = 9h; normal = 9, OT = 0
    expect(result!.normalHours).toBe(9)
    expect(result!.otHours).toBe(0)
  })

  it('parses "8am-5pm+1.5" (explicit fractional OT)', () => {
    const result = parseTimeShorthand('8am-5pm+1.5', config)
    expect(result).not.toBeNull()
    expect(result!.otHours).toBe(1.5)
    // Total = 9 - 1 break = 8; normal = 8 - 1.5 = 6.5
    expect(result!.normalHours).toBe(6.5)
  })

  it('handles "1pm-5pm" (afternoon shift, no break for short shift)', () => {
    // 4h shift with 1h break = 3h worked
    const result = parseTimeShorthand('1pm-5pm', config)
    expect(result).not.toBeNull()
    expect(result!.timeIn).toBe('13:00')
    expect(result!.timeOut).toBe('17:00')
    expect(result!.totalWorked).toBe(3)
    expect(result!.normalHours).toBe(3)
    expect(result!.otHours).toBe(0)
  })

  it('handles "8am to 5pm" (word separator)', () => {
    const result = parseTimeShorthand('8am to 5pm', config)
    expect(result).not.toBeNull()
    expect(result!.timeIn).toBe('08:00')
    expect(result!.timeOut).toBe('17:00')
  })

  it('returns null for empty or invalid input', () => {
    expect(parseTimeShorthand('', config)).toBeNull()
    expect(parseTimeShorthand('hello', config)).toBeNull()
    expect(parseTimeShorthand('25:00-17:00', config)).toBeNull()
  })

  it('returns null for single time token', () => {
    expect(parseTimeShorthand('8am', config)).toBeNull()
  })
})
