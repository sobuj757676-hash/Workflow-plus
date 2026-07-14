import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PayslipView } from '@/components/PayslipView'
import type { PayslipRow, PayrollItemRow, PayrollRunRow } from '@/types/database'

interface PayslipWithDetails extends PayslipRow {
  payroll_item: PayrollItemRow
  payroll_run: PayrollRunRow
}

export function WorkerPayslipsPage() {
  const { user } = useAuth()
  const [searchPeriod, setSearchPeriod] = useState('')
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipWithDetails | null>(null)

  // Fetch worker record for this user
  const { data: worker } = useQuery({
    queryKey: ['my-worker-record', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, employee_id, occupation')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // Fetch payslips
  const { data: payslips, isLoading } = useQuery({
    queryKey: ['my-payslips', worker?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          payroll_item:payroll_items(*),
          payroll_run:payroll_items(payroll_run:payroll_runs(*))
        `)
        .eq('worker_id', worker!.id)
        .eq('status', 'issued')
        .order('issued_at', { ascending: false })
      if (error) throw error
      return data as unknown as PayslipWithDetails[]
    },
    enabled: !!worker?.id,
  })

  // Simple filter by period text
  const filteredPayslips = payslips?.filter((p) => {
    if (!searchPeriod) return true
    const run = p.payroll_run
    if (!run) return true
    const periodLabel = formatPeriod(run.period_start)
    return periodLabel.toLowerCase().includes(searchPeriod.toLowerCase())
  })

  function formatPeriod(periodStart: string): string {
    const d = new Date(periodStart + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // If viewing a payslip detail
  if (selectedPayslip && worker) {
    const run = selectedPayslip.payroll_run
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
          worker={worker}
          payslip={selectedPayslip}
          periodStart={run.period_start}
          periodEnd={run.period_end}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Payslips</h1>
        <p className="text-sm text-[var(--color-text-muted)]">View and download your payslips</p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by period (e.g. January 2024)"
          value={searchPeriod}
          onChange={(e) => setSearchPeriod(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* Payslips List */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : !filteredPayslips || filteredPayslips.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            No payslips yet. They will appear here once payroll is finalized.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredPayslips.map((payslip) => {
              const run = payslip.payroll_run
              const item = payslip.payroll_item
              return (
                <div
                  key={payslip.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => setSelectedPayslip(payslip)}
                >
                  <div>
                    <p className="font-medium">
                      {run ? formatPeriod(run.period_start) : 'Unknown Period'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Issued {new Date(payslip.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono text-[var(--color-success)]">
                      {item ? formatCurrency(item.net_pay) : '-'}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                      {payslip.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
