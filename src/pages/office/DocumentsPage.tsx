import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DocumentRow, DocumentType } from '@/types/database'

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  passport: 'Passport',
  work_permit: 'Work Permit',
  insurance: 'Insurance',
  medical: 'Medical',
  certificate: 'Certificate',
  contract: 'Contract',
  other: 'Other',
}

const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  passport: 'bg-blue-100 text-blue-800',
  work_permit: 'bg-purple-100 text-purple-800',
  insurance: 'bg-green-100 text-green-800',
  medical: 'bg-red-100 text-red-800',
  certificate: 'bg-yellow-100 text-yellow-800',
  contract: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-800',
}

type ExpiryFilter = 'all' | 'active' | 'expiring_soon' | 'expired'

function getExpiryStatus(expiryDate: string | null): 'active' | 'expiring_soon' | 'expired' | 'no_expiry' {
  if (!expiryDate) return 'no_expiry'
  const now = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= 30) return 'expiring_soon'
  return 'active'
}

function getExpiryBadge(expiryDate: string | null) {
  const status = getExpiryStatus(expiryDate)
  switch (status) {
    case 'expired':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Expired</span>
    case 'expiring_soon':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Expiring Soon</span>
    case 'active':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
    case 'no_expiry':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No Expiry</span>
  }
}

// Mock documents for display
const MOCK_DOCUMENTS: DocumentRow[] = [
  {
    id: '1',
    tenant_id: 't1',
    worker_id: 'w1',
    type: 'work_permit',
    document_number: 'WP-2024-001234',
    expiry_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    file_url: null,
    file_name: 'work_permit_ali.pdf',
    notes: null,
    status: 'expiring_soon',
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-15T08:00:00Z',
  },
  {
    id: '2',
    tenant_id: 't1',
    worker_id: 'w1',
    type: 'passport',
    document_number: 'A12345678',
    expiry_date: '2026-06-15',
    file_url: null,
    file_name: 'passport_ali.pdf',
    notes: null,
    status: 'active',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z',
  },
  {
    id: '3',
    tenant_id: 't1',
    worker_id: 'w2',
    type: 'insurance',
    document_number: 'INS-9988776',
    expiry_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    file_url: null,
    file_name: 'insurance_kumar.pdf',
    notes: null,
    status: 'expired',
    created_at: '2023-12-01T08:00:00Z',
    updated_at: '2023-12-01T08:00:00Z',
  },
  {
    id: '4',
    tenant_id: 't1',
    worker_id: 'w2',
    type: 'medical',
    document_number: 'MED-2024-556',
    expiry_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    file_url: null,
    file_name: 'medical_cert_kumar.pdf',
    notes: null,
    status: 'expiring_soon',
    created_at: '2024-02-01T08:00:00Z',
    updated_at: '2024-02-01T08:00:00Z',
  },
  {
    id: '5',
    tenant_id: 't1',
    worker_id: 'w3',
    type: 'work_permit',
    document_number: 'WP-2024-005678',
    expiry_date: '2025-12-31',
    file_url: null,
    file_name: 'work_permit_chen.pdf',
    notes: null,
    status: 'active',
    created_at: '2024-03-01T08:00:00Z',
    updated_at: '2024-03-01T08:00:00Z',
  },
  {
    id: '6',
    tenant_id: 't1',
    worker_id: 'w3',
    type: 'certificate',
    document_number: 'CERT-SWA-2024',
    expiry_date: '2025-09-15',
    file_url: null,
    file_name: 'safety_cert_chen.pdf',
    notes: 'Safety Working at Heights',
    status: 'active',
    created_at: '2024-04-01T08:00:00Z',
    updated_at: '2024-04-01T08:00:00Z',
  },
]

const MOCK_WORKERS: { id: string; full_name: string }[] = [
  { id: 'w1', full_name: 'Ali bin Hassan' },
  { id: 'w2', full_name: 'Kumar Rajan' },
  { id: 'w3', full_name: 'Chen Wei Ming' },
]

export function OfficeDocumentsPage() {
  const { tenantId } = useAuth()
  const [workerFilter, setWorkerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all')

  // Fetch workers for filter
  const { data: workers } = useQuery({
    queryKey: ['workers-list', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name')
        .eq('tenant_id', tenantId!)
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data as { id: string; full_name: string }[]
    },
    enabled: !!tenantId,
  })

  // Fetch documents
  const { data: documents } = useQuery({
    queryKey: ['documents', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('expiry_date', { ascending: true })
      if (error) throw error
      return data as DocumentRow[]
    },
    enabled: !!tenantId,
  })

  // Use mock data if no real data
  const displayDocuments = documents?.length ? documents : MOCK_DOCUMENTS
  const displayWorkers = workers?.length ? workers : MOCK_WORKERS

  // Worker name map
  const workerMap = useMemo(() => {
    const map = new Map<string, string>()
    displayWorkers.forEach((w) => map.set(w.id, w.full_name))
    return map
  }, [displayWorkers])

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return displayDocuments.filter((doc) => {
      if (workerFilter && doc.worker_id !== workerFilter) return false
      if (typeFilter && doc.type !== typeFilter) return false
      if (expiryFilter !== 'all') {
        const status = getExpiryStatus(doc.expiry_date)
        if (expiryFilter === 'active' && status !== 'active' && status !== 'no_expiry') return false
        if (expiryFilter === 'expiring_soon' && status !== 'expiring_soon') return false
        if (expiryFilter === 'expired' && status !== 'expired') return false
      }
      return true
    })
  }, [displayDocuments, workerFilter, typeFilter, expiryFilter])

  // Stats
  const stats = useMemo(() => {
    let expired = 0
    let expiringSoon = 0
    let active = 0
    displayDocuments.forEach((doc) => {
      const status = getExpiryStatus(doc.expiry_date)
      if (status === 'expired') expired++
      else if (status === 'expiring_soon') expiringSoon++
      else active++
    })
    return { expired, expiringSoon, active, total: displayDocuments.length }
  }, [displayDocuments])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Documents Management</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Track worker documents, permits, and expiry dates across the company
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Total Documents</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-green-600">Active</p>
          <p className="text-2xl font-bold mt-1 text-green-700">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 border-l-4 border-l-amber-400">
          <p className="text-sm text-amber-600">Expiring Soon</p>
          <p className="text-2xl font-bold mt-1 text-amber-700">{stats.expiringSoon}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 border-l-4 border-l-red-400">
          <p className="text-sm text-red-600">Expired</p>
          <p className="text-2xl font-bold mt-1 text-red-700">{stats.expired}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={workerFilter}
          onChange={(e) => setWorkerFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        >
          <option value="">All Workers</option>
          {displayWorkers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.full_name}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        >
          <option value="">All Types</option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value as ExpiryFilter)}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring Soon (30 days)</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Worker</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Type</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Number</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Expiry Date</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    No documents found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {workerMap.get(doc.worker_id) ?? 'Unknown Worker'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DOCUMENT_TYPE_COLORS[doc.type]}`}>
                        {DOCUMENT_TYPE_LABELS[doc.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono text-xs">
                      {doc.document_number ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {doc.expiry_date
                        ? new Date(doc.expiry_date).toLocaleDateString('en-SG', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {getExpiryBadge(doc.expiry_date)}
                    </td>
                    <td className="px-4 py-3">
                      {doc.file_name ? (
                        <button className="text-[var(--color-primary)] hover:underline text-xs flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {doc.file_name}
                        </button>
                      ) : (
                        <span className="text-[var(--color-text-muted)] text-xs">No file</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
