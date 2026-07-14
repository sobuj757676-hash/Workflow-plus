import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AttendanceEntryRow, WorkerRow } from '@/types/database'

interface WorkRecordCardProps {
  workerId: string
  showActions?: boolean
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function formatTime(time: string | null): string {
  if (!time) return '-'
  return time
}

function getStatusBadge(approvalStatus: string) {
  switch (approvalStatus) {
    case 'approved':
      return (
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Approved" />
      )
    case 'pending':
      return (
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" title="Pending" />
      )
    case 'submitted':
      return (
        <span className="inline-block w-2 h-2 rounded-full bg-blue-500" title="Submitted" />
      )
    case 'rejected':
      return (
        <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Rejected" />
      )
    default:
      return null
  }
}

export function WorkRecordCard({ workerId, showActions = false }: WorkRecordCardProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const daysInMonth = getDaysInMonth(year, month)
  const monthName = new Date(year, month).toLocaleString('en', { month: 'long', year: 'numeric' })

  // Fetch worker info
  const { data: worker } = useQuery({
    queryKey: ['worker', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single()
      if (error) throw error
      return data as WorkerRow
    },
    enabled: !!workerId,
  })

  // Fetch attendance entries for this month
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const { data: entries, isLoading } = useQuery({
    queryKey: ['attendance-entries', workerId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('*')
        .eq('worker_id', workerId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
      if (error) throw error
      return data as AttendanceEntryRow[]
    },
    enabled: !!workerId,
  })

  // Map entries by day
  const entryByDay = useMemo(() => {
    const map = new Map<number, AttendanceEntryRow>()
    entries?.forEach((entry) => {
      const day = parseInt(entry.date.split('-')[2], 10)
      map.set(day, entry)
    })
    return map
  }, [entries])

  // Calculate summary
  const summary = useMemo(() => {
    let totalDays = 0
    let totalOt = 0
    let totalNormal = 0

    entries?.forEach((entry) => {
      if (entry.status === 'present' || entry.status === 'ot' || entry.status === 'half_day') {
        totalDays += entry.status === 'half_day' ? 0.5 : 1
      }
      totalOt += entry.ot_hours ?? 0
      totalNormal += entry.normal_hours ?? 0
    })

    // Calculate amount (basic estimate from worker rates)
    let totalAmount = 0
    if (worker) {
      if (worker.daily_rate) {
        totalAmount = totalDays * worker.daily_rate + totalOt * (worker.ot_rate ?? worker.daily_rate / 8 * 1.5)
      } else if (worker.hourly_rate) {
        totalAmount = totalNormal * worker.hourly_rate + totalOt * (worker.ot_rate ?? worker.hourly_rate * 1.5)
      }
    }

    return { totalDays, totalOt, totalNormal, totalAmount }
  }, [entries, worker])

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] hover:bg-gray-50"
        >
          &larr; Prev
        </button>
        <h3 className="font-semibold text-lg">{monthName}</h3>
        <button
          onClick={nextMonth}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] hover:bg-gray-50"
        >
          Next &rarr;
        </button>
      </div>

      {/* The Card */}
      <div className="bg-white rounded-xl border-2 border-amber-300 overflow-hidden shadow-sm">
        {/* Header - mimics the paper yellow card */}
        <div className="px-4 py-3 bg-amber-100 border-b-2 border-amber-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-amber-900 text-lg">WORK RECORD CARD</h3>
              <p className="text-sm text-amber-800">{monthName}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-amber-900 font-medium">{worker?.full_name ?? 'Loading...'}</p>
              <p className="text-amber-700">ID: {worker?.employee_id ?? '-'}</p>
            </div>
          </div>
          {worker && (
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-amber-800">
              {worker.occupation && <span>Occupation: {worker.occupation}</span>}
              {worker.nationality && <span>Nationality: {worker.nationality}</span>}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-amber-50 border-b border-amber-200">
              <tr>
                <th className="text-center px-2 py-2 font-semibold text-amber-900 w-10">Date</th>
                <th className="text-center px-2 py-2 font-semibold text-amber-900">Start</th>
                <th className="text-center px-2 py-2 font-semibold text-amber-900">End</th>
                <th className="text-center px-2 py-2 font-semibold text-amber-900">Hrs</th>
                <th className="text-center px-2 py-2 font-semibold text-amber-900">OT</th>
                <th className="text-center px-2 py-2 font-semibold text-amber-900">W.Sign</th>
                <th className="text-center px-2 py-2 font-semibold text-amber-900">S.Sign</th>
                <th className="text-left px-2 py-2 font-semibold text-amber-900">Remark</th>
                {showActions && (
                  <th className="text-center px-2 py-2 font-semibold text-amber-900">Status</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={showActions ? 9 : 8} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    Loading attendance data...
                  </td>
                </tr>
              ) : (
                Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const entry = entryByDay.get(day)
                  const isWeekend = new Date(year, month, day).getDay() === 0

                  return (
                    <tr
                      key={day}
                      className={`border-b border-amber-100 last:border-b-0 ${
                        isWeekend ? 'bg-amber-50/50' : ''
                      } ${entry ? '' : 'opacity-70'}`}
                    >
                      <td className="text-center px-2 py-1.5 font-medium text-amber-900">{day}</td>
                      <td className="text-center px-2 py-1.5">{formatTime(entry?.time_in ?? null)}</td>
                      <td className="text-center px-2 py-1.5">{formatTime(entry?.time_out ?? null)}</td>
                      <td className="text-center px-2 py-1.5">
                        {entry?.normal_hours != null ? entry.normal_hours : '-'}
                      </td>
                      <td className="text-center px-2 py-1.5 font-medium text-amber-700">
                        {entry?.ot_hours != null && entry.ot_hours > 0 ? entry.ot_hours : '-'}
                      </td>
                      <td className="text-center px-2 py-1.5">
                        {entry?.worker_signature_id ? (
                          <span className="text-green-600 text-xs">Signed</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-center px-2 py-1.5">
                        {entry?.supervisor_signature_id ? (
                          <span className="text-green-600 text-xs">Signed</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-left px-2 py-1.5 text-[var(--color-text-muted)] max-w-[100px] truncate">
                        {entry?.remark ?? (entry?.status && entry.status !== 'present' ? entry.status.replace('_', ' ') : '-')}
                      </td>
                      {showActions && (
                        <td className="text-center px-2 py-1.5">
                          {entry ? getStatusBadge(entry.approval_status) : null}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary - mimics the paper card bottom */}
        <div className="px-4 py-3 bg-amber-100 border-t-2 border-amber-300">
          <div className="flex flex-wrap gap-4 text-sm text-amber-900">
            <div>
              <span className="text-amber-700">Total Days:</span>{' '}
              <strong>{summary.totalDays}</strong>
            </div>
            <div>
              <span className="text-amber-700">Normal Hrs:</span>{' '}
              <strong>{summary.totalNormal}h</strong>
            </div>
            <div>
              <span className="text-amber-700">Overtime:</span>{' '}
              <strong>{summary.totalOt}h</strong>
            </div>
            {summary.totalAmount > 0 && (
              <div>
                <span className="text-amber-700">Est. Amount:</span>{' '}
                <strong>${summary.totalAmount.toFixed(2)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
