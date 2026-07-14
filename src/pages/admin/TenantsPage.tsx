import { useState } from 'react'

interface Tenant {
  id: string
  name: string
  status: 'active' | 'suspended'
  plan: string
  users: number
  adminEmail: string
  createdAt: string
}

const MOCK_TENANTS: Tenant[] = [
  { id: 't1', name: 'ABC Construction Pte Ltd', status: 'active', plan: 'Professional', users: 24, adminEmail: 'admin@abc-construction.sg', createdAt: '2024-01-15' },
  { id: 't2', name: 'XYZ Building Services', status: 'active', plan: 'Professional', users: 18, adminEmail: 'manager@xyz-building.sg', createdAt: '2024-02-01' },
  { id: 't3', name: 'DEF Engineering Co', status: 'active', plan: 'Starter', users: 12, adminEmail: 'hr@def-eng.sg', createdAt: '2024-02-20' },
  { id: 't4', name: 'GHI Contractors', status: 'suspended', plan: 'Starter', users: 8, adminEmail: 'ops@ghi-contractors.sg', createdAt: '2024-02-15' },
  { id: 't5', name: 'JKL Renovation Works', status: 'active', plan: 'Starter', users: 6, adminEmail: 'admin@jkl-reno.sg', createdAt: '2024-03-01' },
  { id: 't6', name: 'MNO Infrastructure', status: 'active', plan: 'Enterprise', users: 42, adminEmail: 'it@mno-infra.sg', createdAt: '2023-11-10' },
  { id: 't7', name: 'PQR Maintenance Co', status: 'active', plan: 'Professional', users: 15, adminEmail: 'admin@pqr-maint.sg', createdAt: '2024-01-20' },
  { id: 't8', name: 'STU Development Group', status: 'active', plan: 'Enterprise', users: 38, adminEmail: 'cto@stu-dev.sg', createdAt: '2023-10-05' },
]

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const newTenant: Tenant = {
      id: `t${Date.now()}`,
      name: newCompanyName,
      status: 'active',
      plan: 'Starter',
      users: 1,
      adminEmail: newAdminEmail,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    setTenants([newTenant, ...tenants])
    setShowCreate(false)
    setNewCompanyName('')
    setNewAdminEmail('')
  }

  function toggleStatus(id: string) {
    setTenants(tenants.map((t) =>
      t.id === id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tenant Management</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage all companies on the platform ({tenants.length} total)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Tenant
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Create New Tenant</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="e.g. Acme Construction Pte Ltd"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Admin Email</label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@company.sg"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                required
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                Provision Tenant
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tenant Detail */}
      {selectedTenant && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{selectedTenant.name}</h3>
            <button
              onClick={() => setSelectedTenant(null)}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">Admin Email</span>
              <p className="text-sm font-medium">{selectedTenant.adminEmail}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">Plan</span>
              <p className="text-sm font-medium">{selectedTenant.plan}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">Users</span>
              <p className="text-sm font-medium">{selectedTenant.users}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">Created</span>
              <p className="text-sm font-medium">{selectedTenant.createdAt}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-muted)]">Status</span>
              <p className="text-sm">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedTenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedTenant.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Company</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Users</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Created</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{tenant.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{tenant.plan}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{tenant.users}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{tenant.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTenant(tenant)}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() => toggleStatus(tenant.id)}
                        className={`text-xs hover:underline ${
                          tenant.status === 'active' ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
