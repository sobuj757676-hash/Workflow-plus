export function AdminDashboardPage() {
  const stats = [
    { label: 'Total Tenants', value: '12', icon: '🏢', trend: '+2 this month' },
    { label: 'Total Users', value: '156', icon: '👥', trend: '+14 this month' },
    { label: 'Active Companies', value: '10', icon: '✅', trend: '83% active' },
    { label: 'Revenue (MRR)', value: '$8,400', icon: '💰', trend: '+12% growth' },
  ]

  const recentTenants = [
    { name: 'ABC Construction Pte Ltd', status: 'active', users: 24, createdAt: '2024-03-10' },
    { name: 'XYZ Building Services', status: 'active', users: 18, createdAt: '2024-03-05' },
    { name: 'DEF Engineering Co', status: 'active', users: 12, createdAt: '2024-02-20' },
    { name: 'GHI Contractors', status: 'suspended', users: 8, createdAt: '2024-02-15' },
    { name: 'JKL Renovation Works', status: 'active', users: 6, createdAt: '2024-01-30' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Platform overview and tenant management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[var(--color-border)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">{stat.label}</div>
            <div className="text-xs text-green-600 mt-0.5">{stat.trend}</div>
          </div>
        ))}
      </div>

      {/* Recent Tenant Activity */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="font-semibold mb-4">Recent Tenant Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left py-2 font-medium text-[var(--color-text-muted)]">Company</th>
                <th className="text-left py-2 font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="text-left py-2 font-medium text-[var(--color-text-muted)]">Users</th>
                <th className="text-left py-2 font-medium text-[var(--color-text-muted)]">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {recentTenants.map((tenant) => (
                <tr key={tenant.name} className="hover:bg-gray-50">
                  <td className="py-2.5 font-medium">{tenant.name}</td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{tenant.users}</td>
                  <td className="py-2.5 text-[var(--color-text-muted)]">{tenant.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
