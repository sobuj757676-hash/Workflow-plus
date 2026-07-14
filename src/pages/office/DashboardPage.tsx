import { useAuth } from '@/contexts/AuthContext'
import { BarChart } from '@/components/charts/BarChart'
import { PieChart } from '@/components/charts/PieChart'

export function OfficeDashboardPage() {
  const { user } = useAuth()

  const cards = [
    { label: 'Total Workers', value: '24', icon: '👷', color: 'blue' },
    { label: 'Total Supervisors', value: '4', icon: '👔', color: 'purple' },
    { label: 'Total Sites', value: '6', icon: '🏗️', color: 'green' },
    { label: "Today's Attendance", value: '21/24', icon: '📋', color: 'teal' },
    { label: "Today's OT", value: '5', icon: '⏰', color: 'orange' },
    { label: 'Pending Approval', value: '3', icon: '⏳', color: 'yellow' },
    { label: 'Active Documents', value: '48', icon: '📁', color: 'pink' },
    { label: 'Monthly Salary Cost', value: '$58.4k', icon: '💰', color: 'red' },
  ]

  const attendanceTrend = [
    { label: 'Mon', value: 22, color: '#22c55e' },
    { label: 'Tue', value: 24, color: '#22c55e' },
    { label: 'Wed', value: 23, color: '#22c55e' },
    { label: 'Thu', value: 21, color: '#22c55e' },
    { label: 'Fri', value: 24, color: '#22c55e' },
    { label: 'Sat', value: 8, color: '#f59e0b' },
    { label: 'Sun', value: 0, color: '#94a3b8' },
  ]

  const workerDistribution = [
    { label: 'Marina Bay', value: 8, color: '#3b82f6' },
    { label: 'Jurong West', value: 6, color: '#8b5cf6' },
    { label: 'Changi T5', value: 5, color: '#06b6d4' },
    { label: 'Woodlands', value: 3, color: '#f59e0b' },
    { label: 'Unassigned', value: 2, color: '#94a3b8' },
  ]

  const recentActivities = [
    { time: '2 min ago', text: 'Attendance approved for Marina Bay Tower (5 records)' },
    { time: '15 min ago', text: 'Kumar Rajan uploaded medical certificate' },
    { time: '1 hour ago', text: 'OT consent sent to Ali bin Hassan for tomorrow' },
    { time: '3 hours ago', text: 'March payroll run created (draft)' },
    { time: 'Yesterday', text: 'New worker Bao Tran added to Changi T5 site' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Office Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Welcome back, {user?.email?.split('@')[0] || 'Admin'}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-[var(--color-border)] p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{card.value}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Charts & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {recentActivities.map((activity, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-xs text-[var(--color-text-muted)] w-20 flex-shrink-0 pt-0.5">{activity.time}</span>
                <span>{activity.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <BarChart data={attendanceTrend} title="Attendance This Week" unit="/24" maxValue={24} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <PieChart data={workerDistribution} title="Worker Distribution by Site" size={130} />
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-medium mb-3">Monthly Cost Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Basic Salaries</span>
              <span className="font-medium">$48,200</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">OT Pay</span>
              <span className="font-medium">$6,450</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Allowances</span>
              <span className="font-medium">$4,800</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Deductions</span>
              <span className="font-medium text-red-600">-$1,050</span>
            </div>
            <div className="border-t border-[var(--color-border)] pt-2 flex items-center justify-between text-sm">
              <span className="font-semibold">Total Net Pay</span>
              <span className="font-bold text-lg">$58,400</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
