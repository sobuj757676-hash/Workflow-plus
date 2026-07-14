import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { parseTimeShorthand } from '@/utils/timeParser'
import { checkOtCap } from '@/utils/otCapCheck'
import { SignaturePad } from '@/components/SignaturePad'
import type { WorkerRow, AttendanceStatus, AttendanceEntryRow } from '@/types/database'

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'mc', label: 'MC' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'rest_day', label: 'Rest Day' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'ot', label: 'OT' },
]

export function RecordAttendancePage() {
  const { workerId } = useParams<{ workerId: string }>()
  const navigate = useNavigate()
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  const today = new Date().toISOString().slice(0, 10)

  const [date, setDate] = useState(today)
  const [shorthandInput, setShorthandInput] = useState('')
  const [timeIn, setTimeIn] = useState('')
  const [timeOut, setTimeOut] = useState('')
  const [status, setStatus] = useState<AttendanceStatus>('present')
  const [remark, setRemark] = useState('')
  const [supervisorSignature, setSupervisorSignature] = useState<string | null>(null)
  const [workerSignature, setWorkerSignature] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [useShorthand, setUseShorthand] = useState(true)

  // Fetch worker
  const { data: worker } = useQuery({
    queryKey: ['worker', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId!)
        .single()
      if (error) throw error
      return data as WorkerRow
    },
    enabled: !!workerId,
  })

  // Fetch existing entry for this date (for editing)
  const { data: existingEntry } = useQuery({
    queryKey: ['attendance-entry', workerId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('*')
        .eq('worker_id', workerId!)
        .eq('date', date)
        .maybeSingle()
      if (error) throw error
      return data as AttendanceEntryRow | null
    },
    enabled: !!workerId,
  })

  // Fetch monthly OT for cap check
  const monthStart = `${date.slice(0, 7)}-01`
  const { data: monthlyOtHours } = useQuery({
    queryKey: ['monthly-ot', workerId, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('ot_hours')
        .eq('worker_id', workerId!)
        .gte('date', monthStart)
        .neq('date', date) // Exclude current date entry being edited
      if (error) throw error
      return (data ?? []).reduce((sum, e) => sum + (e.ot_hours ?? 0), 0)
    },
    enabled: !!workerId,
  })

  // Parse the time shorthand input in real-time
  const parsedTime = useMemo(() => {
    if (useShorthand && shorthandInput.trim()) {
      return parseTimeShorthand(shorthandInput)
    }
    if (!useShorthand && timeIn && timeOut) {
      const combined = `${timeIn}-${timeOut}`
      return parseTimeShorthand(combined)
    }
    return null
  }, [useShorthand, shorthandInput, timeIn, timeOut])

  // OT cap check
  const otCapResult = useMemo(() => {
    const proposedOt = parsedTime?.otHours ?? 0
    const currentOt = monthlyOtHours ?? 0
    return checkOtCap(currentOt, proposedOt, 72) // Default 72h cap
  }, [parsedTime, monthlyOtHours])

  const handleShorthandChange = useCallback((value: string) => {
    setShorthandInput(value)
    // Auto-fill time in/out from parsed result
    const result = parseTimeShorthand(value)
    if (result) {
      setTimeIn(result.timeIn)
      setTimeOut(result.timeOut)
    }
  }, [])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workerId || !tenantId || !user) throw new Error('Missing context')

      const entryData = {
        tenant_id: tenantId,
        worker_id: workerId,
        supervisor_id: user.id,
        date,
        time_in: parsedTime?.timeIn ?? timeIn ?? null,
        time_out: parsedTime?.timeOut ?? timeOut ?? null,
        normal_hours: parsedTime?.normalHours ?? null,
        ot_hours: parsedTime?.otHours ?? null,
        status,
        remark: remark || null,
        approval_status: 'pending' as const,
        locked: false,
        worker_signature_id: workerSignature ? 'sig_placeholder' : null,
        supervisor_signature_id: supervisorSignature ? 'sig_placeholder' : null,
      }

      if (existingEntry) {
        // Update existing
        const { error } = await supabase
          .from('attendance_entries')
          .update(entryData)
          .eq('id', existingEntry.id)
        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('attendance_entries')
          .insert(entryData)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-entry', workerId] })
      queryClient.invalidateQueries({ queryKey: ['attendance-entries', workerId] })
      navigate('/supervisor/attendance')
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to save attendance entry.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validation
    if (!date) {
      setError('Date is required.')
      return
    }
    if (status === 'present' || status === 'ot' || status === 'half_day') {
      if (!parsedTime && !timeIn) {
        setError('Please enter time in/out or use the shorthand field.')
        return
      }
    }

    saveMutation.mutate()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/supervisor/attendance')}
          className="text-sm text-[var(--color-primary)] hover:underline mb-2 inline-flex items-center gap-1"
        >
          &larr; Back to Attendance
        </button>
        <h1 className="text-2xl font-bold">Record Attendance</h1>
        {worker && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {worker.full_name} ({worker.employee_id})
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date & Status */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Time Input - THE KEY UX FEATURE */}
        {(status === 'present' || status === 'ot' || status === 'half_day') && (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
            {/* Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUseShorthand(true)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  useShorthand
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-gray-100 text-[var(--color-text-muted)]'
                }`}
              >
                Shorthand
              </button>
              <button
                type="button"
                onClick={() => setUseShorthand(false)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  !useShorthand
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-gray-100 text-[var(--color-text-muted)]'
                }`}
              >
                Separate Fields
              </button>
            </div>

            {useShorthand ? (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Time Shorthand
                </label>
                <input
                  type="text"
                  value={shorthandInput}
                  onChange={(e) => handleShorthandChange(e.target.value)}
                  placeholder="e.g. 8am-8.30pm+2"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Type like you write on the paper card: "8am-5pm", "7.30am-8pm+2", "08:00-17:00"
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Time In</label>
                  <input
                    type="text"
                    value={timeIn}
                    onChange={(e) => setTimeIn(e.target.value)}
                    placeholder="e.g. 8am or 08:00"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time Out</label>
                  <input
                    type="text"
                    value={timeOut}
                    onChange={(e) => setTimeOut(e.target.value)}
                    placeholder="e.g. 5pm or 17:00"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>
            )}

            {/* Real-time calculation display */}
            {parsedTime && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Time:</span>{' '}
                    <strong className="text-green-900">
                      {parsedTime.timeIn} - {parsedTime.timeOut}
                    </strong>
                  </div>
                  <div>
                    <span className="text-green-700">Normal:</span>{' '}
                    <strong className="text-green-900">{parsedTime.normalHours}h</strong>
                  </div>
                  <div>
                    <span className="text-green-700">OT:</span>{' '}
                    <strong className="text-green-900">{parsedTime.otHours}h</strong>
                  </div>
                  <div>
                    <span className="text-green-700">Total:</span>{' '}
                    <strong className="text-green-900">{parsedTime.totalWorked}h</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Invalid input hint */}
            {((useShorthand && shorthandInput.trim() && !parsedTime) ||
              (!useShorthand && timeIn && timeOut && !parsedTime)) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <p className="text-xs text-red-600">
                  Could not parse time input. Try formats like "8am-5pm", "7.30am-8.30pm+2", or "08:00-17:00"
                </p>
              </div>
            )}

            {/* OT Cap Warning */}
            {otCapResult.warning && parsedTime && parsedTime.otHours > 0 && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  otCapResult.exceeding
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-amber-50 border border-amber-200 text-amber-700'
                }`}
              >
                <p className="font-medium">
                  {otCapResult.exceeding ? 'OT Cap Exceeded' : 'OT Cap Warning'}
                </p>
                <p className="text-xs mt-0.5">{otCapResult.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Remark */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <label className="block text-sm font-medium mb-1">Remark</label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Optional remark..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* Signatures */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
          <h3 className="font-medium text-sm">Signatures</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SignaturePad
              label="Worker Signature"
              onSignatureChange={setWorkerSignature}
              width={250}
              height={120}
            />
            <SignaturePad
              label="Supervisor Signature"
              onSignatureChange={setSupervisorSignature}
              width={250}
              height={120}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending
              ? 'Saving...'
              : existingEntry
                ? 'Update Attendance'
                : 'Save Attendance'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/supervisor/attendance')}
            className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
