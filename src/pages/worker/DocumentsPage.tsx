import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface DocumentRow {
  id: string
  type: string
  number: string | null
  expiry_date: string | null
  file_url: string
  status: string
  created_at: string
}

const typeLabels: Record<string, string> = {
  passport: 'Passport',
  work_permit: 'Work Permit',
  insurance: 'Insurance',
  medical: 'Medical',
  certificate: 'Certificate',
  contract: 'Contract',
  other: 'Other',
}

export function WorkerDocumentsPage() {
  const { user } = useAuth()

  // Get the worker record
  const { data: worker } = useQuery({
    queryKey: ['my-worker', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // Fetch documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['my-documents', worker?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_documents')
        .select('*')
        .eq('worker_id', worker!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as DocumentRow[]
    },
    enabled: !!worker?.id,
  })

  function getExpiryStatus(expiryDate: string | null) {
    if (!expiryDate) return { label: 'No expiry', color: 'bg-gray-100 text-gray-800' }
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800' }
    if (daysUntil <= 30) return { label: `Expiring in ${daysUntil}d`, color: 'bg-amber-100 text-amber-800' }
    if (daysUntil <= 90) return { label: `Expires ${expiry.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}`, color: 'bg-blue-100 text-blue-800' }
    return { label: `Valid until ${expiry.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}`, color: 'bg-green-100 text-green-800' }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Documents</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Your uploaded documents and their expiry status</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {!isLoading && (!documents || documents.length === 0) && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
          <span className="text-4xl">📁</span>
          <p className="mt-3 font-medium">No documents uploaded</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Your company will upload your documents here. Contact your office staff if needed.
          </p>
        </div>
      )}

      {documents && documents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const expiry = getExpiryStatus(doc.expiry_date)
            return (
              <div key={doc.id} className="bg-white rounded-xl border border-[var(--color-border)] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                      {typeLabels[doc.type] ?? doc.type}
                    </span>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {doc.number ?? 'No document number'}
                    </p>
                  </div>
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-primary)] hover:underline"
                    >
                      View
                    </a>
                  )}
                </div>
                <div className="mt-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${expiry.color}`}>
                    {expiry.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
