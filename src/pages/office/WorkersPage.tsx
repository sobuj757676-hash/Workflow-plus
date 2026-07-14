import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce } from '@/hooks/useDebounce'
import type { WorkerRow, SiteRow, UserRow } from '@/types/database'

const PAGE_SIZE = 10

export function WorkersPage() {
  const { tenantId } = useAuth()
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [supervisorFilter, setSupervisorFilter] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  // Fetch sites for filter dropdown
  const { data: sites } = useQuery({
    queryKey: ['sites', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data as SiteRow[]
    },
    enabled: !!tenantId,
  })

  // Fetch supervisors for filter dropdown
  const { data: supervisors } = useQuery({
    queryKey: ['supervisors', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('role', 'supervisor')
        .order('full_name')
      if (error) throw error
      return data as UserRow[]
    },
    enabled: !!tenantId,
  })

  // Fetch workers
  const { data: workersResult, isLoading, error } = useQuery({
    queryKey: ['workers', tenantId, debouncedSearch, siteFilter, statusFilter, supervisorFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('workers')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId!)
        .order('full_name')
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (debouncedSearch) {
        query = query.or(
          `full_name.ilike.%${debouncedSearch}%,employee_id.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`
        )
      }
      if (siteFilter) {
        query = query.eq('current_site_id', siteFilter)
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }
      if (supervisorFilter) {
        query = query.eq('current_supervisor_id', supervisorFilter)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { workers: data as WorkerRow[], count: count ?? 0 }
    },
    enabled: !!tenantId,
  })

  const workers = workersResult?.workers ?? []
  const totalCount = workersResult?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // CSV Export
  function exportCSV() {
    const headers = ['Full Name', 'Employee ID', 'Occupation', 'Phone', 'Nationality', 'Status', 'Salary Type']
    const rows = workers.map((w) => [
      w.full_name,
      w.employee_id,
      w.occupation ?? '',
      w.phone ?? '',
      w.nationality ?? '',
      w.status,
      w.salary_type,
    ])
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workers_export_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Find site/supervisor names
  const siteMap = useMemo(() => {
    const map = new Map<string, string>()
    sites?.forEach((s) => map.set(s.id, s.name))
    return map
  }, [sites])

  const supervisorMap = useMemo(() => {
    const map = new Map<string, string>()
    supervisors?.forEach((s) => map.set(s.id, s.full_name ?? s.email))
    return map
  }, [supervisors])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Workers</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage all workers in your company
            {totalCount > 0 && ` (${totalCount} total)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={workers.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <Link
            to="/office/workers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Worker
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name, ID, or phone..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
        />
        <select
          value={siteFilter}
          onChange={(e) => { setSiteFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        >
          <option value="">All Sites</option>
          {sites?.map((site) => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
        <select
          value={supervisorFilter}
          onChange={(e) => { setSupervisorFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        >
          <option value="">All Supervisors</option>
          {supervisors?.map((sup) => (
            <option key={sup.id} value={sup.id}>{sup.full_name ?? sup.email}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Failed to load workers. Please try again.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Name</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Employee ID</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Site</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Supervisor</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Occupation</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading workers...
                    </div>
                  </td>
                </tr>
              ) : workers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    {debouncedSearch || siteFilter || statusFilter || supervisorFilter
                      ? 'No workers match your filters.'
                      : 'No workers yet. Click "Add Worker" to get started.'}
                  </td>
                </tr>
              ) : (
                workers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/office/workers/${worker.id}`} className="text-[var(--color-primary)] hover:underline font-medium">
                        {worker.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{worker.employee_id}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {worker.current_site_id ? siteMap.get(worker.current_site_id) ?? '-' : '-'}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {worker.current_supervisor_id ? supervisorMap.get(worker.current_supervisor_id) ?? '-' : '-'}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{worker.occupation ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        worker.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/office/workers/${worker.id}`}
                          className="text-[var(--color-primary)] hover:underline text-xs"
                        >
                          View
                        </Link>
                        <Link
                          to={`/office/workers/${worker.id}/edit`}
                          className="text-[var(--color-primary)] hover:underline text-xs"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
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
