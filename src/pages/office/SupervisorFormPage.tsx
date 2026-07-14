import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRow, SiteRow } from '@/types/database'

interface SupervisorFormData {
  full_name: string
  email: string
  phone: string
  status: string
  site_ids: string[]
}

const INITIAL_FORM: SupervisorFormData = {
  full_name: '',
  email: '',
  phone: '',
  status: 'active',
  site_ids: [],
}

export function SupervisorFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const [form, setForm] = useState<SupervisorFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof SupervisorFormData, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)

  // Fetch existing supervisor when editing
  const { data: existingSupervisor, isLoading: isLoadingSupervisor } = useQuery({
    queryKey: ['supervisor-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id!)
        .eq('role', 'supervisor')
        .single()
      if (error) throw error
      return data as UserRow
    },
    enabled: isEditing,
  })

  // Fetch sites
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

  // Populate form when editing
  useEffect(() => {
    if (existingSupervisor) {
      const assignedSites = sites?.filter((s) => s.supervisor_id === existingSupervisor.id).map((s) => s.id) ?? []
      setForm({
        full_name: existingSupervisor.full_name ?? '',
        email: existingSupervisor.email,
        phone: existingSupervisor.phone ?? '',
        status: existingSupervisor.status,
        site_ids: assignedSites,
      })
    }
  }, [existingSupervisor, sites])

  function validate(): boolean {
    const newErrors: Partial<Record<keyof SupervisorFormData, string>> = {}
    if (!form.full_name.trim()) newErrors.full_name = 'Name is required'
    if (!form.email.trim()) newErrors.email = 'Email is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        // Update user (without phone — column doesn't exist in users table)
        const { error } = await supabase
          .from('users')
          .update({
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            status: form.status,
          } as any)
          .eq('id', id!)
        if (error) throw error

        // Update site assignments - remove old, add new
        // First unassign from all sites
        await supabase
          .from('sites')
          .update({ supervisor_id: null } as any)
          .eq('supervisor_id', id!)

        // Then assign to selected sites
        for (const siteId of form.site_ids) {
          await supabase
            .from('sites')
            .update({ supervisor_id: id! } as any)
            .eq('id', siteId)
        }
      } else {
        // Create supervisor via INVITATION (production-safe, no service_role).
        // The person signs up with this email and is auto-assigned the supervisor role.
        const { error } = await supabase.rpc('admin_invite_user', {
          p_email: form.email.trim().toLowerCase(),
          p_role: 'supervisor',
          p_full_name: form.full_name.trim(),
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisors'] })
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      if (!isEditing) {
        setInviteSent(true)
      } else {
        navigate('/office/supervisors')
      }
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

  function handleChange(field: keyof SupervisorFormData, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function toggleSite(siteId: string) {
    setForm((prev) => ({
      ...prev,
      site_ids: prev.site_ids.includes(siteId)
        ? prev.site_ids.filter((s) => s !== siteId)
        : [...prev.site_ids, siteId],
    }))
  }

  if (isEditing && isLoadingSupervisor) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  // Invitation sent confirmation
  if (inviteSent) {
    return (
      <div className="space-y-6 max-w-lg">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Invitation created</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Ask <strong>{form.full_name}</strong> to open the app and <strong>Sign Up</strong> using{' '}
            <strong>{form.email}</strong>. They will automatically become a <strong>Supervisor</strong> —
            no extra steps needed.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setInviteSent(false)
                setForm(INITIAL_FORM)
              }}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Invite another
            </button>
            <button
              onClick={() => navigate('/office/supervisors')}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)]"
            >
              Back to Supervisors
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/office/supervisors')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {isEditing ? 'Edit Supervisor' : 'Add Supervisor'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {isEditing ? 'Update supervisor details' : 'Invite a supervisor by email — they sign up and get the role automatically'}
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
          <h3 className="font-semibold mb-4">Supervisor Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="John Smith"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.full_name ? 'border-red-300' : 'border-[var(--color-border)]'}`}
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="supervisor@company.com"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.email ? 'border-red-300' : 'border-[var(--color-border)]'}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+65 9876 5432"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Site Assignment */}
        {isEditing && sites && sites.length > 0 && (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <h3 className="font-semibold mb-4">Site Assignments</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-3">
              Select the sites this supervisor is assigned to.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sites.map((site) => (
                <label key={site.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.site_ids.includes(site.id)}
                    onChange={() => toggleSite(site.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{site.name}</span>
                  {site.code && <span className="text-xs text-[var(--color-text-muted)]">({site.code})</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/office/supervisors')}
            className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : isEditing ? 'Update Supervisor' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </div>
  )
}
