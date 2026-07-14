import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { AttendanceEntryRow, WorkerRow, UserRow } from '@/types/database'

type TabType = 'submitted' | 'approved' | 'rejected'

export function OfficeAttendancePage() {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<TabType>('submitted')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch attendance entries by tab
  const { data: entries, isLoading } = useQuery({
    queryKey: ['attendance-review', tenantId, tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('approval_status', tab)
        .order('date', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as AttendanceEntryRow[]
    },
    enabled: !!tenantId,
  })

  // Fetch workers for display
  const { data: workers } = useQuery({
    queryKey: ['all-workers', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, employee_id')
        .eq('tenant_id', tenantId!)
      if (error) throw error
      return data as Pick<WorkerRow, 'id' | 'full_name' | 'employee_id'>[]
    },
    enabled: !!tenantId,
  })

  // Fetch supervisors for display
  const { data: supervisors } = useQuery({
    queryKey: ['all-supervisors', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('tenant_id', tenantId!)
        .eq('role', 'supervisor')
      if (error) throw error
      return data as Pick<UserRow, 'id' | 'full_name' | 'email'>[]
    },
    enabled: !!tenantId,
  })

  const workerMap = new Map(workers?.map((w) => [w.id, w]) ?? [])
  const supervisorMap = new Map(supervisors?.map((s) => [s.id, s]) ?? [])

  // Approve/Reject mutations
  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('attendance_entries')
        .update({
          approval_status: 'approved',
          approved_by: user!.id,
          approved_at: new Date().toISOString(),
          locked: true,
        })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['attendance-review'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('attendance_entries')
        .update({
          approval_status: 'rejected',
          approved_by: user!.id,
          approved_at: new Date().toISOString(),
        })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['attendance-review'] })
    },
  })

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (!entries) return
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)))
    }
  }

  function handleBulkApprove() {
    if (selectedIds.size === 0) return
    approveMutation.mutate(Array.from(selectedIds))
  }

  function handleBulkReject() {
    if (selectedIds.size === 0) return
    rejectMutation.mutate(Array.from(selectedIds))
  }

  const pendingCount = entries?.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance Review</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Review and approve attendance submissions from supervisors
          </p>
        </div>
        {tab === 'submitted' && pendingCount > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            {pendingCount} pending review
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {(['submitted', 'approved', 'rejected'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedIds(new Set()) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {tab === 'submitted' && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm text-blue-700 font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={approveMutation.isPending}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Approve Selected
          </button>
          <button
            onClick={handleBulkReject}
            disabled={rejectMutation.isPending}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Reject Selected
          </button>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            {tab === 'submitted'
              ? 'No pending attendance to review.'
              : tab === 'approved'
                ? 'No approved entries.'
                : 'No rejected entries.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  {tab === 'submitted' && (
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === entries.length}
                        onChange={selectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Worker</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Time</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Normal</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">OT</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Supervisor</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Status</th>
                  {tab === 'submitted' && (
                    <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {entries.map((entry) => {
                  const w = workerMap.get(entry.worker_id)
                  const s = entry.supervisor_id ? supervisorMap.get(entry.supervisor_id) : null
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      {tab === 'submitted' && (
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      <td className="px-4 py-2 font-medium">
                        {w?.full_name ?? 'Unknown'}
                        <br />
                        <span className="text-xs text-[var(--color-text-muted)]">{w?.employee_id}</span>
                      </td>
                      <td className="px-4 py-2">{entry.date}</td>
                      <td className="px-4 py-2">
                        {entry.time_in ?? '-'} - {entry.time_out ?? '-'}
                      </td>
                      <td className="px-4 py-2">{entry.normal_hours ?? '-'}h</td>
                      <td className="px-4 py-2 font-medium">
                        {entry.ot_hours && entry.ot_hours > 0 ? `${entry.ot_hours}h` : '-'}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {s?.full_name ?? s?.email ?? '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.status === 'present' || entry.status === 'ot'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.status.replace('_', ' ')}
                        </span>
                      </td>
                      {tab === 'submitted' && (
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => approveMutation.mutate([entry.id])}
                              disabled={approveMutation.isPending}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate([entry.id])}
                              disabled={rejectMutation.isPending}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
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
