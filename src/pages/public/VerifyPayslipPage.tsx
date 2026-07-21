import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface VerificationResult {
  valid: boolean
  status?: string
  employee_name?: string
  period_start?: string
  period_end?: string
  net_pay_masked?: string
  issued_at?: string
  message?: string
}

export function VerifyPayslipPage() {
  const { code } = useParams<{ code: string }>()
  const [manualCode, setManualCode] = useState(code ?? '')

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['verify-payslip', code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('verify_payslip', {
        p_code: code!,
      })
      if (error) throw error
      return data as VerificationResult
    },
    enabled: !!code,
  })

  function handleManualVerify(e: React.FormEvent) {
    e.preventDefault()
    if (manualCode.trim()) {
      window.location.href = `/verify/${manualCode.trim()}`
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">WF</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Payslip Verification</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Verify the authenticity of a WorkFlow Pro payslip
          </p>
        </div>

        {/* Manual entry (if no code in URL) */}
        {!code && (
          <form onSubmit={handleManualVerify} className="mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-5">
              <label className="block text-sm font-medium mb-2">Verification Code</label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter code from payslip QR"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
              />
              <button
                type="submit"
                className="w-full mt-3 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                Verify
              </button>
            </div>
          </form>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-8 text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-[var(--color-primary)]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">Verifying payslip...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-5 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="font-semibold text-red-800 mb-1">Verification Failed</h3>
            <p className="text-sm text-red-600">Could not verify this payslip. Please check the code and try again.</p>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <div className={`rounded-xl border p-5 ${
            result.valid && result.status === 'issued'
              ? 'bg-green-50 border-green-200'
              : result.valid && result.status === 'superseded'
                ? 'bg-amber-50 border-amber-200'
                : result.valid && result.status === 'void'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-red-50 border-red-200'
          }`}>
            {/* Valid payslip */}
            {result.valid ? (
              <>
                <div className="text-center mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    result.status === 'issued' ? 'bg-green-100' : result.status === 'superseded' ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    {result.status === 'issued' ? (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                  </div>
                  <h3 className={`font-semibold text-lg ${
                    result.status === 'issued' ? 'text-green-800' : result.status === 'superseded' ? 'text-amber-800' : 'text-red-800'
                  }`}>
                    {result.status === 'issued'
                      ? 'Valid Payslip'
                      : result.status === 'superseded'
                        ? 'Superseded Payslip'
                        : 'Voided Payslip'}
                  </h3>
                  {result.status === 'superseded' && (
                    <p className="text-sm text-amber-600 mt-1">This payslip has been replaced by a newer version.</p>
                  )}
                  {result.status === 'void' && (
                    <p className="text-sm text-red-600 mt-1">This payslip has been voided and is no longer valid.</p>
                  )}
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/50">
                    <span className="text-sm text-[var(--color-text-muted)]">Employee</span>
                    <span className="text-sm font-medium">{result.employee_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/50">
                    <span className="text-sm text-[var(--color-text-muted)]">Period</span>
                    <span className="text-sm font-medium">
                      {result.period_start && result.period_end
                        ? `${new Date(result.period_start).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}`
                        : '-'}
                    </span>
                  </div>
                  {result.net_pay_masked && (
                    <div className="flex justify-between items-center py-2 border-b border-white/50">
                      <span className="text-sm text-[var(--color-text-muted)]">Net Pay</span>
                      <span className="text-sm font-medium">{result.net_pay_masked}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-[var(--color-text-muted)]">Issued</span>
                    <span className="text-sm font-medium">
                      {result.issued_at
                        ? new Date(result.issued_at).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '-'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Invalid / not found */
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="font-semibold text-red-800 mb-1">Invalid Payslip</h3>
                <p className="text-sm text-red-600">
                  {result.message || 'This verification code does not match any payslip in our system.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-8">
          WorkFlow Pro &copy; {new Date().getFullYear()} &mdash; Payslip Verification System
        </p>
      </div>
    </div>
  )
}
