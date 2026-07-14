import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PayslipView } from '@/components/PayslipView'
import type { PayslipRow, PayrollItemRow, WorkerRow } from '@/types/database'

interface PayslipWithRelations {
  id: string
  payroll_item_id: string
  worker_id: string
  pdf_url: string | null
  verification_code: string
  status: PayslipRow['status']
  language: string
  issued_at: string
  created_at: string
  updated_at: string
  worker: Pick<WorkerRow, 'id' | 'full_name' | 'employee_id' | 'occupation'>
  payroll_item: PayrollItemRow & {
    payroll_run: { period_start: string; period_end: string }
  }
}

export function PayslipManagementPage() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const [filterPeriod, setFilterPeriod] = useState('')
  const [filterWorker, setFilterWorker] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithRelations | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch all payslips
  const { data: payslips, isLoading } = useQuery({
    queryKey: ['all-payslips', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          worker:workers(id, full_name, employee_id, occupation),
          payroll_item:payroll_items(*, payroll_run:payroll_runs(period_start, period_end))
        `)
        .order('issued_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as unknown as PayslipWithRelations[]
    },
    enabled: !!tenantId,
  })

  // Void mutation
  const voidMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('payslips')
        .update({ status: 'void' })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-payslips'] })
      setSelectedIds(new Set())
    },
  })

  // Filter payslips
  const filtered = payslips?.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (filterWorker) {
      const name = p.worker?.full_name?.toLowerCase() ?? ''
      const empId = p.worker?.employee_id?.toLowerCase() ?? ''
      const search = filterWorker.toLowerCase()
      if (!name.includes(search) && !empId.includes(search)) return false
    }
    if (filterPeriod) {
      const periodLabel = formatPeriod(p.payroll_item?.payroll_run?.period_start ?? '')
      if (!periodLabel.toLowerCase().includes(filterPeriod.toLowerCase())) return false
    }
    return true
  })

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (!filtered) return
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)))
    }
  }

  function handleBulkVoid() {
    if (selectedIds.size === 0) return
    if (!confirm(`Void ${selectedIds.size} payslip(s)? This cannot be undone.`)) return
    voidMutation.mutate(Array.from(selectedIds))
  }

  function formatPeriod(periodStart: string): string {
    if (!periodStart) return '-'
    const d = new Date(periodStart + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const statusColors: Record<string, string> = {
    issued: 'bg-green-100 text-green-800',
    superseded: 'bg-amber-100 text-amber-800',
    void: 'bg-red-100 text-red-800',
  }

  // Viewing a single payslip
  if (selectedPayslip) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedPayslip(null)}
          className="text-sm text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Payslips
        </button>
        <PayslipView
          payrollItem={selectedPayslip.payroll_item}
          worker={selectedPayslip.worker}
          payslip={selectedPayslip}
          periodStart={selectedPayslip.payroll_item.payroll_run.period_start}
          periodEnd={selectedPayslip.payroll_item.payroll_run.period_end}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payslips Management</h1>
        <p className="text-sm text-[var(--color-text-muted)]">View and manage all issued payslips</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search worker..."
          value={filterWorker}
          onChange={(e) => setFilterWorker(e.target.value)}
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full sm:w-48"
        />
        <input
          type="text"
          placeholder="Search period..."
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full sm:w-48"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="all">All Statuses</option>
          <option value="issued">Issued</option>
          <option value="superseded">Superseded</option>
          <option value="void">Void</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm text-blue-700 font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkVoid}
            disabled={voidMutation.isPending}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Void Selected
          </button>
        </div>
      )}

      {/* Payslips Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            No payslips found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={selectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Worker</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Period</th>
                  <th className="text-right px-4 py-2 font-medium text-[var(--color-text-muted)]">Net Pay</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Issued</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filtered.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(payslip.id)}
                        onChange={() => toggleSelect(payslip.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-medium">{payslip.worker?.full_name ?? 'Unknown'}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{payslip.worker?.employee_id}</p>
                    </td>
                    <td className="px-4 py-2">
                      {formatPeriod(payslip.payroll_item?.payroll_run?.period_start ?? '')}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-medium">
                      {payslip.payroll_item ? formatCurrency(payslip.payroll_item.net_pay) : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[payslip.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {payslip.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-text-muted)]">
                      {new Date(payslip.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setSelectedPayslip(payslip)}
                        className="text-[var(--color-primary)] hover:underline text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
