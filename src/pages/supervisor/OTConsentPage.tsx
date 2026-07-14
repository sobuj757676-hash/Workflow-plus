import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkerRow, OtWorkType } from '@/types/database'

const WORK_TYPES: { value: OtWorkType; label: string }[] = [
  { value: 'ot', label: 'Overtime' },
  { value: 'rest_day', label: 'Rest Day Work' },
  { value: 'public_holiday', label: 'Public Holiday Work' },
]

interface OtConsentRow {
  id: string
  tenant_id: string
  worker_id: string
  supervisor_id: string
  date: string
  time_from: string
  time_to: string
  work_type: OtWorkType
  status: string
  worker_response_at: string | null
  created_at: string
}

export function OTConsentPage() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const [workType, setWorkType] = useState<OtWorkType>('ot')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch workers
  const { data: workers } = useQuery({
    queryKey: ['my-workers', user?.id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('current_supervisor_id', user!.id)
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data as WorkerRow[]
    },
    enabled: !!user?.id && !!tenantId,
  })

  // Fetch existing OT consents
  const { data: consents, isLoading } = useQuery({
    queryKey: ['ot-consents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ot_consents')
        .select('*')
        .eq('supervisor_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as OtConsentRow[]
    },
    enabled: !!user?.id,
  })

  const workerMap = new Map(workers?.map((w) => [w.id, w]) ?? [])

  // Create OT consent
  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedWorkers.length === 0) throw new Error('Please select at least one worker.')
      if (!date) throw new Error('Date is required.')
      if (!timeFrom || !timeTo) throw new Error('Time from and time to are required.')

      const rows = selectedWorkers.map((workerId) => ({
        tenant_id: tenantId!,
        worker_id: workerId,
        supervisor_id: user!.id,
        date,
        time_from: timeFrom,
        time_to: timeTo,
        work_type: workType,
        status: 'requested',
      }))

      const { error } = await supabase.from('ot_consents').insert(rows)
      if (error) throw error
    },
    onSuccess: () => {
      setSuccess('OT consent requests created successfully.')
      setShowForm(false)
      setSelectedWorkers([])
      setTimeFrom('')
      setTimeTo('')
      queryClient.invalidateQueries({ queryKey: ['ot-consents'] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  function toggleWorker(id: string) {
    setSelectedWorkers((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">OT Consents</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Request worker consent for overtime, rest day, or public holiday work
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New OT Request
        </button>
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

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">New OT Consent Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Worker Multi-Select */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Workers <span className="text-red-500">*</span>
              </label>
              {!workers || workers.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No workers assigned to you.</p>
              ) : (
                <div className="border border-[var(--color-border)] rounded-lg max-h-48 overflow-y-auto divide-y divide-[var(--color-border)]">
                  {workers.map((worker) => (
                    <label
                      key={worker.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedWorkers.includes(worker.id)}
                        onChange={() => toggleWorker(worker.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{worker.full_name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {worker.employee_id}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {selectedWorkers.length > 0 && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {selectedWorkers.length} worker(s) selected
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Work Type <span className="text-red-500">*</span></label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value as OtWorkType)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {WORK_TYPES.map((wt) => (
                    <option key={wt.value} value={wt.value}>{wt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Time From <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time To <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Send Consent Requests'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Consents */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-medium text-sm">Sent Requests</h3>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Loading...</div>
        ) : !consents || consents.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            No OT consent requests yet. Click "New OT Request" to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Worker</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Time</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Type</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {consents.map((consent) => {
                  const w = workerMap.get(consent.worker_id)
                  return (
                    <tr key={consent.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{w?.full_name ?? 'Unknown'}</td>
                      <td className="px-4 py-2">{consent.date}</td>
                      <td className="px-4 py-2">{consent.time_from} - {consent.time_to}</td>
                      <td className="px-4 py-2 capitalize">{consent.work_type.replace('_', ' ')}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          consent.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : consent.status === 'declined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {consent.status}
                        </span>
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
