import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce } from '@/hooks/useDebounce'
import type { SiteRow, UserRow } from '@/types/database'

export function SitesPage() {
  const { tenantId } = useAuth()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // Fetch sites
  const { data: sites, isLoading, error } = useQuery({
    queryKey: ['sites', tenantId, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('sites')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('name')

      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,code.ilike.%${debouncedSearch}%,client.ilike.%${debouncedSearch}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data as SiteRow[]
    },
    enabled: !!tenantId,
  })

  // Fetch supervisors for display
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

  const supervisorMap = useMemo(() => {
    const map = new Map<string, string>()
    supervisors?.forEach((s) => map.set(s.id, s.full_name ?? s.email))
    return map
  }, [supervisors])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sites</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage construction sites and projects
            {sites && sites.length > 0 && ` (${sites.length} total)`}
          </p>
        </div>
        <Link
          to="/office/sites/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Site
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, or client..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Failed to load sites. Please try again.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Name</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Code</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Client</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Supervisor</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Start Date</th>
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
                      Loading sites...
                    </div>
                  </td>
                </tr>
              ) : !sites || sites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    {debouncedSearch
                      ? 'No sites match your search.'
                      : 'No sites yet. Click "Add Site" to create one.'}
                  </td>
                </tr>
              ) : (
                sites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{site.name}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{site.code ?? '-'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{site.client ?? '-'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {site.supervisor_id ? supervisorMap.get(site.supervisor_id) ?? '-' : '-'}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{site.start_date ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        site.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : site.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/office/sites/${site.id}/edit`}
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
