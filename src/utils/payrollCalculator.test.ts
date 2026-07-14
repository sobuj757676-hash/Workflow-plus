import { describe, it, expect } from 'vitest'
import {
  calculatePayroll,
  calculateDerivedHourlyRate,
  type AttendanceInput,
  type WorkerSalaryConfig,
  type PayrollRulesConfig,
  type PayrollExtras,
} from './payrollCalculator'

const defaultRules: PayrollRulesConfig = {
  normal_hours_per_day: 8,
  normal_days_per_week: 6,
  ot_multiplier: 1.5,
  rest_day_multiplier: 2.0,
  public_holiday_multiplier: 3.0,
}

describe('calculateDerivedHourlyRate', () => {
  it('calculates hourly rate for monthly worker', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'monthly',
      basic_salary: 2400,
      daily_rate: null,
      hourly_rate: null,
      ot_rate: null,
      allowance: null,
      transport: null,
    }
    // 2400 / (4.33 * 6 * 8) = 2400 / 207.84 = ~11.55
    const rate = calculateDerivedHourlyRate(worker, defaultRules)
    expect(rate).toBeCloseTo(11.55, 1)
  })

  it('calculates hourly rate for daily worker', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'daily',
      basic_salary: null,
      daily_rate: 80,
      hourly_rate: null,
      ot_rate: null,
      allowance: null,
      transport: null,
    }
    // 80 / 8 = 10
    const rate = calculateDerivedHourlyRate(worker, defaultRules)
    expect(rate).toBe(10)
  })

  it('returns hourly rate directly for hourly worker', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'hourly',
      basic_salary: null,
      daily_rate: null,
      hourly_rate: 12,
      ot_rate: null,
      allowance: null,
      transport: null,
    }
    const rate = calculateDerivedHourlyRate(worker, defaultRules)
    expect(rate).toBe(12)
  })
})

