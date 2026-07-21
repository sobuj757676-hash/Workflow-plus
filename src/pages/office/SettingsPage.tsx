import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { showToast } from '@/components/Toast'

interface Holiday {
  id: string
  name: string
  date: string
}

export function SettingsPage() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  // Company settings state
  const [companyName, setCompanyName] = useState('')
  const [normalHours, setNormalHours] = useState(8)
  const [breakMinutes, setBreakMinutes] = useState(60)
  const [otMultiplier, setOtMultiplier] = useState(1.5)
  const [restDayMultiplier, setRestDayMultiplier] = useState(2.0)
  const [phMultiplier, setPhMultiplier] = useState(2.0)
  const [otCap, setOtCap] = useState(72)
  const [payCycle, setPayCycle] = useState('monthly')

  // Notification preferences
  const [notifAttendance, setNotifAttendance] = useState(true)
  const [notifDocExpiry, setNotifDocExpiry] = useState(true)
  const [notifPayroll, setNotifPayroll] = useState(true)
  const [notifOT, setNotifOT] = useState(true)
  const [notifPPE, setNotifPPE] = useState(false)

  // Holiday calendar
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [showAddHoliday, setShowAddHoliday] = useState(false)
  const [newHolidayName, setNewHolidayName] = useState('')
  const [newHolidayDate, setNewHolidayDate] = useState('')

  // Fetch settings from DB
  const { data: settings } = useQuery({
    queryKey: ['settings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('tenant_id', tenantId!)
      if (error) throw error
      const map: Record<string, unknown> = {}
      data.forEach((row: { key: string; value: unknown }) => {
        map[row.key] = row.value
      })
      return map
    },
    enabled: !!tenantId,
  })

  // Fetch payroll rules
  const { data: payrollRules } = useQuery({
    queryKey: ['payroll-rules-settings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_rules')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!tenantId,
  })

  // Fetch holidays
  const { data: dbHolidays } = useQuery({
    queryKey: ['holidays', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holiday_calendar')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('date')
      if (error) throw error
      return data as { id: string; name: string; date: string }[]
    },
    enabled: !!tenantId,
  })

  // Populate state from fetched data
  useEffect(() => {
    if (settings) {
      const profile = settings.company_profile as Record<string, string> | undefined
      if (profile?.name) setCompanyName(profile.name)

      const notifs = settings.notification_preferences as Record<string, boolean> | undefined
      if (notifs) {
        setNotifAttendance(notifs.attendance_reminder ?? true)
        setNotifDocExpiry(notifs.expiry_warning ?? true)
        setNotifPayroll(notifs.push_enabled ?? true)
        setNotifOT(notifs.ot_alerts ?? true)
        setNotifPPE(notifs.ppe_alerts ?? false)
      }
    }
  }, [settings])

  useEffect(() => {
    if (payrollRules) {
      setNormalHours(payrollRules.normal_hours_per_day)
      setBreakMinutes(payrollRules.break_minutes)
      setOtMultiplier(payrollRules.ot_multiplier)
      setRestDayMultiplier(payrollRules.rest_day_multiplier)
      setPhMultiplier(payrollRules.public_holiday_multiplier)
      setOtCap(payrollRules.ot_monthly_cap_hours)
      setPayCycle(payrollRules.pay_cycle)
    }
  }, [payrollRules])

  useEffect(() => {
    if (dbHolidays) {
      setHolidays(dbHolidays.map((h) => ({ id: h.id, name: h.name, date: h.date })))
    }
  }, [dbHolidays])

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Upsert company profile
      await supabase.from('settings').upsert({
        tenant_id: tenantId!,
        key: 'company_profile',
        value: { name: companyName },
      }, { onConflict: 'tenant_id,key' })

      // Upsert notification preferences
      await supabase.from('settings').upsert({
        tenant_id: tenantId!,
        key: 'notification_preferences',
        value: {
          push_enabled: notifPayroll,
          attendance_reminder: notifAttendance,
          expiry_warning: notifDocExpiry,
          ot_alerts: notifOT,
          ppe_alerts: notifPPE,
        },
      }, { onConflict: 'tenant_id,key' })

      // Update payroll rules (current active rule)
      if (payrollRules) {
        const { error } = await supabase
          .from('payroll_rules')
          .update({
            normal_hours_per_day: normalHours,
            break_minutes: breakMinutes,
            ot_multiplier: otMultiplier,
            rest_day_multiplier: restDayMultiplier,
            public_holiday_multiplier: phMultiplier,
            ot_monthly_cap_hours: otCap,
            pay_cycle: payCycle,
          })
          .eq('id', payrollRules.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-rules-settings'] })
      showToast('Settings saved successfully')
    },
    onError: () => {
      showToast('Failed to save settings', 'error')
    },
  })

  // Add holiday mutation
  const addHolidayMutation = useMutation({
    mutationFn: async () => {
      if (!newHolidayName || !newHolidayDate) throw new Error('Name and date required')
      const { error } = await supabase.from('holiday_calendar').insert({
        tenant_id: tenantId!,
        name: newHolidayName,
        date: newHolidayDate,
        type: 'public_holiday',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
      setNewHolidayName('')
      setNewHolidayDate('')
      setShowAddHoliday(false)
      showToast('Holiday added')
    },
  })

  // Remove holiday mutation
  const removeHolidayMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('holiday_calendar').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
      showToast('Holiday removed', 'info')
    },
  })

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Configure your company preferences and payroll rules</p>
      </div>

      <form onSubmit={handleSaveSettings}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Profile */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <h3 className="font-semibold mb-4">Company Profile</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input type="text" value="Singapore" readOnly className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <input type="text" value="SGD" readOnly className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm bg-gray-50" />
              </div>
            </div>
          </div>

          {/* Working Hours & OT */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <h3 className="font-semibold mb-4">Working Hours & OT Rules</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Normal Hours per Day</label>
                <input type="number" step="0.5" value={normalHours} onChange={(e) => setNormalHours(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Break (minutes)</label>
                <input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">OT Multiplier</label>
                <input type="number" step="0.1" value={otMultiplier} onChange={(e) => setOtMultiplier(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rest Day Multiplier</label>
                <input type="number" step="0.1" value={restDayMultiplier} onChange={(e) => setRestDayMultiplier(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Public Holiday Multiplier</label>
                <input type="number" step="0.1" value={phMultiplier} onChange={(e) => setPhMultiplier(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly OT Cap (hours)</label>
                <input type="number" value={otCap} onChange={(e) => setOtCap(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm" />
              </div>
            </div>
          </div>

          {/* Holiday Calendar */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Holiday Calendar</h3>
              <button type="button" onClick={() => setShowAddHoliday(true)} className="text-sm text-[var(--color-primary)] hover:underline">
                + Add Holiday
              </button>
            </div>

            {showAddHoliday && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg space-y-2">
                <input
                  type="text"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="Holiday name"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                />
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addHolidayMutation.mutate()}
                    disabled={addHolidayMutation.isPending}
                    className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {addHolidayMutation.isPending ? 'Adding...' : 'Add'}
                  </button>
                  <button type="button" onClick={() => setShowAddHoliday(false)} className="px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-xs font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {holidays.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No holidays configured.</p>
              ) : (
                holidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                    <div>
                      <span className="text-sm">{holiday.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)] ml-2">
                        {new Date(holiday.date + 'T00:00:00').toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeHolidayMutation.mutate(holiday.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pay Cycle & Roles */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <h3 className="font-semibold mb-4">Pay Cycle</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Cycle</label>
              <select
                value={payCycle}
                onChange={(e) => setPayCycle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="biweekly">Bi-weekly</option>
              </select>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Roles & Permissions</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 rounded">
                  <span className="font-medium">Super Admin</span>
                  <span className="text-xs text-[var(--color-text-muted)]">Full access</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 rounded">
                  <span className="font-medium">Office Staff</span>
                  <span className="text-xs text-[var(--color-text-muted)]">Manage workers, payroll, reports</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 rounded">
                  <span className="font-medium">Supervisor</span>
                  <span className="text-xs text-[var(--color-text-muted)]">Attendance, OT, PPE</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 rounded">
                  <span className="font-medium">Worker</span>
                  <span className="text-xs text-[var(--color-text-muted)]">View own data, sign forms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 lg:col-span-2">
            <h3 className="font-semibold mb-4">Notification Preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifAttendance} onChange={(e) => setNotifAttendance(e.target.checked)} className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300" />
                <div>
                  <span className="text-sm font-medium">Attendance Alerts</span>
                  <p className="text-xs text-[var(--color-text-muted)]">Pending approvals, anomalies</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifDocExpiry} onChange={(e) => setNotifDocExpiry(e.target.checked)} className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300" />
                <div>
                  <span className="text-sm font-medium">Document Expiry</span>
                  <p className="text-xs text-[var(--color-text-muted)]">30-day expiry warnings</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifPayroll} onChange={(e) => setNotifPayroll(e.target.checked)} className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300" />
                <div>
                  <span className="text-sm font-medium">Payroll Updates</span>
                  <p className="text-xs text-[var(--color-text-muted)]">Run status changes</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifOT} onChange={(e) => setNotifOT(e.target.checked)} className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300" />
                <div>
                  <span className="text-sm font-medium">OT Consent</span>
                  <p className="text-xs text-[var(--color-text-muted)]">New requests, responses</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notifPPE} onChange={(e) => setNotifPPE(e.target.checked)} className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300" />
                <div>
                  <span className="text-sm font-medium">PPE Reminders</span>
                  <p className="text-xs text-[var(--color-text-muted)]">Unsigned forms alerts</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
