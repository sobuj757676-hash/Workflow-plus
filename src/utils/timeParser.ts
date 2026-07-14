/**
 * Time Shorthand Parser
 *
 * Parses construction supervisor's time notation into structured data.
 * Supports formats commonly used on paper work record cards:
 *
 *   "8am-8.30pm+2"     → { timeIn: "08:00", timeOut: "20:30", normalHours: 10.5, otHours: 2 }
 *   "8am 5pm"          → { timeIn: "08:00", timeOut: "17:00", normalHours: 8, otHours: 1 }
 *   "08:00-17:00"      → { timeIn: "08:00", timeOut: "17:00", normalHours: 8, otHours: 1 }
 *   "8am-8.30pm"       → { timeIn: "08:00", timeOut: "20:30", normalHours: 8, otHours: 4.5 }
 */

export interface ParsedTime {
  timeIn: string        // HH:MM format
  timeOut: string       // HH:MM format
  normalHours: number   // hours at normal rate
  otHours: number       // overtime hours
  totalWorked: number   // total hours worked (excl. break)
}

export interface ParseConfig {
  normalHoursPerDay: number  // e.g., 8
  breakMinutes: number       // e.g., 60 (deducted from total)
}

const DEFAULT_CONFIG: ParseConfig = {
  normalHoursPerDay: 8,
  breakMinutes: 60,
}

/**
 * Parse a 12-hour time token like "8am", "8.30pm", "12pm"
 * Returns minutes since midnight.
 */
function parse12h(raw: string): number | null {
  const match = raw.match(/^(\d{1,2})(?:[.:](\d{1,2}))?\s*(am|pm)$/i)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const meridiem = match[3].toLowerCase()

  if (hours < 1 || hours > 12) return null
  if (minutes < 0 || minutes > 59) return null

  if (meridiem === 'am' && hours === 12) hours = 0
  if (meridiem === 'pm' && hours !== 12) hours += 12

  return hours * 60 + minutes
}

/**
 * Parse a 24-hour time token like "08:00", "17:30"
 * Returns minutes since midnight.
 */
function parse24h(raw: string): number | null {
  const match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)

  if (hours < 0 || hours > 23) return null
  if (minutes < 0 || minutes > 59) return null

  return hours * 60 + minutes
}

/**
 * Parse any single time token.
 */
function parseTimeToken(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase()
  return parse12h(trimmed) ?? parse24h(trimmed)
}

/**
 * Convert minutes since midnight to HH:MM string.
 */
function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Main parser function.
 *
 * @param input - the raw time string from the supervisor
 * @param config - tenant payroll rules (normal hours/day, break)
 * @returns ParsedTime or null if input cannot be parsed
 */
export function parseTimeShorthand(
  input: string,
  config: Partial<ParseConfig> = {}
): ParsedTime | null {
  const cfg: ParseConfig = { ...DEFAULT_CONFIG, ...config }

  if (!input || !input.trim()) return null

  let cleaned = input.trim()

  // Extract explicit OT suffix: +2, +1.5, +0.5 etc.
  let explicitOt: number | null = null
  const otSuffix = cleaned.match(/\+(\d+(?:\.\d+)?)\s*$/)
  if (otSuffix) {
    explicitOt = parseFloat(otSuffix[1])
    cleaned = cleaned.slice(0, otSuffix.index!).trim()
  }

  // Split into start and end tokens
  // Separators: "-", " ", "–", "to"
  let parts: string[]

  // Try dash/en-dash separator first (most common: "8am-8.30pm")
  if (cleaned.includes('-') || cleaned.includes('\u2013')) {
    parts = cleaned.split(/[-\u2013]/).map((s) => s.trim()).filter(Boolean)
  } else if (cleaned.toLowerCase().includes(' to ')) {
    parts = cleaned.split(/\s+to\s+/i).map((s) => s.trim()).filter(Boolean)
  } else {
    // Space separator: "8am 5pm"
    parts = cleaned.split(/\s+/).filter(Boolean)
  }

  if (parts.length < 2) return null

  // Take first and last as start/end (handles case where there might be extra tokens)
  const startRaw = parts[0]
  const endRaw = parts[parts.length - 1]

  const startMins = parseTimeToken(startRaw)
  const endMins = parseTimeToken(endRaw)

  if (startMins === null || endMins === null) return null

  // Handle overnight (end < start)
  let totalMins = endMins - startMins
  if (totalMins <= 0) totalMins += 24 * 60

  // Subtract break
  const breakHours = cfg.breakMinutes / 60
  const totalWorked = Math.max(totalMins / 60 - breakHours, 0)

  // Calculate normal and OT hours
  let normalHours: number
  let otHours: number

  if (explicitOt !== null) {
    // Supervisor explicitly stated OT hours
    otHours = explicitOt
    normalHours = Math.max(totalWorked - otHours, 0)
    // Cap normal hours to configured max
    if (normalHours > cfg.normalHoursPerDay) {
      normalHours = cfg.normalHoursPerDay
    }
  } else {
    // Auto-calculate: anything beyond normal_hours_per_day is OT
    normalHours = Math.min(totalWorked, cfg.normalHoursPerDay)
    otHours = Math.max(totalWorked - cfg.normalHoursPerDay, 0)
  }

  // Round to 2 decimal places
  normalHours = Math.round(normalHours * 100) / 100
  otHours = Math.round(otHours * 100) / 100

  return {
    timeIn: minutesToHHMM(startMins),
    timeOut: minutesToHHMM(endMins),
    normalHours,
    otHours,
    totalWorked: Math.round(totalWorked * 100) / 100,
  }
}
