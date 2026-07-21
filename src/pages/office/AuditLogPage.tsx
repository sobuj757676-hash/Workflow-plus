import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface AuditEntry {
  id: string
  tenant_id: string | null
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip: string | null
  device: string | null
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  approve: 'bg-purple-100 text-purple-800',
  finalize: 'bg-indigo-100 text-indigo-800',
  sign: 'bg-teal-100 text-teal-800',
}

const ENTITY_TYPES = ['', 'workers', 'attendance_entries', 'payroll_runs', 'payroll_items', 'sites', 'ot_consents', 'correction_requests', 'worker_assignments', 'settings']
const ACTION_TYPES = ['', 'create', 'update', 'delete']

const PAGE_SIZE = 20

export function AuditLogPage() {
  const { tenantId } = useAuth()
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Fetch audit logs from Supabase
  const { data: result, isLoading } = useQuery({
    queryKey: ['audit-logs', tenantId, entityFilter, actionFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      if (entityFilter) {
        query = query.eq('entity_type', entityFilter)
      }
      if (actionFilter) {
        query = query.eq('action', actionFilter)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { entries: data as AuditEntry[], count: count ?? 0 }
    },
    enabled: !!tenantId,
  })

  // Fetch user emails for display
  const { data: users } = useQuery({
    queryKey: ['audit-users', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('tenant_id', tenantId!)
      if (error) throw error
      return data as { id: string; email: string; full_name: string | null }[]
    },
    enabled: !!tenantId,
  })

  const userMap = new Map(users?.map((u) => [u.id, u.full_name ?? u.email]) ?? [])

  const entries = result?.entries ?? []
  const totalCount = result?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Complete record of all system actions (read-only) {totalCount > 0 && `— ${totalCount} entries`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        >
          <option value="">All Entity Types</option>
          {ENTITY_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        >
          <option value="">All Actions</option>
          {ACTION_TYPES.filter(Boolean).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            <svg className="animate-spin h-5 w-5 mx-auto mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading audit log...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            No audit entries found. Actions will be logged automatically as you use the system.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Timestamp</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">User</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString('en-SG', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {entry.actor_user_id ? userMap.get(entry.actor_user_id) ?? 'System' : 'System'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-800'}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{entry.entity_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        {expandedId === entry.id ? 'Hide' : 'View'}
                      </button>
                      {expandedId === entry.id && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {entry.old_value && (
                            <div>
                              <p className="font-medium text-[var(--color-text-muted)] mb-1">Old Value</p>
                              <pre className="p-2 bg-red-50 rounded border border-red-100 overflow-auto max-h-32 text-red-800">
                                {JSON.stringify(entry.old_value, null, 2)}
                              </pre>
                            </div>
                          )}
                          {entry.new_value && (
                            <div>
                              <p className="font-medium text-[var(--color-text-muted)] mb-1">New Value</p>
                              <pre className="p-2 bg-green-50 rounded border border-green-100 overflow-auto max-h-32 text-green-800">
                                {JSON.stringify(entry.new_value, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              Page {page} of {totalPages} ({totalCount} entries)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
