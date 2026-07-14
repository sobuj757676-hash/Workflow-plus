import { useParams, useNavigate } from 'react-router-dom'
import { WorkRecordCard } from '@/pages/shared/WorkRecordCard'

export function SupervisorWorkRecordCardPage() {
  const { workerId } = useParams<{ workerId: string }>()
  const navigate = useNavigate()

  if (!workerId) {
    return (
      <div className="text-center text-[var(--color-text-muted)] py-8">
        Worker not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate('/supervisor/attendance')}
          className="text-sm text-[var(--color-primary)] hover:underline mb-2 inline-flex items-center gap-1"
        >
          &larr; Back to Attendance
        </button>
        <h1 className="text-2xl font-bold">Work Record Card</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Monthly attendance overview</p>
      </div>

      <WorkRecordCard workerId={workerId} showActions />
    </div>
  )
}
