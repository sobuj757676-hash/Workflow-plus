import type { PayrollItemRow, WorkerRow, PayslipRow } from '@/types/database'

interface PayslipViewProps {
  payrollItem: PayrollItemRow
  worker: Pick<WorkerRow, 'full_name' | 'employee_id' | 'occupation'>
  payslip: Pick<PayslipRow, 'verification_code' | 'issued_at' | 'status'>
  periodStart: string
  periodEnd?: string
  companyName?: string
}

export function PayslipView({
  payrollItem,
  worker,
  payslip,
  periodStart,
  companyName = 'WorkFlow Pro',
}: PayslipViewProps) {
  const period = formatPeriodLabel(periodStart)
  const totalDeductions = (payrollItem.deductions ?? []).reduce((sum, d) => sum + d.amount, 0)
  const totalDeductionAmount = payrollItem.advance + totalDeductions

  function handlePrint() {
    window.print()
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `Payslip - ${period}`,
        text: `Payslip for ${worker.full_name} - ${period}. Net salary: ${formatCurrency(payrollItem.net_pay)}`,
      }).catch(() => {
        // User cancelled or share not supported
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Action buttons (hidden in print) */}
      <div className="flex items-center justify-end gap-2 mb-4 print:hidden">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Download PDF
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        )}
      </div>

      {/* Payslip Card */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm print:shadow-none print:border-none">
        {/* Company Header */}
        <div className="bg-[var(--color-primary)] text-white px-6 py-4">
          <h2 className="text-lg font-bold">{companyName}</h2>
          <p className="text-sm opacity-80">Payslip</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Employee Name</p>
              <p className="font-medium">{worker.full_name}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Employee ID</p>
              <p className="font-medium">{worker.employee_id}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Designation</p>
              <p className="font-medium">{worker.occupation ?? '-'}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Pay Period</p>
              <p className="font-medium">{period}</p>
            </div>
          </div>

          <hr className="border-[var(--color-border)]" />

          {/* Attendance Summary */}
          <div>
            <h3 className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-medium mb-2">
              Attendance Summary
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{payrollItem.working_days}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Working Days</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{payrollItem.normal_hours}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Normal Hours</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{payrollItem.ot_hours}</p>
                <p className="text-xs text-[var(--color-text-muted)]">OT Hours</p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--color-border)]" />

          {/* Earnings */}
          <div>
            <h3 className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-medium mb-3">
              Earnings
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Basic Pay</span>
                <span className="font-mono">{formatCurrency(payrollItem.normal_pay)}</span>
              </div>
              {payrollItem.ot_pay > 0 && (
                <div className="flex justify-between">
                  <span>Overtime Pay ({payrollItem.ot_hours} hrs)</span>
                  <span className="font-mono">{formatCurrency(payrollItem.ot_pay)}</span>
                </div>
              )}
              {payrollItem.rest_day_pay > 0 && (
                <div className="flex justify-between">
                  <span>Rest Day Pay ({payrollItem.rest_day_hours} hrs)</span>
                  <span className="font-mono">{formatCurrency(payrollItem.rest_day_pay)}</span>
                </div>
              )}
              {payrollItem.ph_pay > 0 && (
                <div className="flex justify-between">
                  <span>Public Holiday Pay ({payrollItem.ph_hours} hrs)</span>
                  <span className="font-mono">{formatCurrency(payrollItem.ph_pay)}</span>
                </div>
              )}
              {payrollItem.allowance > 0 && (
                <div className="flex justify-between">
                  <span>Allowance</span>
                  <span className="font-mono">{formatCurrency(payrollItem.allowance)}</span>
                </div>
              )}
              {payrollItem.transport > 0 && (
                <div className="flex justify-between">
                  <span>Transport</span>
                  <span className="font-mono">{formatCurrency(payrollItem.transport)}</span>
                </div>
              )}
              {payrollItem.bonus > 0 && (
                <div className="flex justify-between">
                  <span>Bonus</span>
                  <span className="font-mono">{formatCurrency(payrollItem.bonus)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-dashed border-[var(--color-border)] font-medium">
                <span>Gross Salary</span>
                <span className="font-mono">{formatCurrency(payrollItem.gross_pay)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          {totalDeductionAmount > 0 && (
            <>
              <hr className="border-[var(--color-border)]" />
              <div>
                <h3 className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-medium mb-3">
                  Deductions
                </h3>
                <div className="space-y-2 text-sm">
                  {payrollItem.advance > 0 && (
                    <div className="flex justify-between">
                      <span>Advance</span>
                      <span className="font-mono text-red-600">-{formatCurrency(payrollItem.advance)}</span>
                    </div>
                  )}
                  {(payrollItem.deductions ?? []).map((d, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{d.description || d.type}</span>
                      <span className="font-mono text-red-600">-{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-dashed border-[var(--color-border)] font-medium">
                    <span>Total Deductions</span>
                    <span className="font-mono text-red-600">-{formatCurrency(totalDeductionAmount)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <hr className="border-[var(--color-border)]" />

          {/* Net Salary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-green-700 font-medium">Net Salary</p>
            <p className="text-2xl font-bold text-green-800 mt-1">
              {formatCurrency(payrollItem.net_pay)}
            </p>
          </div>

          {/* Verification */}
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-2">
            <span>Issued: {new Date(payslip.issued_at).toLocaleDateString()}</span>
            <span>QR: [{payslip.verification_code}]</span>
          </div>

          {payslip.status === 'void' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-red-800">This payslip has been voided</p>
            </div>
          )}
          {payslip.status === 'superseded' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-amber-800">This payslip has been superseded by a newer version</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPeriodLabel(periodStart: string): string {
  const d = new Date(periodStart + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
