import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce } from '@/hooks/useDebounce'
import type { UserRow, SiteRow } from '@/types/database'

export function SupervisorsPage() {
  const { tenantId } = useAuth()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // Fetch supervisors
  const { data: supervisors, isLoading, error } = useQuery({
    queryKey: ['supervisors', tenantId, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('role', 'supervisor')
        .order('full_name')

      if (debouncedSearch) {
        query = query.or(
          `full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data as UserRow[]
    },
    enabled: !!tenantId,
  })

  // Fetch sites to show supervisor assignments
  const { data: sites } = useQuery({
    queryKey: ['sites', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('name')
      if (error) throw error
      return data as SiteRow[]
    },
    enabled: !!tenantId,
  })

  // Map supervisor IDs to their assigned sites
  const supervisorSites = new Map<string, string[]>()
  sites?.forEach((site) => {
    if (site.supervisor_id) {
      const existing = supervisorSites.get(site.supervisor_id) ?? []
      existing.push(site.name)
      supervisorSites.set(site.supervisor_id, existing)
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Supervisors</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage site supervisors
            {supervisors && supervisors.length > 0 && ` (${supervisors.length} total)`}
          </p>
        </div>
        <Link
          to="/office/supervisors/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supervisor
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Failed to load supervisors. Please try again.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Name</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Email</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Assigned Sites</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading supervisors...
                    </div>
                  </td>
                </tr>
              ) : !supervisors || supervisors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    {debouncedSearch
                      ? 'No supervisors match your search.'
                      : 'No supervisors yet. Click "Add Supervisor" to create one.'}
                  </td>
                </tr>
              ) : (
                supervisors.map((sup) => (
                  <tr key={sup.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{sup.full_name ?? '-'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{sup.email}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{sup.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {supervisorSites.get(sup.id)?.join(', ') ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        sup.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sup.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/office/supervisors/${sup.id}/edit`}
                        className="text-[var(--color-primary)] hover:underline text-xs"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
