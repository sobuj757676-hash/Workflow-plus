import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserRow } from '@/types/database'

export function SupervisorFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  // Fetch existing supervisor when editing
  const { data: existing } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as UserRow
    },
    enabled: isEditing,
  })

  useEffect(() => {
    if (existing) {
      setEmail(existing.email)
      setFullName(existing.full_name ?? '')
      setPhone(existing.phone ?? '')
    }
  }, [existing])

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        // Update existing supervisor profile
        const { error } = await supabase
          .from('users')
          .update({
            full_name: fullName.trim() || null,
            phone: phone.trim() || null,
          } as any)
          .eq('id', id!)
        if (error) throw error
      } else {
        // Invite a new supervisor (uses the admin_invite_user RPC)
        const { error } = await supabase.rpc('admin_invite_user', {
          p_email: email.trim().toLowerCase(),
          p_role: 'supervisor',
          p_full_name: fullName.trim() || null,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisors'] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      navigate('/office/supervisors')
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to save supervisor')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!fullName.trim()) {
      setError('Full name is required')
      return
    }
    saveMutation.mutate()
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/office/supervisors')} className="p-2 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit Supervisor' : 'Invite Supervisor'}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {isEditing ? 'Update supervisor profile' : 'Send an invitation to a new supervisor'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEditing}
            placeholder="supervisor@company.com"
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:text-[var(--color-text-muted)]"
          />
          {!isEditing && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              They will sign up with this email and automatically get the Supervisor role.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Tan"
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+65 9123 4567"
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Send Invitation'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/office/supervisors')}
            className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
