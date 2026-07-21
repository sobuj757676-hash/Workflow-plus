import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkerRow, SiteRow, UserRow } from '@/types/database'

export function WorkerAssignmentPage() {
  const { tenantId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedWorker, setSelectedWorker] = useState('')
  const [selectedSite, setSelectedSite] = useState('')
  const [selectedSupervisor, setSelectedSupervisor] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch active workers
  const { data: workers } = useQuery({
    queryKey: ['workers-active', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data as WorkerRow[]
    },
    enabled: !!tenantId,
  })

  // Fetch active sites
  const { data: sites } = useQuery({
    queryKey: ['sites-active', tenantId],
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

  // Fetch supervisors
  const { data: supervisors } = useQuery({
    queryKey: ['supervisors-active', tenantId],
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

  // Auto-fill supervisor when site is selected (if site has assigned supervisor)
  function handleSiteChange(siteId: string) {
    setSelectedSite(siteId)
    const site = sites?.find((s) => s.id === siteId)
    if (site?.supervisor_id) {
      setSelectedSupervisor(site.supervisor_id)
    }
  }

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorker || !selectedSite || !selectedSupervisor) {
        throw new Error('Please select a worker, site, and supervisor')
      }

      const today = new Date().toISOString().slice(0, 10)

      // End any current assignment for this worker
      const { error: endError } = await supabase
        .from('worker_assignments')
        .update({ end_date: today } as any)
        .eq('worker_id', selectedWorker)
        .eq('tenant_id', tenantId!)
        .is('end_date', null)
      if (endError) throw endError

      // Create new assignment
      const { error: createError } = await supabase
        .from('worker_assignments')
        .insert({
          tenant_id: tenantId!,
          worker_id: selectedWorker,
          site_id: selectedSite,
          supervisor_id: selectedSupervisor,
          start_date: today,
          end_date: null,
        } as any)
      if (createError) throw createError

      // Update worker's current site and supervisor
      const { error: updateError } = await supabase
        .from('workers')
        .update({
          current_site_id: selectedSite,
          current_supervisor_id: selectedSupervisor,
        } as any)
        .eq('id', selectedWorker)
      if (updateError) throw updateError
    },
    onSuccess: () => {
      setSuccess('Worker assigned successfully!')
      setSelectedWorker('')
      setSelectedSite('')
      setSelectedSupervisor('')
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      queryClient.invalidateQueries({ queryKey: ['worker-assignments'] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    assignMutation.mutate()
  }

  const selectedWorkerData = workers?.find((w) => w.id === selectedWorker)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/office/workers')} className="p-2 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold">Assign Worker</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Assign a worker to a site and supervisor
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-5">
        {/* Worker Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Select Worker <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Choose a worker...</option>
            {workers?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name} ({w.employee_id})
              </option>
            ))}
          </select>
          {selectedWorkerData && selectedWorkerData.current_site_id && (
            <p className="mt-1 text-xs text-amber-600">
              Currently assigned to another site. This will transfer them.
            </p>
          )}
        </div>

        {/* Site Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Select Site <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedSite}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Choose a site...</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Supervisor Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Assign to Supervisor <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedSupervisor}
            onChange={(e) => setSelectedSupervisor(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Choose a supervisor...</option>
            {supervisors?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? s.email}
              </option>
            ))}
          </select>
        </div>

        {/* Summary */}
        {selectedWorker && selectedSite && selectedSupervisor && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Assignment Summary</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p>
                <strong>Worker:</strong>{' '}
                {workers?.find((w) => w.id === selectedWorker)?.full_name}
              </p>
              <p>
                <strong>Site:</strong>{' '}
                {sites?.find((s) => s.id === selectedSite)?.name}
              </p>
              <p>
                <strong>Supervisor:</strong>{' '}
                {supervisors?.find((s) => s.id === selectedSupervisor)?.full_name ??
                  supervisors?.find((s) => s.id === selectedSupervisor)?.email}
              </p>
              <p>
                <strong>Effective:</strong> Today ({new Date().toLocaleDateString()})
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={assignMutation.isPending || !selectedWorker || !selectedSite || !selectedSupervisor}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign Worker'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/office/workers')}
            className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
