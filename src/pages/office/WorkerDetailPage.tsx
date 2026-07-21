import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  WorkerRow,
  SiteRow,
  UserRow,
  WorkerAssignmentRow,
  AttendanceEntryRow,
  DocumentRow,
  DocumentType,
} from '@/types/database'

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


export function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

  // Fetch worker by ID
  const { data: worker, isLoading, error } = useQuery({
    queryKey: ['worker', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as WorkerRow
    },
    enabled: !!id,
  })

  // Fetch current site
  const { data: site } = useQuery({
    queryKey: ['site', worker?.current_site_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', worker!.current_site_id!)
        .single()
      if (error) throw error
      return data as SiteRow
    },
    enabled: !!worker?.current_site_id,
  })


  // Fetch current supervisor
  const { data: supervisor } = useQuery({
    queryKey: ['supervisor', worker?.current_supervisor_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', worker!.current_supervisor_id!)
        .single()
      if (error) throw error
      return data as UserRow
    },
    enabled: !!worker?.current_supervisor_id,
  })

  // Fetch assignment history
  const { data: assignments } = useQuery({
    queryKey: ['worker-assignments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_assignments')
        .select('*')
        .eq('worker_id', id!)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data as WorkerAssignmentRow[]
    },
    enabled: !!id,
  })

  // Fetch sites for assignment history display
  const { data: allSites } = useQuery({
    queryKey: ['all-sites', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('tenant_id', tenantId!)
      if (error) throw error
      return data as Pick<SiteRow, 'id' | 'name'>[]
    },
    enabled: !!tenantId,
  })


  // Fetch recent attendance entries
  const { data: attendanceEntries } = useQuery({
    queryKey: ['worker-attendance', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_entries')
        .select('*')
        .eq('worker_id', id!)
        .order('date', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as AttendanceEntryRow[]
    },
    enabled: !!id,
  })

  // Fetch documents for this worker
  const { data: documents } = useQuery({
    queryKey: ['worker-documents', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('worker_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as DocumentRow[]
    },
    enabled: !!id,
  })

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      const newStatus = worker?.status === 'active' ? 'inactive' : 'active'
      const { error } = await supabase
        .from('workers')
        .update({ status: newStatus } as any)
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      setShowDeactivateConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['worker', id] })
      queryClient.invalidateQueries({ queryKey: ['workers', tenantId] })
    },
  })


  const siteMap = new Map(allSites?.map((s) => [s.id, s.name]) ?? [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (error || !worker) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/office/workers')} className="text-sm text-[var(--color-primary)] hover:underline">
          &larr; Back to Workers
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          Worker not found or failed to load.
        </div>
      </div>
    )
  }

  const emergencyContact = worker.emergency_contact
    ? (typeof worker.emergency_contact === 'string'
        ? JSON.parse(worker.emergency_contact)
        : worker.emergency_contact) as { name?: string; phone?: string; relation?: string }
    : null


  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/office/workers')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            {worker.photo_url ? (
              <img src={worker.photo_url} alt={worker.full_name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-[var(--color-primary)] font-bold text-lg">
                {worker.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">{worker.full_name}</h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                {worker.employee_id} - {worker.occupation ?? 'No occupation set'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            worker.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {worker.status}
          </span>
          <button
            onClick={() => setShowDeactivateConfirm(true)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              worker.status === 'active'
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-green-200 text-green-600 hover:bg-green-50'
            }`}
          >
            {worker.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
          <Link
            to={`/office/workers/${worker.id}/edit`}
            className="px-4 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>


      {/* Deactivate/Activate Confirmation Modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              {worker.status === 'active' ? 'Deactivate Worker' : 'Activate Worker'}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              {worker.status === 'active'
                ? `Are you sure you want to deactivate "${worker.full_name}"? They will no longer appear in active worker lists.`
                : `Are you sure you want to reactivate "${worker.full_name}"? They will appear in active worker lists again.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => toggleStatusMutation.mutate()}
                disabled={toggleStatusMutation.isPending}
                className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${
                  worker.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {toggleStatusMutation.isPending
                  ? 'Processing...'
                  : worker.status === 'active'
                    ? 'Deactivate'
                    : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Personal Information */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoField label="Full Name" value={worker.full_name} />
          <InfoField label="Employee ID" value={worker.employee_id} />
          <InfoField label="FIN" value={worker.fin} />
          <InfoField label="Work Permit No." value={worker.work_permit_no} />
          <InfoField label="Passport No." value={worker.passport_no} />
          <InfoField label="Nationality" value={worker.nationality} />
          <InfoField label="Date of Birth" value={worker.dob} />
          <InfoField label="Gender" value={worker.gender} />
          <InfoField label="Phone" value={worker.phone} />
          <InfoField label="Address" value={worker.address} className="md:col-span-2 lg:col-span-3" />
        </div>
      </div>

      {/* Emergency Contact */}
      {emergencyContact && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold text-[var(--color-text)] mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoField label="Name" value={emergencyContact.name} />
            <InfoField label="Phone" value={emergencyContact.phone} />
            <InfoField label="Relation" value={emergencyContact.relation} />
          </div>
        </div>
      )}


      {/* Employment Details */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Employment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoField label="Occupation" value={worker.occupation} />
          <InfoField label="Join Date" value={worker.join_date} />
          <InfoField label="Current Site" value={site?.name} />
          <InfoField label="Supervisor" value={supervisor?.full_name ?? supervisor?.email} />
          <InfoField label="Status" value={worker.status} />
        </div>
      </div>

      {/* Salary & Compensation */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Salary & Compensation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoField label="Salary Type" value={worker.salary_type} />
          <InfoField label="Basic Salary" value={worker.basic_salary != null ? `$${worker.basic_salary.toFixed(2)}` : null} />
          <InfoField label="Daily Rate" value={worker.daily_rate != null ? `$${worker.daily_rate.toFixed(2)}` : null} />
          <InfoField label="Hourly Rate" value={worker.hourly_rate != null ? `$${worker.hourly_rate.toFixed(2)}` : null} />
          <InfoField label="OT Rate" value={worker.ot_rate != null ? `$${worker.ot_rate.toFixed(2)}` : null} />
          <InfoField label="Allowance" value={worker.allowance != null ? `$${worker.allowance.toFixed(2)}` : null} />
          <InfoField label="Transport" value={worker.transport != null ? `$${worker.transport.toFixed(2)}` : null} />
        </div>
      </div>


      {/* Documents */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Documents</h3>
        {!documents || documents.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No documents uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Type</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Document No.</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Expiry Date</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        DOCUMENT_TYPE_COLORS[doc.type] ?? 'bg-gray-100 text-gray-800'
                      }`}>
                        {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-text)]">{doc.document_number ?? '-'}</td>
                    <td className="px-4 py-2 text-[var(--color-text-muted)]">{doc.expiry_date ?? '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === 'active' ? 'bg-green-100 text-green-800'
                          : doc.status === 'expiring_soon' ? 'bg-amber-100 text-amber-800'
                          : doc.status === 'expired' ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {doc.file_url ? (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline text-xs">
                          View
                        </a>
                      ) : (
                        <span className="text-[var(--color-text-muted)] text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Assignment History */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Assignment History</h3>
        {!assignments || assignments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No assignment history found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Site</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Start Date</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">End Date</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {assignments.map((assignment) => {
                  const isActive = !assignment.end_date || new Date(assignment.end_date) >= new Date()
                  return (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-[var(--color-text)]">
                        {siteMap.get(assignment.site_id) ?? 'Unknown Site'}
                      </td>
                      <td className="px-4 py-2 text-[var(--color-text-muted)]">{assignment.start_date}</td>
                      <td className="px-4 py-2 text-[var(--color-text-muted)]">{assignment.end_date ?? '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isActive ? 'Active' : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Recent Attendance */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-4">Recent Attendance</h3>
        {!attendanceEntries || attendanceEntries.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No attendance records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Time In</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Time Out</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Normal Hrs</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">OT Hrs</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--color-text-muted)]">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {attendanceEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-[var(--color-text)]">{entry.date}</td>
                    <td className="px-4 py-2 text-[var(--color-text-muted)]">{entry.time_in ?? '-'}</td>
                    <td className="px-4 py-2 text-[var(--color-text-muted)]">{entry.time_out ?? '-'}</td>
                    <td className="px-4 py-2 text-[var(--color-text-muted)]">
                      {entry.normal_hours != null ? `${entry.normal_hours}h` : '-'}
                    </td>
                    <td className="px-4 py-2 text-[var(--color-text-muted)]">
                      {entry.ot_hours != null && entry.ot_hours > 0 ? `${entry.ot_hours}h` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === 'present' || entry.status === 'ot'
                          ? 'bg-green-100 text-green-800'
                          : entry.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : entry.status === 'mc' || entry.status === 'leave'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.approval_status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : entry.approval_status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : entry.approval_status === 'submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.approval_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Remarks */}
      {worker.remarks && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold text-[var(--color-text)] mb-4">Remarks</h3>
          <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap">{worker.remarks}</p>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value, className = '' }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-[var(--color-text)]">{value ?? '-'}</dd>
    </div>
  )
}
