import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { SiteRow, UserRow } from '@/types/database'

interface SiteFormData {
  name: string
  code: string
  client: string
  address: string
  project: string
  supervisor_id: string
  start_date: string
  end_date: string
  status: string
}

const INITIAL_FORM: SiteFormData = {
  name: '',
  code: '',
  client: '',
  address: '',
  project: '',
  supervisor_id: '',
  start_date: '',
  end_date: '',
  status: 'active',
}

export function SiteFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const [form, setForm] = useState<SiteFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof SiteFormData, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch existing site
  const { data: existingSite, isLoading: isLoadingSite } = useQuery({
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
    queryKey: ['supervisors', tenantId],
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

  // Populate form when editing
  useEffect(() => {
    if (existingSite) {
      setForm({
        name: existingSite.name,
        code: existingSite.code ?? '',
        client: existingSite.client ?? '',
        address: existingSite.address ?? '',
        project: existingSite.project ?? '',
        supervisor_id: existingSite.supervisor_id ?? '',
        start_date: existingSite.start_date ?? '',
        end_date: existingSite.end_date ?? '',
        status: existingSite.status,
      })
    }
  }, [existingSite])

  function validate(): boolean {
    const newErrors: Partial<Record<keyof SiteFormData, string>> = {}
    if (!form.name.trim()) newErrors.name = 'Site name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const siteData = {
        tenant_id: tenantId!,
        name: form.name.trim(),
        code: form.code || null,
        client: form.client || null,
        address: form.address || null,
        project: form.project || null,
        supervisor_id: form.supervisor_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
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
    onError: (error) => {
      setSubmitError(error.message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return
    mutation.mutate()
  }

  function handleChange(field: keyof SiteFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (isEditing && isLoadingSite) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/office/sites')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {isEditing ? 'Edit Site' : 'Add New Site'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {isEditing ? 'Update site details' : 'Create a new construction site'}
          </p>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Site Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Site Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Orchard Tower Phase 2"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.name ? 'border-red-300' : 'border-[var(--color-border)]'}`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="e.g. OT-P2"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Client</label>
              <input
                type="text"
                value={form.client}
                onChange={(e) => handleChange('client', e.target.value)}
                placeholder="e.g. ABC Construction Pte Ltd"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <input
                type="text"
                value={form.project}
                onChange={(e) => handleChange('project', e.target.value)}
                placeholder="e.g. Residential Development"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
                placeholder="Full site address"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Supervisor</label>
              <select
                value={form.supervisor_id}
                onChange={(e) => handleChange('supervisor_id', e.target.value)}
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
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
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
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : isEditing ? 'Update Site' : 'Create Site'}
          </button>
        </div>
      </form>
    </div>
  )
}
