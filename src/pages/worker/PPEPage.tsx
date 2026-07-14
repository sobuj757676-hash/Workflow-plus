import { useState } from 'react'
import { SignaturePad } from '@/components/SignaturePad'

interface PendingPPESignOff {
  formId: string
  siteName: string
  period: string
  items: { name: string; quantity: number }[]
  createdAt: string
}

// Mock pending PPE sign-offs for this worker
const MOCK_PENDING_PPE: PendingPPESignOff[] = [
  {
    formId: 'ppe1',
    siteName: 'Marina Bay Tower',
    period: '2024-03',
    items: [
      { name: 'Safety Helmet', quantity: 1 },
      { name: 'Safety Boots', quantity: 1 },
      { name: 'Hi-Vis Vest', quantity: 1 },
    ],
    createdAt: '2024-03-01T08:00:00Z',
  },
]

const MOCK_SIGNED_PPE: (PendingPPESignOff & { signedAt: string })[] = [
  {
    formId: 'ppe0',
    siteName: 'Marina Bay Tower',
    period: '2024-02',
    items: [
      { name: 'Safety Helmet', quantity: 1 },
      { name: 'Safety Boots', quantity: 1 },
    ],
    createdAt: '2024-02-01T08:00:00Z',
    signedAt: '2024-02-02T09:00:00Z',
  },
]

export function WorkerPPEPage() {
  const [pendingForms] = useState(MOCK_PENDING_PPE)
  const [signedForms] = useState(MOCK_SIGNED_PPE)
  const [signingForm, setSigningForm] = useState<PendingPPESignOff | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [signSuccess, setSignSuccess] = useState(false)

  function handleSign() {
    if (!signingForm || !signature) return
    // In production: save signature to Supabase
    setSigningForm(null)
    setSignature(null)
    setSignSuccess(true)
    setTimeout(() => setSignSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">PPE Sign-Off</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Acknowledge receipt of Personal Protective Equipment
        </p>
      </div>

      {/* Success message */}
      {signSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          PPE sign-off submitted successfully.
        </div>
      )}

      {/* Signing Form */}
      {signingForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-2">Sign PPE Acknowledgement</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            {signingForm.siteName} - {signingForm.period}
          </p>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-800 mb-1">Items received:</p>
            <ul className="text-sm text-blue-700 space-y-0.5">
              {signingForm.items.map((item, i) => (
                <li key={i}>- {item.name} (x{item.quantity})</li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            By signing below, I acknowledge that I have received the above PPE items and agree to use them properly on site.
          </p>

          <SignaturePad
            onSignatureChange={setSignature}
            width={300}
            height={150}
            label="Your Signature"
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
              onClick={() => { setSigningForm(null); setSignature(null) }}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending Sign-offs */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Pending Sign-offs</h2>
        {pendingForms.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 text-center text-[var(--color-text-muted)]">
            No pending PPE sign-offs. You are all caught up!
          </div>
        ) : (
          <div className="space-y-3">
            {pendingForms.map((form) => (
              <div key={form.formId} className="bg-white rounded-xl border border-amber-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{form.siteName}</h4>
                    <p className="text-sm text-[var(--color-text-muted)]">Period: {form.period}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.items.map((item, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                      {item.name}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setSigningForm(form)}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  Sign Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Previously Signed */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Previously Signed</h2>
        {signedForms.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 text-center text-[var(--color-text-muted)]">
            No previously signed forms.
          </div>
        ) : (
          <div className="space-y-3">
            {signedForms.map((form) => (
              <div key={form.formId} className="bg-white rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{form.siteName}</h4>
                    <p className="text-sm text-[var(--color-text-muted)]">Period: {form.period}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Signed
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.items.map((item, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                      {item.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Signed on {new Date(form.signedAt).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
