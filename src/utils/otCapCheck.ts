/**
 * OT Cap Check Utility
 *
 * Checks if a worker's overtime hours for the month are approaching or exceeding
 * the configured monthly OT cap from payroll_rules.
 */

export interface OtCapResult {
  currentOtHours: number
  monthlyCapHours: number
  remaining: number
  exceeding: boolean
  warning: boolean
  message: string
}

/**
 * Check OT cap status for a worker.
 *
 * @param currentOtHours - Total OT hours already recorded this month
 * @param proposedOtHours - OT hours being added now
 * @param monthlyCapHours - Monthly OT cap from payroll_rules (e.g., 72)
 * @param warningThreshold - Percentage (0-1) at which to show a warning (default 0.8 = 80%)
 */
export function checkOtCap(
  currentOtHours: number,
  proposedOtHours: number,
  monthlyCapHours: number,
  warningThreshold = 0.8
): OtCapResult {
  const totalAfter = currentOtHours + proposedOtHours
  const remaining = Math.max(monthlyCapHours - totalAfter, 0)
  const exceeding = totalAfter > monthlyCapHours
  const warning = totalAfter >= monthlyCapHours * warningThreshold

  let message = ''
  if (exceeding) {
    const overBy = Math.round((totalAfter - monthlyCapHours) * 100) / 100
    message = `Exceeds monthly OT cap by ${overBy}h. Cap: ${monthlyCapHours}h, Total: ${totalAfter}h`
  } else if (warning) {
    message = `Approaching OT cap: ${totalAfter}h / ${monthlyCapHours}h (${remaining}h remaining)`
  }

  return {
    currentOtHours,
    monthlyCapHours,
    remaining,
    exceeding,
    warning,
    message,
  }
}
