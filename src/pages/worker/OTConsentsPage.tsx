import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import { SignaturePad } from '@/components/SignaturePad'

interface OtConsentRow {
  id: string
  worker_id: string
  requested_by: string
  site_id: string | null
  work_type: string
  date: string
  time_from: string | null
  time_to: string | null
  status: string
  responded_at: string | null
  created_at: string
}

export function WorkerOTConsentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  // Get worker record
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

  // Fetch OT consents
  const { data: consents, isLoading } = useQuery({
    queryKey: ['my-ot-consents', worker?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_consents')
        .select('*')
        .eq('worker_id', worker!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as OtConsentRow[]
    },
    enabled: !!worker?.id,
  })

  // Respond mutation
  const respondMutation = useMutation({
    mutationFn: async ({ consentId, response }: { consentId: string; response: 'approved' | 'declined' }) => {
      const { error } = await supabase
        .from('ot_consents')
        .update({
          status: response,
          responded_at: new Date().toISOString(),
        } as any)
        .eq('id', consentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-ot-consents'] })
      setRespondingTo(null)
      setSignature(null)
    },
  })

  function handleApprove(consentId: string) {
    respondMutation.mutate({ consentId, response: 'approved' })
  }

  function handleDecline(consentId: string) {
    respondMutation.mutate({ consentId, response: 'declined' })
  }

  const pendingConsents = consents?.filter((c) => c.status === 'requested') ?? []
  const pastConsents = consents?.filter((c) => c.status !== 'requested') ?? []

  const workTypeLabels: Record<string, string> = {
    ot: 'Overtime',
    rest_day: 'Rest Day Work',
    public_holiday: 'Public Holiday Work',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">OT Consents</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Review and respond to overtime/rest day work requests
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

      {/* Pending Consents */}
      {pendingConsents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-700 mb-3">
            Pending ({pendingConsents.length})
          </h2>
          <div className="space-y-3">
            {pendingConsents.map((consent) => (
              <div key={consent.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {workTypeLabels[consent.work_type] ?? consent.work_type}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {new Date(consent.created_at).toLocaleDateString('en-SG')}
                  </span>
                </div>
                <p className="text-sm font-medium">
                  Date: {new Date(consent.date).toLocaleDateString('en-SG', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                {consent.time_from && consent.time_to && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Time: {consent.time_from} - {consent.time_to}
                  </p>
                )}

                {respondingTo === consent.id ? (
                  <div className="mt-3 space-y-3">
                    <SignaturePad
                      label="Your Signature (to approve)"
                      onSignatureChange={setSignature}
                      width={280}
                      height={100}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(consent.id)}
                        disabled={!signature || respondMutation.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        Sign & Approve
                      </button>
                      <button
                        onClick={() => handleDecline(consent.id)}
                        disabled={respondMutation.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => { setRespondingTo(null); setSignature(null) }}
                        className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <button
                      onClick={() => setRespondingTo(consent.id)}
                      className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
                    >
                      Respond
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Consents */}
      {pastConsents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-3">
            History ({pastConsents.length})
          </h2>
          <div className="bg-white rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {pastConsents.map((consent) => (
              <div key={consent.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {new Date(consent.date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {workTypeLabels[consent.work_type] ?? consent.work_type}
                    </span>
                  </div>
                  {consent.time_from && consent.time_to && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {consent.time_from} - {consent.time_to}
                    </p>
                  )}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  consent.status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {consent.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && (!consents || consents.length === 0) && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
          <span className="text-4xl">⏰</span>
          <p className="mt-3 font-medium">No OT consent requests</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            You'll see requests here when your supervisor schedules overtime or rest day work.
          </p>
        </div>
      )}
    </div>
  )
}
