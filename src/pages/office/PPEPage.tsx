import { useState } from 'react'
import type { PPEFormRow, PPEItem } from '@/types/database'

// Mock data
const MOCK_SITES = [
  { id: 's1', name: 'Marina Bay Tower' },
  { id: 's2', name: 'Jurong West HDB' },
  { id: 's3', name: 'Changi Terminal 5' },
]

const MOCK_PPE_FORMS: PPEFormRow[] = [
  {
    id: 'ppe1',
    tenant_id: 't1',
    site_id: 's1',
    site_name: 'Marina Bay Tower',
    period: '2024-03',
    items: [
      { name: 'Safety Helmet', quantity: 10 },
      { name: 'Safety Boots', quantity: 10 },
      { name: 'Hi-Vis Vest', quantity: 10 },
    ],
    sign_offs: [
      { worker_id: 'w1', worker_name: 'Ali bin Hassan', signed: true, signature_id: 'sig1', signed_at: '2024-03-05T08:00:00Z' },
      { worker_id: 'w2', worker_name: 'Kumar Rajan', signed: true, signature_id: 'sig2', signed_at: '2024-03-05T09:30:00Z' },
      { worker_id: 'w3', worker_name: 'Chen Wei Ming', signed: false, signature_id: null, signed_at: null },
    ],
    status: 'open',
    created_by: 'admin',
    created_at: '2024-03-01T08:00:00Z',
    updated_at: '2024-03-05T09:30:00Z',
  },
  {
    id: 'ppe2',
    tenant_id: 't1',
    site_id: 's2',
    site_name: 'Jurong West HDB',
    period: '2024-03',
    items: [
      { name: 'Safety Helmet', quantity: 5 },
      { name: 'Safety Harness', quantity: 5 },
      { name: 'Gloves', quantity: 5 },
      { name: 'Safety Goggles', quantity: 5 },
    ],
    sign_offs: [
      { worker_id: 'w4', worker_name: 'Muthu Selvam', signed: true, signature_id: 'sig3', signed_at: '2024-03-02T10:00:00Z' },
      { worker_id: 'w5', worker_name: 'Bao Tran', signed: true, signature_id: 'sig4', signed_at: '2024-03-02T10:15:00Z' },
    ],
    status: 'completed',
    created_by: 'admin',
    created_at: '2024-03-01T08:00:00Z',
    updated_at: '2024-03-02T10:15:00Z',
  },
]

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
  const [showCreate, setShowCreate] = useState(false)
  const [selectedForm, setSelectedForm] = useState<PPEFormRow | null>(null)
  const [forms] = useState<PPEFormRow[]>(MOCK_PPE_FORMS)

  // Create form state
  const [newSiteId, setNewSiteId] = useState('')
  const [newPeriod, setNewPeriod] = useState('')
  const [newItems, setNewItems] = useState<PPEItem[]>([{ name: '', quantity: 1 }])

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
    // In production: insert into Supabase
    setShowCreate(false)
    setNewSiteId('')
    setNewPeriod('')
    setNewItems([{ name: '', quantity: 1 }])
  }

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
                  {MOCK_SITES.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
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
                        <option key={preset} value={preset}>
                          {preset}
                        </option>
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
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
              >
                + Add another item
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                Create Form
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
              {selectedForm.site_name} - {selectedForm.period}
            </h3>
            <button
              onClick={() => setSelectedForm(null)}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Close
            </button>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Items Issued</h4>
            <div className="flex flex-wrap gap-2">
              {selectedForm.items.map((item, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Sign-offs ({selectedForm.sign_offs.filter((s) => s.signed).length}/{selectedForm.sign_offs.length})
            </h4>
            <div className="space-y-2">
              {selectedForm.sign_offs.map((signOff) => (
                <div
                  key={signOff.worker_id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                >
                  <span className="text-sm font-medium">{signOff.worker_name}</span>
                  <div className="flex items-center gap-2">
                    {signOff.signed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Signed {signOff.signed_at ? new Date(signOff.signed_at).toLocaleDateString('en-SG') : ''}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-amber-600 font-medium">Pending</span>
                        <button className="text-xs text-[var(--color-primary)] hover:underline">
                          Send Reminder
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Forms List */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Site</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Period</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Items</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Sign-offs</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {forms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    No PPE forms created yet. Click "Create PPE Form" to get started.
                  </td>
                </tr>
              ) : (
                forms.map((form) => {
                  const signedCount = form.sign_offs.filter((s) => s.signed).length
                  const totalCount = form.sign_offs.length
                  return (
                    <tr key={form.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{form.site_name}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{form.period}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {form.items.length} items
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${signedCount === totalCount ? 'text-green-600' : 'text-amber-600'}`}>
                          {signedCount}/{totalCount} signed
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          form.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {form.status === 'completed' ? 'Completed' : 'Open'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedForm(form)}
                          className="text-[var(--color-primary)] hover:underline text-xs"
                        >
                          View Detail
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
