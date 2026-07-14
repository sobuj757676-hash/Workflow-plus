import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRow } from '@/types/database'

interface Invitation {
  id: string
  email: string
  role: string
  full_name: string | null
  status: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  office_staff: 'Office Staff',
  supervisor: 'Supervisor',
  worker: 'Worker',
}

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  office_staff: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-amber-100 text-amber-800',
  worker: 'bg-gray-100 text-gray-800',
}

export function TeamPage() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('supervisor')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  // All users in the tenant
  const { data: users, isLoading } = useQuery({
    queryKey: ['team-users', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('role')
      if (error) throw error
      return data as UserRow[]
    },
    enabled: !!tenantId,
  })

  // Pending invitations
  const { data: invitations } = useQuery({
    queryKey: ['invitations', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Invitation[]
    },
    enabled: !!tenantId,
  })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('admin_invite_user', {
        p_email: inviteEmail.trim().toLowerCase(),
        p_role: inviteRole,
        p_full_name: inviteName.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      setActionMsg(`Invitation created for ${inviteEmail}. Ask them to sign up with this email.`)
      setInviteOpen(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('supervisor')
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.rpc('admin_update_user_role', {
        p_target: id,
        p_role: role,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      setActionMsg('Role updated. The user must log out and back in for it to take effect.')
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.rpc('admin_set_user_status', {
        p_target: id,
        p_status: status,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      setActionMsg('Status updated.')
    },
    onError: (e: Error) => setActionError(e.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team &amp; Roles</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Invite people and manage their roles — no technical setup needed
          </p>
        </div>
        <button
          onClick={() => {
            setInviteOpen(true)
            setActionError(null)
            setActionMsg(null)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite Member
        </button>
      </div>

      {actionMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-start justify-between gap-3">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-green-600">✕</button>
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start justify-between gap-3">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-600">✕</button>
        </div>
      )}

      {/* Invite form */}
      {inviteOpen && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Invite a team member</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Their name"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="person@email.com"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
              >
                <option value="supervisor">Supervisor</option>
                <option value="office_staff">Office Staff</option>
                <option value="worker">Worker</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            They open the app, tap <strong>Sign Up</strong> with this email, and get the role automatically.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setInviteOpen(false)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setActionError(null)
                if (!inviteEmail.trim()) {
                  setActionError('Email is required')
                  return
                }
                inviteMutation.mutate()
              }}
              disabled={inviteMutation.isPending}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {invitations && invitations.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            <h3 className="font-semibold text-amber-900 text-sm">
              Pending Invitations ({invitations.length}) — waiting for sign-up
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {invitations.map((inv) => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{inv.full_name || inv.email}</span>
                  <span className="text-[var(--color-text-muted)] ml-2">{inv.email}</span>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[inv.role]}`}>
                  {ROLE_LABELS[inv.role]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-semibold text-sm">Members</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Name</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Email</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Role</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-[var(--color-text-muted)]">Loading...</td></tr>
              ) : !users || users.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-[var(--color-text-muted)]">No members yet.</td></tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === user?.id
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {u.full_name || '-'}
                        {isSelf && <span className="ml-2 text-xs text-[var(--color-text-muted)]">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={isSelf || roleMutation.isPending}
                          onChange={(e) => {
                            setActionError(null)
                            roleMutation.mutate({ id: u.id, role: e.target.value })
                          }}
                          className={`px-2 py-1 rounded-lg border border-[var(--color-border)] text-xs ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <option value="office_staff">Office Staff</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="worker">Worker</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          disabled={isSelf || statusMutation.isPending}
                          onClick={() => {
                            setActionError(null)
                            statusMutation.mutate({ id: u.id, status: u.status === 'active' ? 'inactive' : 'active' })
                          }}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          } ${isSelf ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`}
                        >
                          {u.status}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
