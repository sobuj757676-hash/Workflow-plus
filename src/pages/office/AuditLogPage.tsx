import { useState, useMemo } from 'react'

interface AuditEntry {
  id: string
  timestamp: string
  user: string
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip: string
  device: string
}

const MOCK_AUDIT_LOG: AuditEntry[] = [
  {
    id: '1',
    timestamp: '2024-03-15T14:32:00Z',
    user: 'admin@company.sg',
    action: 'create',
    entity_type: 'payroll_run',
    entity_id: 'pr-2024-03',
    old_value: null,
    new_value: { period_start: '2024-03-01', period_end: '2024-03-31', status: 'draft' },
    ip: '192.168.1.100',
    device: 'Chrome / Windows',
  },
  {
    id: '2',
    timestamp: '2024-03-15T14:30:00Z',
    user: 'admin@company.sg',
    action: 'update',
    entity_type: 'worker',
    entity_id: 'w-ali-001',
    old_value: { basic_salary: 2200, occupation: 'General Worker' },
    new_value: { basic_salary: 2400, occupation: 'Skilled Worker' },
    ip: '192.168.1.100',
    device: 'Chrome / Windows',
  },
  {
    id: '3',
    timestamp: '2024-03-15T10:15:00Z',
    user: 'supervisor@company.sg',
    action: 'approve',
    entity_type: 'attendance',
    entity_id: 'att-2024-03-14-w1',
    old_value: { approval_status: 'pending' },
    new_value: { approval_status: 'approved', approved_at: '2024-03-15T10:15:00Z' },
    ip: '10.0.0.55',
    device: 'Safari / iPhone',
  },
  {
    id: '4',
    timestamp: '2024-03-14T16:00:00Z',
    user: 'admin@company.sg',
    action: 'create',
    entity_type: 'site',
    entity_id: 'site-changi-t5',
    old_value: null,
    new_value: { name: 'Changi Terminal 5', status: 'active', client: 'CAG' },
    ip: '192.168.1.100',
    device: 'Chrome / Windows',
  },
  {
    id: '5',
    timestamp: '2024-03-14T11:30:00Z',
    user: 'admin@company.sg',
    action: 'finalize',
    entity_type: 'payroll_run',
    entity_id: 'pr-2024-02',
    old_value: { status: 'approved' },
    new_value: { status: 'finalized' },
    ip: '192.168.1.100',
    device: 'Chrome / Windows',
  },
  {
    id: '6',
    timestamp: '2024-03-13T09:45:00Z',
    user: 'supervisor@company.sg',
    action: 'create',
    entity_type: 'ot_consent',
    entity_id: 'ot-2024-03-15-w2',
    old_value: null,
    new_value: { worker_id: 'w2', date: '2024-03-15', time_from: '18:00', time_to: '21:00' },
    ip: '10.0.0.55',
    device: 'Safari / iPhone',
  },
  {
    id: '7',
    timestamp: '2024-03-12T14:20:00Z',
    user: 'admin@company.sg',
    action: 'delete',
    entity_type: 'document',
    entity_id: 'doc-expired-001',
    old_value: { type: 'insurance', document_number: 'INS-001', worker_id: 'w3' },
    new_value: null,
    ip: '192.168.1.100',
    device: 'Chrome / Windows',
  },
  {
    id: '8',
    timestamp: '2024-03-11T08:00:00Z',
    user: 'admin@company.sg',
    action: 'update',
    entity_type: 'settings',
    entity_id: 'payroll-rules',
    old_value: { ot_multiplier: 1.5, monthly_ot_cap: 60 },
    new_value: { ot_multiplier: 1.5, monthly_ot_cap: 72 },
    ip: '192.168.1.100',
    device: 'Firefox / macOS',
  },
  {
    id: '9',
    timestamp: '2024-03-10T15:00:00Z',
    user: 'admin@company.sg',
    action: 'create',
    entity_type: 'worker',
    entity_id: 'w-bao-005',
    old_value: null,
    new_value: { full_name: 'Bao Tran', employee_id: 'EMP-005', status: 'active' },
    ip: '192.168.1.100',
    device: 'Chrome / Windows',
  },
  {
    id: '10',
    timestamp: '2024-03-09T12:30:00Z',
    user: 'worker@company.sg',
    action: 'upload',
    entity_type: 'document',
    entity_id: 'doc-wp-w1',
    old_value: null,
    new_value: { type: 'work_permit', document_number: 'WP-2024-001234', worker_id: 'w1' },
    ip: '172.16.0.22',
    device: 'Chrome / Android',
  },
]

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  approve: 'bg-purple-100 text-purple-800',
  finalize: 'bg-indigo-100 text-indigo-800',
  upload: 'bg-teal-100 text-teal-800',
}

const ENTITY_TYPES = ['', 'worker', 'attendance', 'payroll_run', 'site', 'ot_consent', 'document', 'settings']
const ACTION_TYPES = ['', 'create', 'update', 'delete', 'approve', 'finalize', 'upload']

const PAGE_SIZE = 8

export function AuditLogPage() {
  const [userFilter, setUserFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return MOCK_AUDIT_LOG.filter((entry) => {
      if (userFilter && !entry.user.toLowerCase().includes(userFilter.toLowerCase())) return false
      if (entityFilter && entry.entity_type !== entityFilter) return false
      if (actionFilter && entry.action !== actionFilter) return false
      if (dateFrom && entry.timestamp < dateFrom) return false
      if (dateTo && entry.timestamp > dateTo + 'T23:59:59Z') return false
      return true
    })
  }, [userFilter, entityFilter, actionFilter, dateFrom, dateTo])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Complete record of all system actions (read-only)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <input
          type="text"
          value={userFilter}
          onChange={(e) => { setUserFilter(e.target.value); setPage(1) }}
          placeholder="Filter by user..."
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        />
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
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
          placeholder="To"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">User</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Action</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Entity ID</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">IP</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Device</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    No audit entries match your filters.
                  </td>
                </tr>
              ) : (
                paged.map((entry) => (
                  <>
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString('en-SG', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{entry.user}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-800'}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{entry.entity_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-xs font-mono text-[var(--color-text-muted)]">{entry.entity_id}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{entry.ip}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{entry.device}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                          className="text-xs text-[var(--color-primary)] hover:underline"
                        >
                          {expandedId === entry.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr key={`${entry.id}-detail`}>
                        <td colSpan={8} className="px-4 py-3 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
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
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-[var(--color-text-muted)]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
