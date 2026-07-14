/**
 * Payroll Calculator - Pure function
 *
 * Takes a worker's approved attendance entries, salary configuration,
 * and payroll rules to compute a payroll item.
 * No database dependency - all data passed as input.
 */

import type { SalaryType } from '@/types/database'

export interface AttendanceInput {
  date: string
  normal_hours: number
  ot_hours: number
  /** 'normal' | 'rest_day' | 'public_holiday' */
  day_type: 'normal' | 'rest_day' | 'public_holiday'
}

export interface WorkerSalaryConfig {
  salary_type: SalaryType
  basic_salary: number | null
  daily_rate: number | null
  hourly_rate: number | null
  ot_rate: number | null
  allowance: number | null
  transport: number | null
}

export interface PayrollRulesConfig {
  normal_hours_per_day: number
  normal_days_per_week: number
  ot_multiplier: number
  rest_day_multiplier: number
  public_holiday_multiplier: number
}

export interface DeductionItem {
  type: string
  amount: number
  description: string
}

export interface PayrollExtras {
  bonus?: number
  advance?: number
  deductions?: DeductionItem[]
}

export interface PayrollItem {
  working_days: number
  normal_hours: number
  ot_hours: number
  rest_day_hours: number
  ph_hours: number
  normal_pay: number
  ot_pay: number
  rest_day_pay: number
  ph_pay: number
  allowance: number
  transport: number
  bonus: number
  gross_pay: number
  advance: number
  deductions: DeductionItem[]
  net_pay: number
  derived_hourly_rate: number
}

/**
 * Calculate the derived hourly rate from a worker's salary config and payroll rules.
 */
export function calculateDerivedHourlyRate(
  worker: WorkerSalaryConfig,
  rules: PayrollRulesConfig
): number {
  switch (worker.salary_type) {
    case 'monthly': {
      const weeksPerMonth = 4.33
      const hoursPerWeek = rules.normal_days_per_week * rules.normal_hours_per_day
      return (worker.basic_salary ?? 0) / (weeksPerMonth * hoursPerWeek)
    }
    case 'daily':
      return (worker.daily_rate ?? 0) / rules.normal_hours_per_day
    case 'hourly':
      return worker.hourly_rate ?? 0
  }
}

/**
 * Calculate payroll for a single worker.
 *
 * @param attendance - Array of approved attendance entries for the period
 * @param worker - Worker salary configuration
 * @param rules - Payroll rules (multipliers, hours config)
 * @param extras - Optional bonus, advance, deductions
 * @returns Computed PayrollItem
 */
export function calculatePayroll(
  attendance: AttendanceInput[],
  worker: WorkerSalaryConfig,
  rules: PayrollRulesConfig,
  extras: PayrollExtras = {}
): PayrollItem {
  // Aggregate hours by day type
  let normalHours = 0
  let otHours = 0
  let restDayHours = 0
  let phHours = 0
  let workingDays = 0

  for (const entry of attendance) {
    workingDays++

    switch (entry.day_type) {
      case 'normal':
        normalHours += entry.normal_hours
        otHours += entry.ot_hours
        break
      case 'rest_day':
        restDayHours += entry.normal_hours + entry.ot_hours
        break
      case 'public_holiday':
        phHours += entry.normal_hours + entry.ot_hours
        break
    }
  }

  // Calculate derived hourly rate
  const derivedHourlyRate = calculateDerivedHourlyRate(worker, rules)

  // Determine OT rate: use explicit ot_rate if set, otherwise derived hourly rate
  const otRate = worker.ot_rate ?? derivedHourlyRate

  // Calculate pay components
  let normalPay: number
  switch (worker.salary_type) {
    case 'monthly':
      normalPay = worker.basic_salary ?? 0
      break
    case 'daily':
      normalPay = workingDays * (worker.daily_rate ?? 0)
      break
    case 'hourly':
      normalPay = normalHours * (worker.hourly_rate ?? 0)
      break
  }

  const otPay = otHours * otRate * rules.ot_multiplier
  const restDayPay = restDayHours * derivedHourlyRate * rules.rest_day_multiplier
  const phPay = phHours * derivedHourlyRate * rules.public_holiday_multiplier

  const allowance = worker.allowance ?? 0
  const transport = worker.transport ?? 0
  const bonus = extras.bonus ?? 0
  const advance = extras.advance ?? 0
  const deductions = extras.deductions ?? []

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)

  const grossPay = normalPay + otPay + restDayPay + phPay + allowance + transport + bonus
  const netPay = grossPay - advance - totalDeductions

  return {
    working_days: workingDays,
    normal_hours: round2(normalHours),
    ot_hours: round2(otHours),
    rest_day_hours: round2(restDayHours),
    ph_hours: round2(phHours),
    normal_pay: round2(normalPay),
    ot_pay: round2(otPay),
    rest_day_pay: round2(restDayPay),
    ph_pay: round2(phPay),
    allowance: round2(allowance),
    transport: round2(transport),
    bonus: round2(bonus),
    gross_pay: round2(grossPay),
    advance: round2(advance),
    deductions,
    net_pay: round2(netPay),
    derived_hourly_rate: round2(derivedHourlyRate),
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
