import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DocumentUploadForm } from '@/components/DocumentUploadForm'
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

function getExpiryStatus(expiryDate: string | null): 'active' | 'expiring_soon' | 'expired' | 'no_expiry' {
  if (!expiryDate) return 'no_expiry'
  const now = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= 30) return 'expiring_soon'
  return 'active'
}

function getExpiryIndicator(expiryDate: string | null) {
  const status = getExpiryStatus(expiryDate)
  switch (status) {
    case 'expired':
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-red-600 font-medium">Expired</span>
        </div>
      )
    case 'expiring_soon':
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs text-amber-600 font-medium">Expiring Soon</span>
        </div>
      )
    case 'active':
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-green-600 font-medium">Active</span>
        </div>
      )
    case 'no_expiry':
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-xs text-gray-500">No Expiry</span>
        </div>
      )
  }
}

// Mock worker documents
const MOCK_WORKER_DOCUMENTS: DocumentRow[] = [
  {
    id: '1',
    tenant_id: 't1',
    worker_id: 'me',
    type: 'work_permit',
    document_number: 'WP-2024-001234',
    expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    file_url: null,
    file_name: 'work_permit.pdf',
    notes: null,
    status: 'expiring_soon',
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-15T08:00:00Z',
  },
  {
    id: '2',
    tenant_id: 't1',
    worker_id: 'me',
    type: 'passport',
    document_number: 'A12345678',
    expiry_date: '2026-06-15',
    file_url: null,
    file_name: 'passport_scan.jpg',
    notes: null,
    status: 'active',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z',
  },
  {
    id: '3',
    tenant_id: 't1',
    worker_id: 'me',
    type: 'insurance',
    document_number: 'INS-9988776',
    expiry_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    file_url: null,
    file_name: 'insurance_policy.pdf',
    notes: null,
    status: 'expired',
    created_at: '2023-12-01T08:00:00Z',
    updated_at: '2023-12-01T08:00:00Z',
  },
  {
    id: '4',
    tenant_id: 't1',
    worker_id: 'me',
    type: 'medical',
    document_number: 'MED-2024-001',
    expiry_date: '2025-03-31',
    file_url: null,
    file_name: 'medical_cert.pdf',
    notes: 'Fit for work certificate',
    status: 'active',
    created_at: '2024-02-01T08:00:00Z',
    updated_at: '2024-02-01T08:00:00Z',
  },
  {
    id: '5',
    tenant_id: 't1',
    worker_id: 'me',
    type: 'certificate',
    document_number: 'SWH-2024-123',
    expiry_date: '2025-09-15',
    file_url: null,
    file_name: 'safety_working_heights.pdf',
    notes: 'Safety Working at Heights',
    status: 'active',
    created_at: '2024-04-01T08:00:00Z',
    updated_at: '2024-04-01T08:00:00Z',
  },
]

export function WorkerDocumentsPage() {
  const { user, tenantId } = useAuth()
  const [showUpload, setShowUpload] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // Fetch worker's own documents
  const { data: documents } = useQuery({
    queryKey: ['worker-documents', user?.id, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('worker_id', user!.id)
        .order('expiry_date', { ascending: true })
      if (error) throw error
      return data as DocumentRow[]
    },
    enabled: !!user?.id && !!tenantId,
  })

  const displayDocuments = documents?.length ? documents : MOCK_WORKER_DOCUMENTS

  // Expiry warnings
  const expiringDocs = displayDocuments.filter(
    (d) => getExpiryStatus(d.expiry_date) === 'expiring_soon' || getExpiryStatus(d.expiry_date) === 'expired'
  )

  function handleUpload(_data: {
    type: DocumentType
    document_number: string
    expiry_date: string
    file: File | null
  }) {
    // In production, this would upload to Supabase Storage and insert into documents table
    // For now, just show success
    setShowUpload(false)
    setUploadSuccess(true)
    setTimeout(() => setUploadSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Documents</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            View your work permit, passport, insurance, and other documents
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Document
        </button>
      </div>

      {/* Success message */}
      {uploadSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Document uploaded successfully.
        </div>
      )}

      {/* Expiry Warnings */}
      {expiringDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium text-amber-800">Document Expiry Warnings</span>
          </div>
          <ul className="space-y-1">
            {expiringDocs.map((doc) => (
              <li key={doc.id} className="text-sm text-amber-700 flex items-center gap-2">
                <span className="font-medium">{DOCUMENT_TYPE_LABELS[doc.type]}</span>
                <span>-</span>
                <span>
                  {getExpiryStatus(doc.expiry_date) === 'expired'
                    ? `Expired on ${new Date(doc.expiry_date!).toLocaleDateString('en-SG')}`
                    : `Expires on ${new Date(doc.expiry_date!).toLocaleDateString('en-SG')}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Upload New Document</h3>
          <DocumentUploadForm
            onSubmit={handleUpload}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* Document Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayDocuments.map((doc) => (
          <div
            key={doc.id}
            className={`bg-white rounded-xl border p-4 ${
              getExpiryStatus(doc.expiry_date) === 'expired'
                ? 'border-red-200 bg-red-50/30'
                : getExpiryStatus(doc.expiry_date) === 'expiring_soon'
                ? 'border-amber-200 bg-amber-50/30'
                : 'border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${DOCUMENT_TYPE_COLORS[doc.type]}`}>
                {DOCUMENT_TYPE_LABELS[doc.type]}
              </span>
              {getExpiryIndicator(doc.expiry_date)}
            </div>

            <div className="space-y-2">
              {doc.document_number && (
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Number</span>
                  <p className="text-sm font-mono">{doc.document_number}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-[var(--color-text-muted)]">Expiry Date</span>
                <p className="text-sm">
                  {doc.expiry_date
                    ? new Date(doc.expiry_date).toLocaleDateString('en-SG', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'No expiry date'}
                </p>
              </div>
              {doc.notes && (
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Notes</span>
                  <p className="text-sm">{doc.notes}</p>
                </div>
              )}
            </div>

            {doc.file_name && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <button className="text-[var(--color-primary)] hover:underline text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download {doc.file_name}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {displayDocuments.length === 0 && !showUpload && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
          <p>No documents uploaded yet.</p>
          <p className="text-sm mt-1">Click "Upload Document" to add your first document.</p>
        </div>
      )}
    </div>
  )
}
