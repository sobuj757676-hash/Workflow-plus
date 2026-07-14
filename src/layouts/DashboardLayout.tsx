import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationBell } from '@/components/NotificationBell'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import type { UserRole } from '@/types/database'

interface NavItem {
  label: string
  path: string
  icon: string
}

const navItems: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: 'Dashboard', path: '/admin', icon: '📊' },
    { label: 'Tenants', path: '/admin/tenants', icon: '🏢' },
  ],
  office_staff: [
    { label: 'Dashboard', path: '/office', icon: '📊' },
    { label: 'Workers', path: '/office/workers', icon: '👷' },
    { label: 'Supervisors', path: '/office/supervisors', icon: '👔' },
    { label: 'Sites', path: '/office/sites', icon: '🏗️' },
    { label: 'Attendance', path: '/office/attendance', icon: '📋' },
    { label: 'OT Consents', path: '/office/ot-consents', icon: '⏰' },
    { label: 'Payroll', path: '/office/payroll', icon: '💰' },
    { label: 'Payslips', path: '/office/payslips', icon: '🧾' },
    { label: 'Documents', path: '/office/documents', icon: '📁' },
    { label: 'PPE', path: '/office/ppe', icon: '🦺' },
    { label: 'Reports', path: '/office/reports', icon: '📈' },
    { label: 'Audit Log', path: '/office/audit', icon: '🔍' },
    { label: 'Settings', path: '/office/settings', icon: '⚙️' },
  ],
  supervisor: [
    { label: 'Dashboard', path: '/supervisor', icon: '📊' },
    { label: 'Attendance', path: '/supervisor/attendance', icon: '📋' },
    { label: 'OT Consents', path: '/supervisor/ot-consents', icon: '⏰' },
    { label: 'Corrections', path: '/supervisor/corrections', icon: '✏️' },
    { label: 'Workers', path: '/supervisor/workers', icon: '👷' },
    { label: 'PPE', path: '/supervisor/ppe', icon: '🦺' },
  ],
  worker: [
    { label: 'Dashboard', path: '/worker', icon: '📊' },
    { label: 'My Attendance', path: '/worker/attendance', icon: '📋' },
    { label: 'My Payslips', path: '/worker/payslips', icon: '🧾' },
    { label: 'My Documents', path: '/worker/documents', icon: '📁' },
    { label: 'OT Consents', path: '/worker/ot-consents', icon: '⏰' },
    { label: 'PPE', path: '/worker/ppe', icon: '🦺' },
  ],
}

export function DashboardLayout() {
  const { role, user, signOut } = useAuth()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const items = role ? navItems[role] : []

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[var(--color-border)] transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 h-16 px-4 border-b border-[var(--color-border)]">
          <span className="text-2xl font-bold text-[var(--color-primary)]">WF</span>
          <span className="font-semibold text-lg">WorkFlow Pro</span>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/office' || item.path === '/supervisor' || item.path === '/worker' || item.path === '/admin'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-gray-50 hover:text-[var(--color-text)]'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-2 truncate">
            {user?.email}
          </div>
          <select
            value={i18n.language}
            onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('language', e.target.value) }}
            className="w-full px-2 py-1.5 mb-2 text-xs rounded-lg border border-[var(--color-border)]"
          >
            <option value="en">English</option>
            <option value="bn">Bengali</option>
            <option value="zh">Chinese</option>
            <option value="ta">Tamil</option>
          </select>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center gap-4 px-4 bg-white border-b border-[var(--color-border)] lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          {/* Offline indicator */}
          <OfflineIndicator />
          {/* Notification bell */}
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
