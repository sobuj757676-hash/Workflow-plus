import { useState } from 'react'
import type { DocumentType } from '@/types/database'

interface DocumentUploadFormProps {
  onSubmit: (data: {
    type: DocumentType
    document_number: string
    expiry_date: string
    file: File | null
  }) => void
  onCancel: () => void
  isLoading?: boolean
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'work_permit', label: 'Work Permit' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'medical', label: 'Medical Certificate' },
  { value: 'certificate', label: 'Certificate / Qualification' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
]

export function DocumentUploadForm({ onSubmit, onCancel, isLoading }: DocumentUploadFormProps) {
  const [type, setType] = useState<DocumentType>('work_permit')
  const [documentNumber, setDocumentNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0] ?? null
    setFile(selectedFile)

    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => setPreview(reader.result as string)
        reader.readAsDataURL(selectedFile)
      } else {
        setPreview(null)
      }
    } else {
      setPreview(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      type,
      document_number: documentNumber,
      expiry_date: expiryDate,
      file,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Document Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
          required
        >
          {DOCUMENT_TYPES.map((dt) => (
            <option key={dt.value} value={dt.value}>
              {dt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Document Number</label>
        <input
          type="text"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="e.g. E1234567A"
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Expiry Date</label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">File Upload</label>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.png,.jpg,.jpeg"
          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-[var(--color-primary)] hover:file:bg-blue-100"
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Accepted: PDF, PNG, JPG (max 10MB)</p>
      </div>

      {/* File Preview */}
      {file && (
        <div className="border border-[var(--color-border)] rounded-lg p-3">
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-32 rounded" />
          ) : (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 3.5L18.5 8H14V3.5zM6 20V4h7v5h5v11H6z" />
              </svg>
              <span>{file.name}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Uploading...' : 'Upload Document'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
