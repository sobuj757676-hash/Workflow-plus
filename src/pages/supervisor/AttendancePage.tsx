import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkerRow, AttendanceEntryRow } from '@/types/database'

export function SupervisorAttendancePage() {
  const { user, tenantId } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  // Fetch workers assigned to this supervisor
  const { data: workers, isLoading: loadingWorkers } = useQuery({
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

  // Fetch today's attendance entries for these workers
  const workerIds = workers?.map((w) => w.id) ?? []
  const { data: todayEntries } = useQuery({
    queryKey: ['today-attendance', today, workerIds],
    queryFn: async () => {
      if (workerIds.length === 0) return []
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('*')
        .in('worker_id', workerIds)
        .eq('date', today)
      if (error) throw error
      return data as AttendanceEntryRow[]
    },
    enabled: workerIds.length > 0,
  })

  const entryMap = new Map<string, AttendanceEntryRow>()
  todayEntries?.forEach((e) => entryMap.set(e.worker_id, e))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Attendance</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Record attendance for your workers - {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Workers List */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {loadingWorkers ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading workers...
          </div>
        ) : !workers || workers.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            <p className="mb-2">No workers assigned to you yet.</p>
            <p className="text-xs">Workers will appear here once the office assigns them to you.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {workers.map((worker) => {
              const entry = entryMap.get(worker.id)
              return (
                <div
                  key={worker.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Photo placeholder */}
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-semibold text-sm shrink-0">
                    {worker.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  {/* Worker info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{worker.full_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {worker.employee_id} | {worker.occupation ?? 'Worker'}
                    </p>
                  </div>

                  {/* Today's status */}
                  <div className="text-right shrink-0">
                    {entry ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.status === 'present' || entry.status === 'ot'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : entry.status === 'mc' || entry.status === 'leave'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {entry.status.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">Not recorded</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/supervisor/attendance/${worker.id}`}
                      className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
                    >
                      {entry ? 'Edit' : 'Record'}
                    </Link>
                    <Link
                      to={`/supervisor/attendance/card/${worker.id}`}
                      className="px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                      title="View Work Record Card"
                    >
                      Card
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Submit Section */}
      {workers && workers.length > 0 && todayEntries && todayEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">
                {todayEntries.length} / {workers.length} recorded today
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Submit completed attendance for office approval
              </p>
            </div>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              disabled={todayEntries.filter((e) => e.approval_status === 'pending').length === 0}
              onClick={async () => {
                const pendingIds = todayEntries
                  .filter((e) => e.approval_status === 'pending')
                  .map((e) => e.id)
                if (pendingIds.length === 0) return
                await supabase
                  .from('attendance_entries')
                  .update({ approval_status: 'submitted' })
                  .in('id', pendingIds)
              }}
            >
              Submit for Approval
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
