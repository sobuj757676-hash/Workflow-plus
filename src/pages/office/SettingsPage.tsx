import { useState } from 'react'
import { showToast } from '@/components/Toast'

interface Holiday {
  id: string
  name: string
  date: string
}

const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: '1', name: "New Year's Day", date: '2024-01-01' },
  { id: '2', name: 'Chinese New Year', date: '2024-02-10' },
  { id: '3', name: 'Chinese New Year (2nd day)', date: '2024-02-11' },
  { id: '4', name: 'Good Friday', date: '2024-03-29' },
  { id: '5', name: 'Hari Raya Puasa', date: '2024-04-10' },
  { id: '6', name: 'Labour Day', date: '2024-05-01' },
  { id: '7', name: 'Vesak Day', date: '2024-05-22' },
  { id: '8', name: 'Hari Raya Haji', date: '2024-06-17' },
  { id: '9', name: 'National Day', date: '2024-08-09' },
  { id: '10', name: 'Deepavali', date: '2024-11-01' },
  { id: '11', name: 'Christmas Day', date: '2024-12-25' },
]

export function SettingsPage() {
  // Company settings
  const [companyName, setCompanyName] = useState('Demo Construction Pte Ltd')
  const [normalHours, setNormalHours] = useState(8)
  const [breakMinutes, setBreakMinutes] = useState(60)
  const [otMultiplier, setOtMultiplier] = useState(1.5)
  const [restDayMultiplier, setRestDayMultiplier] = useState(2.0)
  const [phMultiplier, setPhMultiplier] = useState(2.0)
  const [otCap, setOtCap] = useState(72)
  const [payCycle, setPayCycle] = useState('monthly')

  // Holidays
  const [holidays, setHolidays] = useState<Holiday[]>(DEFAULT_HOLIDAYS)
  const [showAddHoliday, setShowAddHoliday] = useState(false)
  const [newHolidayName, setNewHolidayName] = useState('')
  const [newHolidayDate, setNewHolidayDate] = useState('')

  // Notification preferences
  const [notifAttendance, setNotifAttendance] = useState(true)
  const [notifDocExpiry, setNotifDocExpiry] = useState(true)
  const [notifPayroll, setNotifPayroll] = useState(true)
  const [notifOT, setNotifOT] = useState(true)
  const [notifPPE, setNotifPPE] = useState(false)

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    showToast('Settings saved successfully')
  }

  function addHoliday() {
    if (!newHolidayName || !newHolidayDate) return
    setHolidays([...holidays, { id: Date.now().toString(), name: newHolidayName, date: newHolidayDate }])
    setNewHolidayName('')
    setNewHolidayDate('')
    setShowAddHoliday(false)
    showToast('Holiday added')
  }

  function removeHoliday(id: string) {
    setHolidays(holidays.filter((h) => h.id !== id))
    showToast('Holiday removed', 'info')
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
                <input type="number" value={normalHours} onChange={(e) => setNormalHours(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm" />
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
              <button
                type="button"
                onClick={() => setShowAddHoliday(true)}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
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
                    onClick={addHoliday}
                    className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddHoliday(false)}
                    className="px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                  <div>
                    <span className="text-sm">{holiday.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">
                      {new Date(holiday.date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHoliday(holiday.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pay Cycle */}
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

            {/* Role/Permission Display */}
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
                <input
                  type="checkbox"
                  checked={notifAttendance}
                  onChange={(e) => setNotifAttendance(e.target.checked)}
                  className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-medium">Attendance Alerts</span>
                  <p className="text-xs text-[var(--color-text-muted)]">Pending approvals, anomalies</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifDocExpiry}
                  onChange={(e) => setNotifDocExpiry(e.target.checked)}
                  className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-medium">Document Expiry</span>
                  <p className="text-xs text-[var(--color-text-muted)]">30-day expiry warnings</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifPayroll}
                  onChange={(e) => setNotifPayroll(e.target.checked)}
                  className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-medium">Payroll Updates</span>
                  <p className="text-xs text-[var(--color-text-muted)]">Run status changes</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifOT}
                  onChange={(e) => setNotifOT(e.target.checked)}
                  className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-medium">OT Consent</span>
                  <p className="text-xs text-[var(--color-text-muted)]">New requests, responses</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifPPE}
                  onChange={(e) => setNotifPPE(e.target.checked)}
                  className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300"
                />
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
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}
