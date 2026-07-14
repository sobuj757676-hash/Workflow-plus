export function WorkerDashboardPage() {
  const currentMonth = new Date().toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
  const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const daysWorked = 18
  const daysRemaining = totalDaysInMonth - new Date().getDate()

  // Mock salary breakdown
  const basicSalary = 2400
  const otHours = 12
  const otRate = 22.5
  const otPay = otHours * otRate
  const allowance = 200
  const projectedNet = basicSalary + otPay + allowance

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Your work overview for {currentMonth}</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">📋</span>
          <div className="text-lg font-bold mt-2 text-green-600">Present</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Today's Status</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">🏗️</span>
          <div className="text-lg font-bold mt-2">Marina Bay Tower</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Current Site</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">👔</span>
          <div className="text-lg font-bold mt-2">John Tan</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Supervisor</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">⏰</span>
          <div className="text-lg font-bold mt-2">{otHours}h</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">OT This Month</div>
        </div>
      </div>

      {/* Salary Summary */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="font-semibold mb-4">Projected Earnings ({currentMonth})</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Basic Salary</span>
            <span className="font-medium">${basicSalary.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">OT Pay ({otHours}h x ${otRate}/h)</span>
            <span className="font-medium">${otPay.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Allowance</span>
            <span className="font-medium">${allowance}</span>
          </div>
          <div className="border-t border-[var(--color-border)] pt-2 flex items-center justify-between">
            <span className="font-semibold">Projected Net Pay</span>
            <span className="font-bold text-xl text-green-600">${projectedNet.toLocaleString()}</span>
          </div>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-3">
          * Estimate only. Final amount may vary based on remaining workdays and deductions.
        </p>
      </div>

      {/* Attendance Summary */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="font-semibold mb-4">Attendance Summary</h3>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#22c55e"
                strokeWidth="12"
                strokeDasharray={`${(daysWorked / totalDaysInMonth) * 251.2} 251.2`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">{Math.round((daysWorked / totalDaysInMonth) * 100)}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-green-500" />
              <span className="text-sm">Days Worked: <strong>{daysWorked}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-gray-300" />
              <span className="text-sm">Days Remaining: <strong>{daysRemaining}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-sm">Total Days: <strong>{totalDaysInMonth}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
