import { Link } from 'react-router-dom'

const MOCK_WORKERS = [
  { id: 'w1', name: 'Ali bin Hassan', status: 'present' },
  { id: 'w2', name: 'Kumar Rajan', status: 'pending' },
  { id: 'w3', name: 'Chen Wei Ming', status: 'present' },
  { id: 'w4', name: 'Muthu Selvam', status: 'pending' },
  { id: 'w5', name: 'Bao Tran', status: 'absent' },
]

export function SupervisorDashboardPage() {
  const presentCount = MOCK_WORKERS.filter((w) => w.status === 'present').length
  const pendingCount = MOCK_WORKERS.filter((w) => w.status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Manage your site and workers</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">👷</span>
          <div className="text-2xl font-bold mt-2">{MOCK_WORKERS.length}</div>
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
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Pending Attendance</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <span className="text-2xl">🏗️</span>
          <div className="text-2xl font-bold mt-2">Marina Bay</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Current Site</div>
        </div>
      </div>

      {/* Quick Attendance */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Quick Attendance</h3>
          <Link
            to="/supervisor/attendance"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            View All
          </Link>
        </div>
        <div className="space-y-2">
          {MOCK_WORKERS.map((worker) => (
            <div key={worker.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
              <span className="text-sm font-medium">{worker.name}</span>
              <div className="flex items-center gap-2">
                {worker.status === 'present' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Present
                  </span>
                ) : worker.status === 'absent' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Absent
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
            </div>
          ))}
        </div>
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
