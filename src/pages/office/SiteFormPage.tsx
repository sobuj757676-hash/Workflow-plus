import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { SiteRow, UserRow } from '@/types/database'

export function SiteFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [client, setClient] = useState('')
  const [address, setAddress] = useState('')
  const [project, setProject] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('active')
  const [error, setError] = useState('')

  // Fetch existing site when editing
  const { data: existingSite } = useQuery({
    queryKey: ['site', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as SiteRow
    },
    enabled: isEditing,
  })

  // Fetch supervisors for dropdown
  const { data: supervisors } = useQuery({
    queryKey: ['supervisors-list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('role', 'supervisor')
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data as UserRow[]
    },
    enabled: !!tenantId,
  })

  useEffect(() => {
    if (existingSite) {
      setName(existingSite.name)
      setCode(existingSite.code ?? '')
      setClient(existingSite.client ?? '')
      setAddress(existingSite.address ?? '')
      setProject(existingSite.project ?? '')
      setSupervisorId(existingSite.supervisor_id ?? '')
      setStartDate(existingSite.start_date ?? '')
      setEndDate(existingSite.end_date ?? '')
      setStatus(existingSite.status)
    }
  }, [existingSite])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const siteData = {
        tenant_id: tenantId!,
        name: name.trim(),
        code: code.trim() || null,
        client: client.trim() || null,
        address: address.trim() || null,
        project: project.trim() || null,
        supervisor_id: supervisorId || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
      }

      if (isEditing) {
        const { error } = await supabase
          .from('sites')
          .update(siteData as any)
          .eq('id', id!)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('sites')
          .insert(siteData as any)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      navigate('/office/sites')
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to save site')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Site name is required')
      return
    }
    saveMutation.mutate()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/office/sites')} className="p-2 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit Site' : 'Create New Site'}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {isEditing ? 'Update site details' : 'Add a new construction site'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
          <h3 className="font-semibold mb-2">Site Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Site Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marina Bay Tower"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MBT-01"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Client</label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="e.g. HDB, JTC"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Electrical Works Phase 2"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full site address"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
          <h3 className="font-semibold mb-2">Assignment & Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Supervisor</label>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">None</option>
                {supervisors?.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.full_name ?? sup.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/office/sites')}
            className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Site' : 'Create Site'}
          </button>
        </div>
      </form>
    </div>
  )
}
