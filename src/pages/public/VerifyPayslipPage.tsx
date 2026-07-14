import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface VerificationResult {
  valid: boolean
  employee_name: string | null
  period: string | null
  net_pay: number | null
  status: string
}

export function VerifyPayslipPage() {
  const { code } = useParams<{ code: string }>()

  const { data: result, isLoading, isError } = useQuery({
    queryKey: ['verify-payslip', code],
    queryFn: async (): Promise<VerificationResult> => {
      if (!code) return { valid: false, employee_name: null, period: null, net_pay: null, status: 'invalid' }

      const { data, error } = await supabase
        .from('payslips')
        .select(`
          status,
          worker:workers(full_name),
          payroll_item:payroll_items(
            net_pay,
            payroll_run:payroll_runs(period_start)
          )
        `)
        .eq('verification_code', code)
        .single()

      if (error || !data) {
        return { valid: false, employee_name: null, period: null, net_pay: null, status: 'invalid' }
      }

      const payslip = data as unknown as {
        status: string
        worker: { full_name: string } | null
        payroll_item: {
          net_pay: number
          payroll_run: { period_start: string }
        } | null
      }

      const fullName = payslip.worker?.full_name ?? ''
      const maskedName = maskName(fullName)
      const netPay = payslip.payroll_item?.net_pay ?? null
      const maskedPay = netPay !== null ? maskAmount(netPay) : null
      const periodStart = payslip.payroll_item?.payroll_run?.period_start
      const period = periodStart ? formatPeriod(periodStart) : null

      return {
        valid: true,
        employee_name: maskedName,
        period,
        net_pay: maskedPay,
        status: payslip.status,
      }
    },
    enabled: !!code,
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 w-full max-w-md shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">Payslip Verification</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Code: {code ?? 'N/A'}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <svg className="animate-spin h-6 w-6 mx-auto text-[var(--color-primary)]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">Verifying...</p>
          </div>
        ) : isError || !result ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="font-medium text-red-800">Verification Failed</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Could not verify this payslip.</p>
          </div>
        ) : !result.valid ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="font-medium text-red-800">Invalid</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              This verification code does not match any payslip in our records.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Valid badge */}
            {result.status === 'issued' ? (
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-green-800 text-lg">Valid Payslip</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="font-bold text-amber-800 text-lg capitalize">{result.status}</p>
              </div>
            )}

            {/* Warnings */}
            {result.status === 'void' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-sm text-red-800 font-medium">
                  This payslip has been voided and is no longer valid.
                </p>
              </div>
            )}
            {result.status === 'superseded' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-sm text-amber-800 font-medium">
                  This payslip has been superseded by a newer version.
                </p>
              </div>
            )}

            {/* Details */}
            <div className="border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)]">
              <div className="flex justify-between p-3">
                <span className="text-sm text-[var(--color-text-muted)]">Employee</span>
                <span className="text-sm font-medium">{result.employee_name ?? '-'}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-sm text-[var(--color-text-muted)]">Period</span>
                <span className="text-sm font-medium">{result.period ?? '-'}</span>
              </div>
              <div className="flex justify-between p-3">
                <span className="text-sm text-[var(--color-text-muted)]">Net Pay</span>
                <span className="text-sm font-medium font-mono">
                  {result.net_pay !== null ? `$*,${String(result.net_pay).slice(-3)}.00` : '-'}
                </span>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] text-center mt-4">
              This verification confirms the payslip was issued by WorkFlow Pro. For full details, contact the employer.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function maskName(name: string): string {
  if (!name) return ''
  const parts = name.split(' ')
  return parts
    .map((part) => {
      if (part.length <= 2) return part
      return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1]
    })
    .join(' ')
}

function maskAmount(amount: number): number {
  // Return last 3 digits to partially mask
  return amount % 1000
}

function formatPeriod(periodStart: string): string {
  const d = new Date(periodStart + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
