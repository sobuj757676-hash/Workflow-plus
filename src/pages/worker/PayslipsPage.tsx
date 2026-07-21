import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { PayslipRow, PayrollItemRow } from '@/types/database'

interface PayslipWithItem extends PayslipRow {
  payroll_item?: PayrollItemRow
}

export function WorkerPayslipsPage() {
  const { user } = useAuth()

  // Get the worker record for this user
  const { data: worker } = useQuery({
    queryKey: ['my-worker', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // Fetch payslips for this worker
  const { data: payslips, isLoading } = useQuery({
    queryKey: ['my-payslips', worker?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*, payroll_items(*)')
        .eq('worker_id', worker!.id)
        .order('issued_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((p: any) => ({
        ...p,
        payroll_item: p.payroll_items,
      })) as PayslipWithItem[]
    },
    enabled: !!worker?.id,
  })

  function handleShare(payslip: PayslipWithItem) {
    if (navigator.share) {
      navigator.share({
        title: 'My Payslip',
        text: `Payslip verification: ${payslip.verification_code}`,
        url: `${window.location.origin}/verify/${payslip.verification_code}`,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(
        `${window.location.origin}/verify/${payslip.verification_code}`
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Payslips</h1>
        <p className="text-sm text-[var(--color-text-muted)]">View and download your payslips</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {!isLoading && (!payslips || payslips.length === 0) && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
          <span className="text-4xl">🧾</span>
          <p className="mt-3 font-medium">No payslips yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Your payslips will appear here after payroll is finalized.
          </p>
        </div>
      )}

      {payslips && payslips.length > 0 && (
        <div className="space-y-3">
          {payslips.map((payslip) => (
            <div
              key={payslip.id}
              className="bg-white rounded-xl border border-[var(--color-border)] p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {new Date(payslip.issued_at).toLocaleDateString('en-SG', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      payslip.status === 'issued'
                        ? 'bg-green-100 text-green-800'
                        : payslip.status === 'superseded'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {payslip.status}
                    </span>
                  </div>
                  {payslip.payroll_item && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Net Pay:{' '}
                      <span className="font-semibold text-[var(--color-text)]">
                        ${payslip.payroll_item.net_pay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {payslip.pdf_url && (
                    <a
                      href={payslip.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => handleShare(payslip)}
                    className="px-3 py-1.5 text-sm text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Share
                  </button>
                </div>
              </div>

              {/* Breakdown */}
              {payslip.payroll_item && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-xs text-[var(--color-text-muted)]">Normal Pay</span>
                    <p className="text-sm font-medium">${payslip.payroll_item.normal_pay.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--color-text-muted)]">OT Pay</span>
                    <p className="text-sm font-medium">${payslip.payroll_item.ot_pay.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--color-text-muted)]">Allowance</span>
                    <p className="text-sm font-medium">${payslip.payroll_item.allowance.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--color-text-muted)]">Working Days</span>
                    <p className="text-sm font-medium">{payslip.payroll_item.working_days}</p>
                  </div>
                </div>
              )}

              {/* Verification code */}
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Verification: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px]">{payslip.verification_code}</code>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
