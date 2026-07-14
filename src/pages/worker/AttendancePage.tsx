import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { WorkRecordCard } from '@/pages/shared/WorkRecordCard'

export function WorkerAttendancePage() {
  const { user } = useAuth()

  // Fetch worker record to get worker_id
  const { data: workerRecord, isLoading } = useQuery({
    queryKey: ['worker-record', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, employee_id')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data as { id: string; full_name: string; employee_id: string }
    },
    enabled: !!user?.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Your digital work record card</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
          <svg className="animate-spin h-5 w-5 mx-auto mb-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      ) : !workerRecord ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
          <p>Worker profile not found. Please contact your office administrator.</p>
        </div>
      ) : (
        <WorkRecordCard workerId={workerRecord.id} showActions={false} />
      )}
    </div>
  )
}
