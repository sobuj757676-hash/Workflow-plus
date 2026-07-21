import { useNotifications } from '@/hooks/useNotifications'
import { useNavigate } from 'react-router-dom'

const typeIcons: Record<string, string> = {
  attendance_submitted: '📋',
  attendance_approved: '✅',
  attendance_rejected: '❌',
  ot_consent_requested: '⏰',
  ot_consent_responded: '✍️',
  payslip_ready: '🧾',
  payroll_finalized: '💰',
  document_expiring: '📄',
  worker_assigned: '👷',
  correction_request: '✏️',
  ppe_pending: '🦺',
  default: '🔔',
}

const typeRoutes: Record<string, string> = {
  attendance_submitted: '/office/attendance',
  attendance_approved: '/supervisor/attendance',
  ot_consent_requested: '/worker/ot-consents',
  ot_consent_responded: '/supervisor/ot-consents',
  payslip_ready: '/worker/payslips',
  payroll_finalized: '/office/payroll',
  document_expiring: '/office/documents',
  worker_assigned: '/supervisor/attendance',
  correction_request: '/office/attendance',
  ppe_pending: '/worker/ppe',
}

export function NotificationsPage() {
  const { notifications, isLoading, markRead, markAllRead, unreadCount } = useNotifications()
  const navigate = useNavigate()

  function handleNotificationClick(notification: typeof notifications[0]) {
    if (!notification.read_at) {
      markRead(notification.id)
    }
    const route = typeRoutes[notification.type]
    if (route) {
      navigate(route)
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-blue-50 rounded-lg transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notifications.length === 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
          <span className="text-4xl">🔔</span>
          <p className="mt-3 font-medium text-[var(--color-text)]">No notifications yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            You'll receive notifications for attendance, payroll, and other updates.
          </p>
        </div>
      )}

      {/* Notification list */}
      {!isLoading && notifications.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                !notification.read_at ? 'bg-blue-50/50' : ''
              }`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">
                {typeIcons[notification.type] ?? typeIcons.default}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${!notification.read_at ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text)]'}`}>
                    {notification.title}
                  </p>
                  <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                    {formatTime(notification.created_at)}
                  </span>
                </div>
                {notification.body && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                    {notification.body}
                  </p>
                )}
              </div>
              {!notification.read_at && (
                <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full flex-shrink-0 mt-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
