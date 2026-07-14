import { offlineDb, type PendingMutation } from './db'
import { supabase } from '@/lib/supabase'

export type SyncStatus = 'online' | 'offline' | 'syncing'

type SyncListener = (status: SyncStatus, pendingCount: number) => void

let listeners: SyncListener[] = []
let currentStatus: SyncStatus = navigator.onLine ? 'online' : 'offline'
let pendingCount = 0

export function getSyncStatus(): SyncStatus {
  return currentStatus
}

export function getPendingCount(): number {
  return pendingCount
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.push(listener)
  listener(currentStatus, pendingCount)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function notifyListeners() {
  listeners.forEach((l) => l(currentStatus, pendingCount))
}

async function updatePendingCount() {
  pendingCount = await offlineDb.pendingMutations
    .where('synced')
    .equals(0)
    .count()
  notifyListeners()
}

/**
 * Queue a mutation for sync. If online, will attempt immediate flush.
 */
export async function queueMutation(type: string, payload: Record<string, unknown>) {
  await offlineDb.pendingMutations.add({
    type,
    payload,
    createdAt: new Date().toISOString(),
    synced: false,
  })
  await updatePendingCount()

  if (navigator.onLine) {
    await flushQueue()
  }
}

/**
 * Flush all pending mutations to Supabase in order.
 */
export async function flushQueue() {
  const unsynced = await offlineDb.pendingMutations
    .where('synced')
    .equals(0)
    .sortBy('createdAt')

  if (unsynced.length === 0) return

  currentStatus = 'syncing'
  notifyListeners()

  for (const mutation of unsynced) {
    try {
      await processMutation(mutation)
      await offlineDb.pendingMutations.update(mutation.id!, { synced: true })
    } catch (error) {
      console.error('Sync failed for mutation:', mutation.id, error)
      // Stop processing on first error to maintain order
      break
    }
  }

  currentStatus = navigator.onLine ? 'online' : 'offline'
  await updatePendingCount()
}

async function processMutation(mutation: PendingMutation) {
  const { type, payload } = mutation

  switch (type) {
    case 'attendance_create': {
      const { error } = await supabase
        .from('attendance_entries')
        .insert(payload as Record<string, unknown>)
      if (error) throw error
      break
    }
    case 'attendance_update': {
      const { id, ...updates } = payload
      const { error } = await supabase
        .from('attendance_entries')
        .update(updates)
        .eq('id', id as string)
      if (error) throw error
      break
    }
    default:
      console.warn('Unknown mutation type:', type)
  }
}

// Listen for online/offline events
function handleOnline() {
  currentStatus = 'online'
  notifyListeners()
  flushQueue()
}

function handleOffline() {
  currentStatus = 'offline'
  notifyListeners()
}

// Initialize listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  // Initial pending count
  updatePendingCount()
}
