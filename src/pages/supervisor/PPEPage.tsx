import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkerRow, SiteRow } from '@/types/database'

interface PPEItem {
  name: string
  quantity: number
}

interface PPEForm {
  id: string
  site_id: string
  period: string
  items: PPEItem[]
  created_at: string
}

interface PPESignoff {
  id: string
  ppe_form_id: string
  worker_id: string
  acknowledged_at: string
}

export function SupervisorPPEPage() {
  const { user, tenantId } = useAuth()
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)

  // Find sites supervised by this user
  const { data: mySites } = useQuery({
    queryKey: ['my-sites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('supervisor_id', user!.id)
        .eq('status', 'active')
      if (error) throw error
      return data as SiteRow[]
    },
    enabled: !!user?.id,
  })

  const siteIds = mySites?.map((s) => s.id) ?? []
  const siteMap = new Map(mySites?.map((s) => [s.id, s.name]) ?? [])

  // Fetch PPE forms for my sites
  const { data: forms, isLoading } = useQuery({
    queryKey: ['supervisor-ppe-forms', siteIds],
    queryFn: async () => {
      if (siteIds.length === 0) return []
      const { data, error } = await supabase
        .from('ppe_forms')
        .select('*')
        .in('site_id', siteIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PPEForm[]
    },
    enabled: siteIds.length > 0,
  })

  // Fetch signoffs
  const { data: signoffs } = useQuery({
    queryKey: ['supervisor-ppe-signoffs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ppe_signoffs')
        .select('*')
        .eq('tenant_id', tenantId!)
      if (error) throw error
      return data as PPESignoff[]
    },
    enabled: !!tenantId,
  })

  // Fetch workers under this supervisor
  const { data: workers } = useQuery({
    queryKey: ['my-workers-ppe', user?.id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, employee_id, current_site_id')
        .eq('current_supervisor_id', user!.id)
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data as Pick<WorkerRow, 'id' | 'full_name' | 'employee_id' | 'current_site_id'>[]
    },
    enabled: !!user?.id,
  })

  const selectedForm = forms?.find((f) => f.id === selectedFormId)
  const formWorkers = workers?.filter((w) => w.current_site_id === selectedForm?.site_id) ?? []
  const formSignoffs = signoffs?.filter((s) => s.ppe_form_id === selectedFormId) ?? []
  const signedWorkerIds = new Set(formSignoffs.map((s) => s.worker_id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PPE Sign-Off</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          PPE forms for your sites. Track which workers have acknowledged receipt.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Detail View */}
      {selectedForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">{siteMap.get(selectedForm.site_id) ?? 'Site'} - {selectedForm.period}</h3>
            </div>
            <button
              onClick={() => setSelectedFormId(null)}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Close
            </button>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-medium text-[var(--color-text-muted)] uppercase mb-2">PPE Items</h4>
            <div className="flex flex-wrap gap-2">
              {(selectedForm.items as PPEItem[]).map((item, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-[var(--color-text-muted)] uppercase mb-2">
              Workers ({signedWorkerIds.size}/{formWorkers.length})
            </h4>
            <div className="space-y-2">
              {formWorkers.map((worker) => {
                const hasSigned = signedWorkerIds.has(worker.id)
                const signoff = formSignoffs.find((s) => s.worker_id === worker.id)
                return (
                  <div key={worker.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                    <span className="text-sm font-medium">{worker.full_name}</span>
                    {hasSigned ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Signed {signoff ? new Date(signoff.acknowledged_at).toLocaleDateString('en-SG') : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">Pending</span>
                    )}
                  </div>
                )
              })}
              {formWorkers.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">No workers assigned to this site.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forms list */}
      {!isLoading && forms && forms.length > 0 && (
        <div className="space-y-3">
          {forms.map((form) => {
            const fSignoffs = signoffs?.filter((s) => s.ppe_form_id === form.id) ?? []
            const fWorkers = workers?.filter((w) => w.current_site_id === form.site_id) ?? []
            const signedCount = fSignoffs.length
            const totalCount = fWorkers.length

            return (
              <div key={form.id} className="bg-white rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{siteMap.get(form.site_id) ?? 'Site'}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">Period: {form.period}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    totalCount > 0 && signedCount === totalCount
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {signedCount}/{totalCount} signed
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(form.items as PPEItem[]).map((item, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                      {item.name}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedFormId(form.id)}
                  className="text-sm text-[var(--color-primary)] hover:underline font-medium"
                >
                  View Details
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && (!forms || forms.length === 0) && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
          No PPE forms for your sites yet. The office will create them when needed.
        </div>
      )}
    </div>
  )
}
