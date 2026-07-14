import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { SignaturePad } from '@/components/SignaturePad'

interface OtConsentRow {
  id: string
  tenant_id: string
  worker_id: string
  supervisor_id: string
  date: string
  time_from: string
  time_to: string
  work_type: string
  status: string
  worker_response_at: string | null
  created_at: string
}

export function WorkerOTConsentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [signingId, setSigningId] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  // Fetch worker record to get worker_id
  const { data: workerRecord } = useQuery({
    queryKey: ['worker-record', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data as { id: string }
    },
    enabled: !!user?.id,
  })

  // Fetch OT consents for this worker
  const { data: consents, isLoading } = useQuery({
    queryKey: ['my-ot-consents', workerRecord?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_consents')
        .select('*')
        .eq('worker_id', workerRecord!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as OtConsentRow[]
    },
    enabled: !!workerRecord?.id,
  })

  const pendingConsents = consents?.filter((c) => c.status === 'requested') ?? []
  const historyConsents = consents?.filter((c) => c.status !== 'requested') ?? []

  // Approve/Decline mutation
  const respondMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: 'approved' | 'declined' }) => {
      const { error } = await supabase
        .from('ot_consents')
        .update({
          status: response,
          worker_response_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-ot-consents'] })
      setSigningId(null)
      setSignature(null)
    },
  })

  function handleApprove(id: string) {
    setSigningId(id)
  }

  function confirmApprove() {
    if (!signingId) return
    respondMutation.mutate({ id: signingId, response: 'approved' })
  }

  function handleDecline(id: string) {
    if (confirm('Are you sure you want to decline this OT request?')) {
      respondMutation.mutate({ id, response: 'declined' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My OT Consents</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Review and respond to overtime consent requests
        </p>
      </div>

      {/* Signing Modal */}
      {signingId && (
        <div className="bg-white rounded-xl border-2 border-[var(--color-primary)] p-5 space-y-4">
          <h3 className="font-semibold">Sign to Approve OT Consent</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            By signing below, you consent to the overtime work request.
          </p>
          <SignaturePad
            label="Your Signature"
            onSignatureChange={setSignature}
            width={280}
            height={120}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={confirmApprove}
              disabled={!signature || respondMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {respondMutation.isPending ? 'Saving...' : 'Confirm Approval'}
            </button>
            <button
              onClick={() => { setSigningId(null); setSignature(null) }}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-amber-50">
          <h3 className="font-medium text-sm text-amber-900">
            Pending Requests
            {pendingConsents.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-200 text-amber-900">
                {pendingConsents.length}
              </span>
            )}
          </h3>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Loading...</div>
        ) : pendingConsents.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            No pending OT consent requests.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {pendingConsents.map((consent) => (
              <div key={consent.id} className="px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {consent.work_type === 'ot'
                        ? 'Overtime Work'
                        : consent.work_type === 'rest_day'
                          ? 'Rest Day Work'
                          : 'Public Holiday Work'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Date: {consent.date} | Time: {consent.time_from} - {consent.time_to}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Requested: {new Date(consent.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(consent.id)}
                      disabled={respondMutation.isPending}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecline(consent.id)}
                      disabled={respondMutation.isPending}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-medium text-sm">History</h3>
        </div>
        {historyConsents.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            No past consent records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Time</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Type</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Response</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Responded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {historyConsents.map((consent) => (
                  <tr key={consent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{consent.date}</td>
                    <td className="px-4 py-2">{consent.time_from} - {consent.time_to}</td>
                    <td className="px-4 py-2 capitalize">{consent.work_type.replace('_', ' ')}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        consent.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {consent.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--color-text-muted)]">
                      {consent.worker_response_at
                        ? new Date(consent.worker_response_at).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
