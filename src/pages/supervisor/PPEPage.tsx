import { useState } from 'react'
import { SignaturePad } from '@/components/SignaturePad'
import type { PPEFormRow } from '@/types/database'

// Mock PPE forms for supervisor's site
const MOCK_SUPERVISOR_PPE_FORMS: PPEFormRow[] = [
  {
    id: 'ppe1',
    tenant_id: 't1',
    site_id: 's1',
    site_name: 'Marina Bay Tower',
    period: '2024-03',
    items: [
      { name: 'Safety Helmet', quantity: 10 },
      { name: 'Safety Boots', quantity: 10 },
      { name: 'Hi-Vis Vest', quantity: 10 },
    ],
    sign_offs: [
      { worker_id: 'w1', worker_name: 'Ali bin Hassan', signed: true, signature_id: 'sig1', signed_at: '2024-03-05T08:00:00Z' },
      { worker_id: 'w2', worker_name: 'Kumar Rajan', signed: false, signature_id: null, signed_at: null },
      { worker_id: 'w3', worker_name: 'Chen Wei Ming', signed: false, signature_id: null, signed_at: null },
    ],
    status: 'open',
    created_by: 'admin',
    created_at: '2024-03-01T08:00:00Z',
    updated_at: '2024-03-05T08:00:00Z',
  },
]

export function SupervisorPPEPage() {
  const [forms] = useState<PPEFormRow[]>(MOCK_SUPERVISOR_PPE_FORMS)
  const [signingFor, setSigningFor] = useState<{ formId: string; workerId: string; workerName: string } | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  function handleSign() {
    if (!signingFor || !signature) return
    // In production: save signature and update sign-off
    setSigningFor(null)
    setSignature(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">PPE Sign-Off</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          PPE forms for your site. Workers can sign to acknowledge PPE receipt.
        </p>
      </div>

      {/* Signing Modal */}
      {signingFor && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-2">
            Sign PPE Acknowledgement for {signingFor.workerName}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            By signing, the worker acknowledges receipt of PPE items listed in this form.
          </p>
          <SignaturePad
            onSignatureChange={setSignature}
            width={300}
            height={150}
            label="Worker Signature"
          />
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSign}
              disabled={!signature}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
            >
              Submit Signature
            </button>
            <button
              onClick={() => { setSigningFor(null); setSignature(null) }}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Forms */}
      {forms.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
          No PPE forms for your site yet.
        </div>
      ) : (
        forms.map((form) => {
          const signedCount = form.sign_offs.filter((s) => s.signed).length
          const totalCount = form.sign_offs.length

          return (
            <div key={form.id} className="bg-white rounded-xl border border-[var(--color-border)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{form.site_name}</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">Period: {form.period}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  signedCount === totalCount
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {signedCount}/{totalCount} signed
                </span>
              </div>

              {/* Items */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-[var(--color-text-muted)] uppercase mb-2">PPE Items</h4>
                <div className="flex flex-wrap gap-2">
                  {form.items.map((item, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {item.name} x{item.quantity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Workers */}
              <div>
                <h4 className="text-xs font-medium text-[var(--color-text-muted)] uppercase mb-2">Workers</h4>
                <div className="space-y-2">
                  {form.sign_offs.map((signOff) => (
                    <div
                      key={signOff.worker_id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                    >
                      <span className="text-sm font-medium">{signOff.worker_name}</span>
                      {signOff.signed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Signed
                        </span>
                      ) : (
                        <button
                          onClick={() => setSigningFor({ formId: form.id, workerId: signOff.worker_id, workerName: signOff.worker_name })}
                          className="px-3 py-1 text-xs font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          Sign
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
