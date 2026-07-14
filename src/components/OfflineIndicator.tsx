import { useState, useEffect } from 'react'
import { subscribeSyncStatus, type SyncStatus, getPendingCount, getSyncStatus } from '@/offline/syncEngine'

export function OfflineIndicator() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus())
  const [pending, setPending] = useState(getPendingCount())

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newStatus, pendingCount) => {
      setStatus(newStatus)
      setPending(pendingCount)
    })
    return unsubscribe
  }, [])

  if (status === 'online' && pending === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      {status === 'offline' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-gray-500" />
          Offline
          {pending > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px]">
              {pending} pending
            </span>
          )}
        </div>
      )}
      {status === 'syncing' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Syncing...
        </div>
      )}
      {status === 'online' && pending > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {pending} pending
        </div>
      )}
    </div>
  )
}
