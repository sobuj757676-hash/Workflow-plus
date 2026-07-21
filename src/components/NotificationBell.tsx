import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })
  }

  const recentNotifications = notifications.slice(0, 5)

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-[var(--color-border)] shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-xs text-[var(--color-primary)] font-medium">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                No notifications yet
              </div>
            ) : (
              recentNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => {
                    if (!notification.read_at) markRead(notification.id)
                    setOpen(false)
                    navigate('/notifications')
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-[var(--color-border)] last:border-b-0 ${
                    !notification.read_at ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-sm truncate ${!notification.read_at ? 'font-medium' : ''}`}>
                      {notification.title}
                    </p>
                    {!notification.read_at && (
                      <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full flex-shrink-0" />
                    )}
                  </div>
                  {notification.body && (
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{notification.body}</p>
                  )}
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    {formatTime(notification.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-[var(--color-border)]">
            <button
              onClick={() => { setOpen(false); navigate('/notifications') }}
              className="w-full text-center text-sm text-[var(--color-primary)] hover:underline py-1"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
