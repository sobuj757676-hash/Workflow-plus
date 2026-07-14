import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { AttendanceEntryRow, WorkerRow } from '@/types/database'

export function CorrectionRequestPage() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<AttendanceEntryRow | null>(null)
  const [reason, setReason] = useState('')
  const [proposedTimeIn, setProposedTimeIn] = useState('')
  const [proposedTimeOut, setProposedTimeOut] = useState('')
  const [proposedOtHours, setProposedOtHours] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch locked/approved entries for this supervisor's workers
  const { data: lockedEntries, isLoading } = useQuery({
    queryKey: ['locked-entries', user?.id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('*')
        .eq('supervisor_id', user!.id)
        .or('locked.eq.true,approval_status.eq.approved')
        .order('date', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as AttendanceEntryRow[]
    },
    enabled: !!user?.id,
  })

  // Fetch workers for display
  const { data: workers } = useQuery({
    queryKey: ['my-workers-list', tenantId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, employee_id')
        .eq('tenant_id', tenantId!)
        .eq('current_supervisor_id', user!.id)
      if (error) throw error
      return data as Pick<WorkerRow, 'id' | 'full_name' | 'employee_id'>[]
    },
    enabled: !!user?.id && !!tenantId,
  })

  const workerMap = new Map(workers?.map((w) => [w.id, w]) ?? [])

  // Submit correction request
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEntry || !reason.trim()) throw new Error('Please fill in all required fields.')

      // Store as a remark/correction in the DB
      // In a real app, this would go to a correction_requests table
      // For now we'll use a custom approach with the attendance_entries table
      const { error } = await supabase.from('attendance_entries').update({
        remark: `[CORRECTION REQUEST] ${reason}. Proposed: ${proposedTimeIn || 'same'}-${proposedTimeOut || 'same'}, OT: ${proposedOtHours || 'same'}`,
      }).eq('id', selectedEntry.id)

      if (error) throw error
    },
    onSuccess: () => {
      setSuccess('Correction request submitted successfully.')
      setShowForm(false)
      setSelectedEntry(null)
      setReason('')
      setProposedTimeIn('')
      setProposedTimeOut('')
      setProposedOtHours('')
      queryClient.invalidateQueries({ queryKey: ['locked-entries'] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    submitMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Correction Requests</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Request corrections for locked or approved attendance entries
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Correction Form */}
      {showForm && selectedEntry && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Request Correction</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Entry: {workerMap.get(selectedEntry.worker_id)?.full_name ?? 'Worker'} - {selectedEntry.date}
            {selectedEntry.time_in && ` (${selectedEntry.time_in} - ${selectedEntry.time_out})`}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Reason for Correction <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this entry needs correction..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Proposed Time In</label>
                <input
                  type="text"
                  value={proposedTimeIn}
                  onChange={(e) => setProposedTimeIn(e.target.value)}
                  placeholder="e.g. 08:00"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Proposed Time Out</label>
                <input
                  type="text"
                  value={proposedTimeOut}
                  onChange={(e) => setProposedTimeOut(e.target.value)}
                  placeholder="e.g. 17:00"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Proposed OT Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={proposedOtHours}
                  onChange={(e) => setProposedOtHours(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setSelectedEntry(null) }}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locked entries list */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-medium text-sm">Locked/Approved Entries</h3>
          <p className="text-xs text-[var(--color-text-muted)]">Select an entry to request a correction</p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Loading entries...</div>
        ) : !lockedEntries || lockedEntries.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            No locked or approved entries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Worker</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Time</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">OT</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {lockedEntries.map((entry) => {
                  const w = workerMap.get(entry.worker_id)
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{w?.full_name ?? 'Unknown'}</td>
                      <td className="px-4 py-2">{entry.date}</td>
                      <td className="px-4 py-2">{entry.time_in ?? '-'} - {entry.time_out ?? '-'}</td>
                      <td className="px-4 py-2">{entry.ot_hours ?? 0}h</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.approval_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.locked ? 'Locked' : entry.approval_status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => { setSelectedEntry(entry); setShowForm(true) }}
                          className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                        >
                          Request Correction
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
