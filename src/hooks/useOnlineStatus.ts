import { useState, useEffect } from 'react'
import { getSyncStatus, getPendingCount, subscribeSyncStatus, type SyncStatus } from '@/offline/syncEngine'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus())
  const [pending, setPending] = useState(getPendingCount())

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newStatus, newPending) => {
      setStatus(newStatus)
      setPending(newPending)
    })
    return unsubscribe
  }, [])

  return { syncStatus: status, pendingCount: pending }
}