describe('calculatePayroll', () => {
  it('calculates payroll for a monthly worker with normal attendance', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'monthly',
      basic_salary: 2400,
      daily_rate: null,
      hourly_rate: null,
      ot_rate: null,
      allowance: 200,
      transport: 100,
    }

    const attendance: AttendanceInput[] = Array.from({ length: 26 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      normal_hours: 8,
      ot_hours: 0,
      day_type: 'normal' as const,
    }))

    const result = calculatePayroll(attendance, worker, defaultRules)

    expect(result.working_days).toBe(26)
    expect(result.normal_hours).toBe(208)
    expect(result.ot_hours).toBe(0)
    expect(result.normal_pay).toBe(2400)
    expect(result.ot_pay).toBe(0)
    expect(result.allowance).toBe(200)
    expect(result.transport).toBe(100)
    expect(result.gross_pay).toBe(2700)
    expect(result.net_pay).toBe(2700)
  })

  it('calculates payroll for a daily worker', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'daily',
      basic_salary: null,
      daily_rate: 80,
      hourly_rate: null,
      ot_rate: null,
      allowance: 0,
      transport: 0,
    }

    const attendance: AttendanceInput[] = Array.from({ length: 22 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      normal_hours: 8,
      ot_hours: 0,
      day_type: 'normal' as const,
    }))

    const result = calculatePayroll(attendance, worker, defaultRules)

    expect(result.working_days).toBe(22)
    expect(result.normal_pay).toBe(22 * 80) // 1760
    expect(result.gross_pay).toBe(1760)
    expect(result.net_pay).toBe(1760)
  })

  it('calculates payroll for an hourly worker', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'hourly',
      basic_salary: null,
      daily_rate: null,
      hourly_rate: 12,
      ot_rate: null,
      allowance: 50,
      transport: 0,
    }

    const attendance: AttendanceInput[] = [
      { date: '2024-01-01', normal_hours: 8, ot_hours: 0, day_type: 'normal' },
      { date: '2024-01-02', normal_hours: 6, ot_hours: 0, day_type: 'normal' },
      { date: '2024-01-03', normal_hours: 8, ot_hours: 2, day_type: 'normal' },
    ]

    const result = calculatePayroll(attendance, worker, defaultRules)

    expect(result.working_days).toBe(3)
    expect(result.normal_hours).toBe(22)
    expect(result.ot_hours).toBe(2)
    // normal_pay = 22 * 12 = 264
    expect(result.normal_pay).toBe(264)
    // ot_pay = 2 * 12 * 1.5 = 36
    expect(result.ot_pay).toBe(36)
    expect(result.gross_pay).toBe(264 + 36 + 50)
    expect(result.net_pay).toBe(350)
  })

  it('calculates overtime pay correctly with explicit ot_rate', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'monthly',
      basic_salary: 2400,
      daily_rate: null,
      hourly_rate: null,
      ot_rate: 15,
      allowance: 0,
      transport: 0,
    }

    const attendance: AttendanceInput[] = [
      { date: '2024-01-01', normal_hours: 8, ot_hours: 3, day_type: 'normal' },
      { date: '2024-01-02', normal_hours: 8, ot_hours: 2, day_type: 'normal' },
    ]

    const result = calculatePayroll(attendance, worker, defaultRules)

    expect(result.ot_hours).toBe(5)
    // ot_pay = 5 * 15 * 1.5 = 112.5
    expect(result.ot_pay).toBe(112.5)
    expect(result.normal_pay).toBe(2400)
    expect(result.gross_pay).toBe(2400 + 112.5)
  })

  it('calculates rest day pay correctly', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'daily',
      basic_salary: null,
      daily_rate: 80,
      hourly_rate: null,
      ot_rate: null,
      allowance: 0,
      transport: 0,
    }

    const attendance: AttendanceInput[] = [
      { date: '2024-01-01', normal_hours: 8, ot_hours: 0, day_type: 'normal' },
      { date: '2024-01-02', normal_hours: 8, ot_hours: 0, day_type: 'normal' },
      { date: '2024-01-07', normal_hours: 8, ot_hours: 2, day_type: 'rest_day' },
    ]

    const result = calculatePayroll(attendance, worker, defaultRules)

    expect(result.working_days).toBe(3)
    expect(result.rest_day_hours).toBe(10) // 8 + 2 on rest day
    // derived hourly = 80 / 8 = 10
    // rest_day_pay = 10 * 10 * 2.0 = 200
    expect(result.rest_day_pay).toBe(200)
    // normal_pay = 3 days * 80 = 240 (daily rate counts all working days)
    expect(result.normal_pay).toBe(240)
  })

  it('calculates public holiday pay correctly', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'hourly',
      basic_salary: null,
      daily_rate: null,
      hourly_rate: 10,
      ot_rate: null,
      allowance: 0,
      transport: 0,
    }

    const attendance: AttendanceInput[] = [
      { date: '2024-01-01', normal_hours: 8, ot_hours: 0, day_type: 'public_holiday' },
      { date: '2024-01-02', normal_hours: 8, ot_hours: 0, day_type: 'normal' },
    ]

    const result = calculatePayroll(attendance, worker, defaultRules)

    expect(result.ph_hours).toBe(8)
    // ph_pay = 8 * 10 * 3.0 = 240
    expect(result.ph_pay).toBe(240)
    // normal_hours only from normal days
    expect(result.normal_hours).toBe(8)
    expect(result.normal_pay).toBe(80)
    expect(result.gross_pay).toBe(80 + 240)
  })

  it('applies deductions and advance correctly', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'monthly',
      basic_salary: 3000,
      daily_rate: null,
      hourly_rate: null,
      ot_rate: null,
      allowance: 200,
      transport: 100,
    }

    const attendance: AttendanceInput[] = Array.from({ length: 26 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      normal_hours: 8,
      ot_hours: 0,
      day_type: 'normal' as const,
    }))

    const extras: PayrollExtras = {
      bonus: 500,
      advance: 200,
      deductions: [
        { type: 'levy', amount: 300, description: 'Worker levy' },
        { type: 'accommodation', amount: 150, description: 'Hostel deduction' },
      ],
    }

    const result = calculatePayroll(attendance, worker, defaultRules, extras)

    expect(result.bonus).toBe(500)
    expect(result.advance).toBe(200)
    expect(result.deductions).toHaveLength(2)
    // gross = 3000 + 200 + 100 + 500 = 3800
    expect(result.gross_pay).toBe(3800)
    // net = 3800 - 200 - 300 - 150 = 3150
    expect(result.net_pay).toBe(3150)
  })

  it('handles empty attendance (no entries)', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'monthly',
      basic_salary: 2400,
      daily_rate: null,
      hourly_rate: null,
      ot_rate: null,
      allowance: 200,
      transport: 100,
    }

    const result = calculatePayroll([], worker, defaultRules)

    expect(result.working_days).toBe(0)
    expect(result.normal_hours).toBe(0)
    expect(result.ot_hours).toBe(0)
    // Monthly worker still gets base salary even with 0 entries
    expect(result.normal_pay).toBe(2400)
    expect(result.gross_pay).toBe(2700)
    expect(result.net_pay).toBe(2700)
  })

  it('handles mixed day types in the same period', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'monthly',
      basic_salary: 2600,
      daily_rate: null,
      hourly_rate: null,
      ot_rate: null,
      allowance: 0,
      transport: 0,
    }

    const attendance: AttendanceInput[] = [
      { date: '2024-01-01', normal_hours: 8, ot_hours: 2, day_type: 'normal' },
      { date: '2024-01-02', normal_hours: 8, ot_hours: 0, day_type: 'normal' },
      { date: '2024-01-03', normal_hours: 8, ot_hours: 1, day_type: 'rest_day' },
      { date: '2024-01-04', normal_hours: 8, ot_hours: 0, day_type: 'public_holiday' },
    ]

    const result = calculatePayroll(attendance, worker, defaultRules)

    expect(result.working_days).toBe(4)
    expect(result.normal_hours).toBe(16) // 8+8 from normal days
    expect(result.ot_hours).toBe(2) // OT from normal days
    expect(result.rest_day_hours).toBe(9) // 8+1 on rest day
    expect(result.ph_hours).toBe(8) // 8 on PH

    // derived hourly for monthly: 2600 / (4.33 * 6 * 8) = 2600 / 207.84 ~ 12.51
    const derivedHourly = 2600 / (4.33 * 6 * 8)
    expect(result.derived_hourly_rate).toBeCloseTo(derivedHourly, 2)

    // ot_pay = 2 * derivedHourly * 1.5
    expect(result.ot_pay).toBeCloseTo(2 * derivedHourly * 1.5, 2)
    // rest_day_pay = 9 * derivedHourly * 2.0
    expect(result.rest_day_pay).toBeCloseTo(9 * derivedHourly * 2.0, 2)
    // ph_pay = 8 * derivedHourly * 3.0
    expect(result.ph_pay).toBeCloseTo(8 * derivedHourly * 3.0, 2)
  })

  it('handles fractional hours correctly', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'hourly',
      basic_salary: null,
      daily_rate: null,
      hourly_rate: 15,
      ot_rate: null,
      allowance: 0,
      transport: 0,
    }

    const attendance: AttendanceInput[] = [
      { date: '2024-01-01', normal_hours: 7.5, ot_hours: 1.5, day_type: 'normal' },
      { date: '2024-01-02', normal_hours: 8.25, ot_hours: 0.75, day_type: 'normal' },
    ]

    const result = calculatePayroll(attendance, worker, defaultRules)

    expect(result.normal_hours).toBe(15.75)
    expect(result.ot_hours).toBe(2.25)
    // normal_pay = 15.75 * 15 = 236.25
    expect(result.normal_pay).toBe(236.25)
    // ot_pay = 2.25 * 15 * 1.5 = 50.625 -> rounded to 50.63
    expect(result.ot_pay).toBe(50.63)
    expect(result.gross_pay).toBe(286.88)
  })

  it('net pay can be negative with large deductions', () => {
    const worker: WorkerSalaryConfig = {
      salary_type: 'daily',
      basic_salary: null,
      daily_rate: 50,
      hourly_rate: null,
      ot_rate: null,
      allowance: 0,
      transport: 0,
    }

    const attendance: AttendanceInput[] = [
      { date: '2024-01-01', normal_hours: 8, ot_hours: 0, day_type: 'normal' },
    ]

    const extras: PayrollExtras = {
      advance: 200,
      deductions: [{ type: 'other', amount: 100, description: 'Penalty' }],
    }

    const result = calculatePayroll(attendance, worker, defaultRules, extras)

    // gross = 50, deductions = 200 + 100 = 300
    expect(result.gross_pay).toBe(50)
    expect(result.net_pay).toBe(-250)
  })
})
