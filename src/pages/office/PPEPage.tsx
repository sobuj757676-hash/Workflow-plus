import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { SiteRow, WorkerRow } from '@/types/database'

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

const PPE_PRESETS = [
  'Safety Helmet',
  'Safety Boots',
  'Hi-Vis Vest',
  'Safety Harness',
  'Gloves',
  'Safety Goggles',
  'Ear Protection',
  'Face Shield',
  'Respirator',
  'Knee Pads',
]

export function OfficePPEPage() {
  const { tenantId, user } = useAuth()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)

  // Create form state
  const [newSiteId, setNewSiteId] = useState('')
  const [newPeriod, setNewPeriod] = useState('')
  const [newItems, setNewItems] = useState<PPEItem[]>([{ name: '', quantity: 1 }])

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ['sites', tenantId],
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

  // Fetch PPE forms
  const { data: forms, isLoading } = useQuery({
    queryKey: ['ppe-forms', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ppe_forms')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PPEForm[]
    },
    enabled: !!tenantId,
  })

  // Fetch all signoffs for display
  const { data: signoffs } = useQuery({
    queryKey: ['ppe-signoffs', tenantId],
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

  // Fetch workers for selected form's site
  const { data: workers } = useQuery({
    queryKey: ['workers-for-ppe', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, employee_id, current_site_id')
        .eq('tenant_id', tenantId!)
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data as Pick<WorkerRow, 'id' | 'full_name' | 'employee_id' | 'current_site_id'>[]
    },
    enabled: !!tenantId,
  })

  const siteMap = new Map(sites?.map((s) => [s.id, s.name]) ?? [])

  // Create PPE form mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newSiteId || !newPeriod) throw new Error('Site and period are required')
      const validItems = newItems.filter((i) => i.name.trim())
      if (validItems.length === 0) throw new Error('At least one PPE item is required')

      const { error } = await supabase.from('ppe_forms').insert({
        tenant_id: tenantId!,
        site_id: newSiteId,
        period: newPeriod,
        items: validItems,
        created_by: user!.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppe-forms'] })
      setShowCreate(false)
      setNewSiteId('')
      setNewPeriod('')
      setNewItems([{ name: '', quantity: 1 }])
    },
  })

  function addItem() {
    setNewItems([...newItems, { name: '', quantity: 1 }])
  }

  function removeItem(index: number) {
    setNewItems(newItems.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof PPEItem, value: string | number) {
    const updated = [...newItems]
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value as string }
    } else {
      updated[index] = { ...updated[index], quantity: value as number }
    }
    setNewItems(updated)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate()
  }

  // Get signoff count for a form
  function getSignoffInfo(formId: string, siteId: string) {
    const formSignoffs = signoffs?.filter((s) => s.ppe_form_id === formId) ?? []
    const siteWorkers = workers?.filter((w) => w.current_site_id === siteId) ?? []
    return { signed: formSignoffs.length, total: siteWorkers.length }
  }

  // Get workers and their signoff status for selected form
  const selectedForm = forms?.find((f) => f.id === selectedFormId)
  const selectedFormWorkers = workers?.filter((w) => w.current_site_id === selectedForm?.site_id) ?? []
  const selectedFormSignoffs = signoffs?.filter((s) => s.ppe_form_id === selectedFormId) ?? []
  const signedWorkerIds = new Set(selectedFormSignoffs.map((s) => s.worker_id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">PPE / Safety Sign-Off</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage PPE issuance forms and track worker sign-offs
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create PPE Form
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">New PPE Issuance Form</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Site</label>
                <select
                  value={newSiteId}
                  onChange={(e) => setNewSiteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                  required
                >
                  <option value="">Select site...</option>
                  {sites?.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Period</label>
                <input
                  type="month"
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">PPE Items</label>
              <div className="space-y-2">
                {newItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                      required
                    >
                      <option value="">Select item...</option>
                      {PPE_PRESETS.map((preset) => (
                        <option key={preset} value={preset}>{preset}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                      placeholder="Qty"
                    />
                    {newItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addItem} className="mt-2 text-sm text-[var(--color-primary)] hover:underline">
                + Add another item
              </button>
            </div>

            {createMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {(createMutation.error as Error).message}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Form'}
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

      {/* Detail View */}
      {selectedForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              {siteMap.get(selectedForm.site_id) ?? 'Unknown Site'} - {selectedForm.period}
            </h3>
            <button
              onClick={() => setSelectedFormId(null)}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Close
            </button>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Items Issued</h4>
            <div className="flex flex-wrap gap-2">
              {(selectedForm.items as PPEItem[]).map((item, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Sign-offs ({signedWorkerIds.size}/{selectedFormWorkers.length})
            </h4>
            <div className="space-y-2">
              {selectedFormWorkers.map((worker) => {
                const hasSigned = signedWorkerIds.has(worker.id)
                const signoff = selectedFormSignoffs.find((s) => s.worker_id === worker.id)
                return (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                  >
                    <span className="text-sm font-medium">{worker.full_name}</span>
                    {hasSigned ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Signed {signoff?.acknowledged_at ? new Date(signoff.acknowledged_at).toLocaleDateString('en-SG') : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">Pending</span>
                    )}
                  </div>
                )
              })}
              {selectedFormWorkers.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">No workers currently assigned to this site.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forms List */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Loading PPE forms...</div>
        ) : !forms || forms.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">
            No PPE forms created yet. Click "Create PPE Form" to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Site</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Items</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Sign-offs</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {forms.map((form) => {
                  const info = getSignoffInfo(form.id, form.site_id)
                  return (
                    <tr key={form.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{siteMap.get(form.site_id) ?? '-'}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{form.period}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {(form.items as PPEItem[]).length} items
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${
                          info.total > 0 && info.signed === info.total ? 'text-green-600' : 'text-amber-600'
                        }`}>
                          {info.signed}/{info.total} signed
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {new Date(form.created_at).toLocaleDateString('en-SG')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedFormId(form.id)}
                          className="text-[var(--color-primary)] hover:underline text-xs"
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
