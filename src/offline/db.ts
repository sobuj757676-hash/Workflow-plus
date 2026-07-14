import Dexie, { type EntityTable } from 'dexie'

export interface PendingMutation {
  id?: number
  type: string
  payload: Record<string, unknown>
  createdAt: string
  synced: boolean
}

export interface CachedWorker {
  id: string
  tenant_id: string
  full_name: string
  employee_id: string
  status: string
  current_site_id: string | null
  cached_at: string
}

export interface CachedSite {
  id: string
  tenant_id: string
  name: string
  code: string | null
  status: string
  cached_at: string
}

class OfflineDatabase extends Dexie {
  pendingMutations!: EntityTable<PendingMutation, 'id'>
  cachedWorkers!: EntityTable<CachedWorker, 'id'>
  cachedSites!: EntityTable<CachedSite, 'id'>

  constructor() {
    super('WorkflowProOffline')

    this.version(1).stores({
      pendingMutations: '++id, type, synced, createdAt',
      cachedWorkers: 'id, tenant_id, status',
      cachedSites: 'id, tenant_id, status',
    })
  }
}

export const offlineDb = new OfflineDatabase()
