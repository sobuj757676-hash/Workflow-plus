import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { SignaturePad } from '@/components/SignaturePad'

interface PPEItem {
  name: string
  quantity: number
}

interface PPEForm {
  id: string
  site_id: string
  period: string
  items: PPEItem[]
  created_at: string
}

interface PPESignoff {
  id: string
  ppe_form_id: string
  worker_id: string
  acknowledged_at: string
}

export function WorkerPPEPage() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()
  const [signingFormId, setSigningFormId] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  // Get worker record
  const { data: worker } = useQuery({
    queryKey: ['my-worker', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, current_site_id')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data as { id: string; current_site_id: string | null }
    },
    enabled: !!user?.id,
  })

  // Fetch PPE forms for worker's current site
  const { data: forms, isLoading } = useQuery({
    queryKey: ['my-ppe-forms', worker?.current_site_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ppe_forms')
        .select('*')
        .eq('site_id', worker!.current_site_id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PPEForm[]
    },
    enabled: !!worker?.current_site_id,
  })

  // Fetch my signoffs
  const { data: mySignoffs } = useQuery({
    queryKey: ['my-ppe-signoffs', worker?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ppe_signoffs')
        .select('*')
        .eq('worker_id', worker!.id)
      if (error) throw error
      return data as PPESignoff[]
    },
    enabled: !!worker?.id,
  })

  const signedFormIds = new Set(mySignoffs?.map((s) => s.ppe_form_id) ?? [])

  // Sign mutation
  const signMutation = useMutation({
    mutationFn: async (formId: string) => {
      if (!worker?.id || !signature) throw new Error('Missing data')

      // Store signature first
      const { data: sigData, error: sigError } = await supabase
        .from('signatures')
        .insert({
          tenant_id: tenantId!,
          signer_user_id: user!.id,
          type: 'worker',
          image_url: signature,
          signed_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (sigError) throw sigError

      // Create signoff
      const { error } = await supabase.from('ppe_signoffs').insert({
        tenant_id: tenantId!,
        ppe_form_id: formId,
        worker_id: worker.id,
        signature_id: sigData.id,
        acknowledged_at: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-ppe-signoffs'] })
      setSigningFormId(null)
      setSignature(null)
    },
  })

  const pendingForms = forms?.filter((f) => !signedFormIds.has(f.id)) ?? []
  const signedForms = forms?.filter((f) => signedFormIds.has(f.id)) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PPE Sign-Off</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Acknowledge receipt of Personal Protective Equipment
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Signing Form */}
      {signingFormId && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-2">Sign PPE Acknowledgement</h3>
          {(() => {
            const form = forms?.find((f) => f.id === signingFormId)
            if (!form) return null
            return (
              <>
                <p className="text-sm text-[var(--color-text-muted)] mb-3">Period: {form.period}</p>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-medium text-blue-800 mb-1">Items received:</p>
                  <ul className="text-sm text-blue-700 space-y-0.5">
                    {(form.items as PPEItem[]).map((item, i) => (
                      <li key={i}>- {item.name} (x{item.quantity})</li>
                    ))}
                  </ul>
                </div>
              </>
            )
          })()}
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
              onClick={() => signMutation.mutate(signingFormId)}
              disabled={!signature || signMutation.isPending}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
            >
              {signMutation.isPending ? 'Submitting...' : 'Submit Signature'}
            </button>
            <button
              onClick={() => { setSigningFormId(null); setSignature(null) }}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending */}
      {pendingForms.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Pending Sign-offs</h2>
          <div className="space-y-3">
            {pendingForms.map((form) => (
              <div key={form.id} className="bg-white rounded-xl border border-amber-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">PPE Form</h4>
                    <p className="text-sm text-[var(--color-text-muted)]">Period: {form.period}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(form.items as PPEItem[]).map((item, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                      {item.name}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setSigningFormId(form.id)}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  Sign Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signed */}
      {signedForms.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Previously Signed</h2>
          <div className="space-y-3">
            {signedForms.map((form) => {
              const signoff = mySignoffs?.find((s) => s.ppe_form_id === form.id)
              return (
                <div key={form.id} className="bg-white rounded-xl border border-[var(--color-border)] p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">PPE Form</h4>
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
                    {(form.items as PPEItem[]).map((item, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {item.name}
                      </span>
                    ))}
                  </div>
                  {signoff && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Signed on {new Date(signoff.acknowledged_at).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!isLoading && (!forms || forms.length === 0) && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
          <span className="text-4xl">🦺</span>
          <p className="mt-3 font-medium">No PPE forms for your site</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            PPE forms will appear here when your company creates them for your site.
          </p>
        </div>
      )}
    </div>
  )
}
