import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { calculatePayroll } from '@/utils/payrollCalculator'
import type {
  PayrollRunRow,
  PayrollItemRow,
  WorkerRow,
  AttendanceEntryRow,
  PayrollRuleRow,
  PayrollOverride,
} from '@/types/database'
import type { AttendanceInput, WorkerSalaryConfig, PayrollRulesConfig } from '@/utils/payrollCalculator'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  calculated: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  finalized: 'bg-purple-100 text-purple-800',
}

interface EditModalState {
  itemId: string
  workerId: string
  workerName: string
  field: string
  currentValue: number
  newValue: string
  reason: string
}

export function PayrollDetailPage() {
  const { runId } = useParams<{ runId: string }>()
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editModal, setEditModal] = useState<EditModalState | null>(null)

  // Fetch payroll run
  const { data: run, isLoading: loadingRun } = useQuery({
    queryKey: ['payroll-run', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', runId!)
        .single()
      if (error) throw error
      return data as PayrollRunRow
    },
    enabled: !!runId,
  })

  // Fetch payroll items
  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ['payroll-items', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_items')
        .select('*')
        .eq('payroll_run_id', runId!)
      if (error) throw error
      return data as PayrollItemRow[]
    },
    enabled: !!runId,
  })

  // Fetch workers
  const { data: workers } = useQuery({
    queryKey: ['all-workers', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('status', 'active')
      if (error) throw error
      return data as WorkerRow[]
    },
    enabled: !!tenantId,
  })

  const workerMap = new Map(workers?.map((w) => [w.id, w]) ?? [])

  // Calculate payroll mutation
  const calculateMutation = useMutation({
    mutationFn: async () => {
      if (!run || !workers) throw new Error('Missing data')

      // Fetch payroll rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('payroll_rules')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single()
      if (rulesError) throw rulesError
      const rules = rulesData as PayrollRuleRow

      // Fetch approved attendance for the period
      const { data: attendanceData, error: attError } = await supabase
        .from('attendance_entries')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('approval_status', 'approved')
        .gte('date', run.period_start)
        .lte('date', run.period_end)
      if (attError) throw attError
      const attendance = attendanceData as AttendanceEntryRow[]

      // Group attendance by worker
      const attendanceByWorker = new Map<string, AttendanceEntryRow[]>()
      for (const entry of attendance) {
        const existing = attendanceByWorker.get(entry.worker_id) ?? []
        existing.push(entry)
        attendanceByWorker.set(entry.worker_id, existing)
      }

      const payrollRulesConfig: PayrollRulesConfig = {
        normal_hours_per_day: rules.normal_hours_per_day,
        normal_days_per_week: rules.normal_days_per_week,
        ot_multiplier: rules.ot_multiplier,
        rest_day_multiplier: rules.rest_day_multiplier,
        public_holiday_multiplier: rules.public_holiday_multiplier,
      }

      // Calculate for each worker
      const payrollItems: Array<Omit<PayrollItemRow, 'id' | 'created_at' | 'updated_at'>> = []

      for (const worker of workers) {
        const workerAttendance = attendanceByWorker.get(worker.id) ?? []
        if (workerAttendance.length === 0) continue

        const attendanceInput: AttendanceInput[] = workerAttendance.map((entry) => {
          let dayType: 'normal' | 'rest_day' | 'public_holiday' = 'normal'
          if (entry.status === 'rest_day') dayType = 'rest_day'
          else if (entry.status === 'holiday') dayType = 'public_holiday'
          return {
            date: entry.date,
            normal_hours: entry.normal_hours ?? 0,
            ot_hours: entry.ot_hours ?? 0,
            day_type: dayType,
          }
        })

        const workerConfig: WorkerSalaryConfig = {
          salary_type: worker.salary_type,
          basic_salary: worker.basic_salary,
          daily_rate: worker.daily_rate,
          hourly_rate: worker.hourly_rate,
          ot_rate: worker.ot_rate,
          allowance: worker.allowance,
          transport: worker.transport,
        }

        const result = calculatePayroll(attendanceInput, workerConfig, payrollRulesConfig)

        payrollItems.push({
          payroll_run_id: run.id,
          worker_id: worker.id,
          working_days: result.working_days,
          normal_hours: result.normal_hours,
          ot_hours: result.ot_hours,
          rest_day_hours: result.rest_day_hours,
          ph_hours: result.ph_hours,
          normal_pay: result.normal_pay,
          ot_pay: result.ot_pay,
          rest_day_pay: result.rest_day_pay,
          ph_pay: result.ph_pay,
          gross_pay: result.gross_pay,
          allowance: result.allowance,
          transport: result.transport,
          bonus: result.bonus,
          advance: result.advance,
          deductions: result.deductions,
          overrides: [],
          computed_snapshot: result as unknown as Record<string, unknown>,
          net_pay: result.net_pay,
        })
      }

      // Delete existing items if recalculating
      await supabase.from('payroll_items').delete().eq('payroll_run_id', run.id)

      // Insert new items
      if (payrollItems.length > 0) {
        const { error: insertError } = await supabase
          .from('payroll_items')
          .insert(payrollItems)
        if (insertError) throw insertError
      }

      // Update run status and total cost
      const totalCost = payrollItems.reduce((sum, item) => sum + item.net_pay, 0)
      const { error: updateError } = await supabase
        .from('payroll_runs')
        .update({ status: 'calculated', total_cost: Math.round(totalCost * 100) / 100 })
        .eq('id', run.id)
      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-run', runId] })
      queryClient.invalidateQueries({ queryKey: ['payroll-items', runId] })
    },
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('payroll_runs')
        .update({ status: 'approved' })
        .eq('id', runId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-run', runId] })
    },
  })

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      // Update status to finalized
      const { error } = await supabase
        .from('payroll_runs')
        .update({ status: 'finalized' })
        .eq('id', runId!)
      if (error) throw error

      // Generate payslips for each payroll item
      if (items && items.length > 0) {
        const payslips = items.map((item) => ({
          payroll_item_id: item.id,
          worker_id: item.worker_id,
          pdf_url: null,
          verification_code: generateVerificationCode(),
          status: 'issued' as const,
          language: 'en',
          issued_at: new Date().toISOString(),
        }))

        const { error: payslipError } = await supabase
          .from('payslips')
          .insert(payslips)
        if (payslipError) throw payslipError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-run', runId] })
    },
  })

  // Override mutation
  const overrideMutation = useMutation({
    mutationFn: async (modal: EditModalState) => {
      const item = items?.find((i) => i.id === modal.itemId)
      if (!item) throw new Error('Item not found')

      const newOverride: PayrollOverride = {
        field: modal.field,
        original_value: modal.currentValue,
        new_value: parseFloat(modal.newValue),
        reason: modal.reason,
      }

      const existingOverrides = (item.overrides ?? []).filter(
        (o) => o.field !== modal.field
      )
      const overrides = [...existingOverrides, newOverride]

      const updateData: Record<string, unknown> = {
        overrides,
        [modal.field]: parseFloat(modal.newValue),
      }

      // Recalculate gross and net if a pay field changed
      const payFields = ['normal_pay', 'ot_pay', 'rest_day_pay', 'ph_pay', 'allowance', 'transport', 'bonus']
      if (payFields.includes(modal.field)) {
        const updatedItem = { ...item, [modal.field]: parseFloat(modal.newValue) }
        const gross = updatedItem.normal_pay + updatedItem.ot_pay + updatedItem.rest_day_pay +
          updatedItem.ph_pay + updatedItem.allowance + updatedItem.transport + updatedItem.bonus
        const totalDeductions = (updatedItem.deductions ?? []).reduce(
          (sum: number, d: { amount: number }) => sum + d.amount, 0
        )
        const net = gross - updatedItem.advance - totalDeductions
        updateData.gross_pay = Math.round(gross * 100) / 100
        updateData.net_pay = Math.round(net * 100) / 100
      }

      const { error } = await supabase
        .from('payroll_items')
        .update(updateData)
        .eq('id', modal.itemId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-items', runId] })
      setEditModal(null)
    },
  })

  function formatCurrency(amount: number) {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  function formatPeriod(start: string, _end: string) {
    const d = new Date(start + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  function openEditModal(item: PayrollItemRow, field: string, currentValue: number) {
    const worker = workerMap.get(item.worker_id)
    setEditModal({
      itemId: item.id,
      workerId: item.worker_id,
      workerName: worker?.full_name ?? 'Unknown',
      field,
      currentValue,
      newValue: String(currentValue),
      reason: '',
    })
  }

  if (loadingRun || loadingItems) {
    return (
      <div className="flex items-center justify-center p-12">
        <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="text-center p-12 text-[var(--color-text-muted)]">
        Payroll run not found.
      </div>
    )
  }

  const canCalculate = run.status === 'draft' || run.status === 'calculated'
  const canApprove = run.status === 'calculated'
  const canFinalize = run.status === 'approved'
  const isEditable = run.status !== 'finalized'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/office/payroll')}
            className="text-sm text-[var(--color-primary)] hover:underline mb-1 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Payroll
          </button>
          <h1 className="text-2xl font-bold">
            {formatPeriod(run.period_start, run.period_end)}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[run.status]}`}>
              {run.status}
            </span>
            {run.total_cost != null && (
              <span className="text-sm text-[var(--color-text-muted)]">
                Total: {formatCurrency(run.total_cost)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCalculate && (
            <button
              onClick={() => calculateMutation.mutate()}
              disabled={calculateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {calculateMutation.isPending ? 'Calculating...' : 'Calculate'}
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </button>
          )}
          {canFinalize && (
            <button
              onClick={() => finalizeMutation.mutate()}
              disabled={finalizeMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {finalizeMutation.isPending ? 'Finalizing...' : 'Finalize'}
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {(calculateMutation.isError || approveMutation.isError || finalizeMutation.isError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          An error occurred. Please try again.
        </div>
      )}

      {/* Payroll Items Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {!items || items.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            {run.status === 'draft'
              ? 'Click "Calculate" to compute payroll for all workers with approved attendance.'
              : 'No payroll items found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-[var(--color-text-muted)]">Worker</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Days</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Normal Hrs</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">OT Hrs</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Normal Pay</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">OT Pay</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Allowance</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Transport</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Gross</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)]">Deductions</th>
                  <th className="text-right px-3 py-2 font-medium text-[var(--color-text-muted)] font-bold">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((item) => {
                  const worker = workerMap.get(item.worker_id)
                  const totalDeductions = item.advance + (item.deductions ?? []).reduce(
                    (sum, d) => sum + d.amount, 0
                  )
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">
                        {worker?.full_name ?? 'Unknown'}
                        <br />
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {worker?.employee_id}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{item.working_days}</td>
                      <td className="px-3 py-2 text-right">{item.normal_hours}</td>
                      <td className="px-3 py-2 text-right">{item.ot_hours}</td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${isEditable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                        onClick={() => isEditable && openEditModal(item, 'normal_pay', item.normal_pay)}
                      >
                        {formatCurrency(item.normal_pay)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${isEditable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                        onClick={() => isEditable && openEditModal(item, 'ot_pay', item.ot_pay)}
                      >
                        {formatCurrency(item.ot_pay)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${isEditable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                        onClick={() => isEditable && openEditModal(item, 'allowance', item.allowance)}
                      >
                        {formatCurrency(item.allowance)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${isEditable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                        onClick={() => isEditable && openEditModal(item, 'transport', item.transport)}
                      >
                        {formatCurrency(item.transport)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium">
                        {formatCurrency(item.gross_pay)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-red-600">
                        {totalDeductions > 0 ? `-${formatCurrency(totalDeductions)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold">
                        {formatCurrency(item.net_pay)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-[var(--color-border)]">
                <tr className="font-bold">
                  <td className="px-3 py-2">Total ({items.length} workers)</td>
                  <td className="px-3 py-2 text-right">
                    {items.reduce((s, i) => s + i.working_days, 0)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {items.reduce((s, i) => s + i.normal_hours, 0)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {items.reduce((s, i) => s + i.ot_hours, 0)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCurrency(items.reduce((s, i) => s + i.normal_pay, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCurrency(items.reduce((s, i) => s + i.ot_pay, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCurrency(items.reduce((s, i) => s + i.allowance, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCurrency(items.reduce((s, i) => s + i.transport, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCurrency(items.reduce((s, i) => s + i.gross_pay, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-red-600">
                    {formatCurrency(items.reduce((s, i) => s + i.advance + (i.deductions ?? []).reduce((sd, d) => sd + d.amount, 0), 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCurrency(items.reduce((s, i) => s + i.net_pay, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Edit Override Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-1">Override Value</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              {editModal.workerName} - {editModal.field.replace(/_/g, ' ')}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                  Current Value
                </label>
                <p className="text-sm font-mono">{formatCurrency(editModal.currentValue)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">New Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={editModal.newValue}
                  onChange={(e) => setEditModal({ ...editModal, newValue: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Reason for Override</label>
                <input
                  type="text"
                  value={editModal.reason}
                  onChange={(e) => setEditModal({ ...editModal, reason: e.target.value })}
                  placeholder="e.g., Correction for missed entry"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => overrideMutation.mutate(editModal)}
                disabled={overrideMutation.isPending || !editModal.reason.trim()}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
              >
                {overrideMutation.isPending ? 'Saving...' : 'Save Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
