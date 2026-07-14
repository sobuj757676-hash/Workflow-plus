import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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
    body: "Ali bin Hassan's work permit expires in 10 days.",
    time: '1 hour ago',
    read: false,
    link: '/office/documents',
  },
  {
    id: '3',
    icon: '🦺',
    title: 'PPE Sign-off Pending',
    body: 'Chen Wei Ming has not signed the March PPE form.',
    time: '3 hours ago',
    read: false,
    link: '/office/ppe',
  },
  {
    id: '4',
    icon: '💰',
    title: 'Payroll Finalized',
    body: 'March 2024 payroll has been finalized. 12 payslips generated.',
    time: '1 day ago',
    read: true,
    link: '/office/payroll',
  },
  {
    id: '5',
    icon: '⏰',
    title: 'OT Consent Approved',
    body: 'Kumar Rajan approved OT for 15 Mar 2024.',
    time: '2 days ago',
    read: true,
    link: '/office/ot-consents',
  },
]

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function markAllRead() {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  function handleNotificationClick(notification: Notification) {
    setNotifications(
      notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    )
    setIsOpen(false)
    navigate(notification.link)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 relative"
      >
        <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-[var(--color-border)] shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[var(--color-primary)] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-lg flex-shrink-0">{notification.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">{notification.time}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--color-border)] bg-gray-50">
            <button
              onClick={() => { setIsOpen(false); navigate('/notifications') }}
              className="w-full text-center text-xs text-[var(--color-primary)] hover:underline font-medium py-1"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
