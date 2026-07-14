import { useState } from 'react'

interface Notification {
  id: string
  icon: string
  title: string
  body: string
  time: string
  read: boolean
  link: string
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    icon: '📋',
    title: 'Attendance Pending Approval',
    body: '3 attendance records need your approval for Marina Bay Tower.',
    time: '5 minutes ago',
    read: false,
    link: '/office/attendance',
  },
  {
    id: '2',
    icon: '⚠️',
    title: 'Work Permit Expiring',
    body: "Ali bin Hassan's work permit expires in 10 days. Please arrange renewal.",
    time: '1 hour ago',
    read: false,
    link: '/office/documents',
  },
  {
    id: '3',
    icon: '🦺',
    title: 'PPE Sign-off Pending',
    body: 'Chen Wei Ming has not signed the March PPE form. Consider sending a reminder.',
    time: '3 hours ago',
    read: false,
    link: '/office/ppe',
  },
  {
    id: '4',
    icon: '💰',
    title: 'Payroll Finalized',
    body: 'March 2024 payroll has been finalized. 12 payslips have been generated and are ready for distribution.',
    time: '1 day ago',
    read: true,
    link: '/office/payroll',
  },
  {
    id: '5',
    icon: '⏰',
    title: 'OT Consent Approved',
    body: 'Kumar Rajan approved OT for 15 Mar 2024 (18:00 - 21:00).',
    time: '2 days ago',
    read: true,
    link: '/office/ot-consents',
  },
  {
    id: '6',
    icon: '📁',
    title: 'Document Uploaded',
    body: 'Muthu Selvam uploaded a new medical certificate.',
    time: '3 days ago',
    read: true,
    link: '/office/documents',
  },
  {
    id: '7',
    icon: '✏️',
    title: 'Correction Request',
    body: 'Bao Tran submitted a correction request for attendance on 12 Mar 2024.',
    time: '4 days ago',
    read: true,
    link: '/supervisor/corrections',
  },
  {
    id: '8',
    icon: '🏗️',
    title: 'New Site Created',
    body: 'Changi Terminal 5 site has been created and is now active.',
    time: '5 days ago',
    read: true,
    link: '/office/sites',
  },
]

type FilterType = 'all' | 'unread'

export function NotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications

  const unreadCount = notifications.filter((n) => !n.read).length

  function markAsRead(id: string) {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  function markAllRead() {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-gray-100 text-[var(--color-text-muted)] hover:bg-gray-200'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-gray-100 text-[var(--color-text-muted)] hover:bg-gray-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="px-4 py-12 text-center text-[var(--color-text-muted)]">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-4 flex gap-3 ${!notification.read ? 'bg-blue-50/50' : ''}`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{notification.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                        {notification.body}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1.5">{notification.time}</p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="flex-shrink-0 text-xs text-[var(--color-primary)] hover:underline whitespace-nowrap"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
