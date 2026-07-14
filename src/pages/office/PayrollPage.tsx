import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { PayrollRunRow } from '@/types/database'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  calculated: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  finalized: 'bg-purple-100 text-purple-800',
}

export function PayrollPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Fetch payroll runs
  const { data: runs, isLoading } = useQuery({
    queryKey: ['payroll-runs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('period_start', { ascending: false })
      if (error) throw error
      return data as PayrollRunRow[]
    },
    enabled: !!tenantId,
  })

  // Check pending attendance for the selected period
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-attendance-count', tenantId, selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number)
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const periodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const { count, error } = await supabase
        .from('attendance_entries')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!)
        .gte('date', periodStart)
        .lte('date', periodEnd)
        .in('approval_status', ['pending', 'submitted'])
      if (error) throw error
      return count ?? 0
    },
    enabled: !!tenantId && showModal,
  })

  // Create payroll run mutation
  const createRunMutation = useMutation({
    mutationFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number)
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const periodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const { data, error } = await supabase
        .from('payroll_runs')
        .insert({
          tenant_id: tenantId!,
          period_start: periodStart,
          period_end: periodEnd,
          status: 'draft',
          total_cost: null,
        })
        .select()
        .single()
      if (error) throw error
      return data as PayrollRunRow
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] })
      setShowModal(false)
      navigate(`/office/payroll/${data.id}`)
    },
  })

  function formatPeriod(start: string, _end: string) {
    const d = new Date(start + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  function formatCurrency(amount: number | null) {
    if (amount == null) return '-'
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Run and manage payroll cycles</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Payroll Run
        </button>
      </div>

      {/* Payroll runs list */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : !runs || runs.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            No payroll runs yet. Create one after approving attendance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)]">Total Cost</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {formatPeriod(run.period_start, run.period_end)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[run.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(run.total_cost)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {new Date(run.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/office/payroll/${run.id}`)}
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

      {/* New Payroll Run Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-lg font-bold mb-4">New Payroll Run</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pay Period</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {pendingCount != null && pendingCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    <strong>{pendingCount} attendance {pendingCount === 1 ? 'entry' : 'entries'}</strong> not yet approved for this period. Consider approving them first.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createRunMutation.mutate()}
                disabled={createRunMutation.isPending}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
              >
                {createRunMutation.isPending ? 'Creating...' : 'Create Payroll Run'}
              </button>
            </div>

            {createRunMutation.isError && (
              <p className="mt-3 text-sm text-red-600">
                Failed to create payroll run. Please try again.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
