import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkerRow, AttendanceEntryRow, SiteRow } from '@/types/database'

export function SupervisorDashboardPage() {
  const { user, tenantId } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  // Fetch workers assigned to this supervisor
  const { data: workers } = useQuery({
    queryKey: ['my-workers-dashboard', user?.id, tenantId],
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

  // Fetch today's attendance
  const workerIds = workers?.map((w) => w.id) ?? []
  const { data: todayEntries } = useQuery({
    queryKey: ['today-attendance-dash', today, workerIds],
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

  // Fetch supervisor's site
  const { data: mySite } = useQuery({
    queryKey: ['my-site', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('supervisor_id', user!.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as SiteRow | null
    },
    enabled: !!user?.id,
  })

  const entryMap = new Map<string, AttendanceEntryRow>()
  todayEntries?.forEach((e) => entryMap.set(e.worker_id, e))

  const totalWorkers = workers?.length ?? 0
  const presentCount = todayEntries?.filter((e) => e.status === 'present' || e.status === 'ot' || e.status === 'half_day').length ?? 0
  const pendingCount = totalWorkers - (todayEntries?.length ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {new Date().toLocaleDateString('en-SG', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">👷</span>
          <div className="text-2xl font-bold mt-2">{totalWorkers}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">My Workers</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">✅</span>
          <div className="text-2xl font-bold mt-2 text-green-600">{presentCount}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Present Today</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">⏳</span>
          <div className="text-2xl font-bold mt-2 text-amber-600">{pendingCount}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Not Recorded</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">🏗️</span>
          <div className="text-lg font-bold mt-2 truncate">{mySite?.name ?? 'No site'}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Current Site</div>
        </div>
      </div>

      {/* Quick Attendance */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Today's Workers</h3>
          <Link
            to="/supervisor/attendance"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Record Attendance
          </Link>
        </div>
        {!workers || workers.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No workers assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {workers.slice(0, 8).map((worker) => {
              const entry = entryMap.get(worker.id)
              return (
                <div key={worker.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-semibold text-xs">
                      {worker.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{worker.full_name}</span>
                  </div>
                  {entry ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.status === 'present' || entry.status === 'ot'
                        ? 'bg-green-100 text-green-800'
                        : entry.status === 'absent'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.status.replace('_', ' ')}
                    </span>
                  ) : (
                    <Link
                      to={`/supervisor/attendance/${worker.id}`}
                      className="px-3 py-1 text-xs font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Record
                    </Link>
                  )}
                </div>
              )
            })}
            {workers.length > 8 && (
              <p className="text-xs text-[var(--color-text-muted)] text-center pt-2">
                + {workers.length - 8} more workers
              </p>
            )}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/supervisor/attendance"
          className="bg-white rounded-xl border border-[var(--color-border)] p-4 hover:shadow-sm transition-shadow text-center"
        >
          <span className="text-2xl block mb-2">📋</span>
          <span className="text-sm font-medium">Record Attendance</span>
        </Link>
        <Link
          to="/supervisor/ot-consents"
          className="bg-white rounded-xl border border-[var(--color-border)] p-4 hover:shadow-sm transition-shadow text-center"
        >
          <span className="text-2xl block mb-2">⏰</span>
          <span className="text-sm font-medium">OT Consents</span>
        </Link>
        <Link
          to="/supervisor/ppe"
          className="bg-white rounded-xl border border-[var(--color-border)] p-4 hover:shadow-sm transition-shadow text-center"
        >
          <span className="text-2xl block mb-2">🦺</span>
          <span className="text-sm font-medium">PPE Sign-Off</span>
        </Link>
      </div>
    </div>
  )
}
