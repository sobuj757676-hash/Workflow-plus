import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch workers (active only)
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

  // Fetch sites (active only)
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

  const assignMutation = useMutation({
    mutationFn: async () => {
      // Create worker_assignments row
      const { error: assignError } = await supabase
        .from('worker_assignments')
        .insert({
          tenant_id: tenantId!,
          worker_id: selectedWorker,
          site_id: selectedSite,
          supervisor_id: selectedSupervisor || null,
          start_date: startDate,
          end_date: null,
        } as any)
      if (assignError) throw assignError

      // Update worker's current_site_id and current_supervisor_id
      const { error: workerError } = await supabase
        .from('workers')
        .update({
          current_site_id: selectedSite,
          current_supervisor_id: selectedSupervisor || null,
        } as any)
        .eq('id', selectedWorker)
      if (workerError) throw workerError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      queryClient.invalidateQueries({ queryKey: ['worker-assignments'] })
      setSuccessMessage('Worker assigned successfully!')
      setSelectedWorker('')
      setSelectedSite('')
      setSelectedSupervisor('')
      setStartDate(new Date().toISOString().slice(0, 10))
      setSubmitError(null)
    },
    onError: (error) => {
      setSubmitError(error.message)
      setSuccessMessage(null)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSuccessMessage(null)

    if (!selectedWorker) {
      setSubmitError('Please select a worker')
      return
    }
    if (!selectedSite) {
      setSubmitError('Please select a site')
      return
    }
    if (!startDate) {
      setSubmitError('Please select a start date')
      return
    }

    assignMutation.mutate()
  }

  const selectedWorkerData = workers?.find((w) => w.id === selectedWorker)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/office/workers')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Assign Worker to Site</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Select a worker, site, and supervisor for the assignment
          </p>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Assignment Details</h3>
          <div className="space-y-4">
            {/* Step 1: Select Worker */}
            <div>
              <label className="block text-sm font-medium mb-1">
                1. Select Worker <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Choose a worker...</option>
                {workers?.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.full_name} ({worker.employee_id})
                  </option>
                ))}
              </select>
              {selectedWorkerData?.current_site_id && (
                <p className="mt-1 text-xs text-amber-600">
                  This worker is currently assigned to a site. This will reassign them.
                </p>
              )}
            </div>

            {/* Step 2: Select Site */}
            <div>
              <label className="block text-sm font-medium mb-1">
                2. Select Site <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Choose a site...</option>
                {sites?.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} {site.code ? `(${site.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Select Supervisor */}
            <div>
              <label className="block text-sm font-medium mb-1">
                3. Select Supervisor
              </label>
              <select
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Choose a supervisor (optional)...</option>
                {supervisors?.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.full_name ?? sup.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium mb-1">
                4. Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        {selectedWorker && selectedSite && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
            <h4 className="font-medium text-sm text-blue-900 mb-2">Assignment Preview</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><span className="font-medium">Worker:</span> {workers?.find((w) => w.id === selectedWorker)?.full_name}</p>
              <p><span className="font-medium">Site:</span> {sites?.find((s) => s.id === selectedSite)?.name}</p>
              {selectedSupervisor && (
                <p><span className="font-medium">Supervisor:</span> {supervisors?.find((s) => s.id === selectedSupervisor)?.full_name ?? supervisors?.find((s) => s.id === selectedSupervisor)?.email}</p>
              )}
              <p><span className="font-medium">Start Date:</span> {startDate}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/office/workers')}
            className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={assignMutation.isPending || !selectedWorker || !selectedSite}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign Worker'}
          </button>
        </div>
      </form>
    </div>
  )
}
