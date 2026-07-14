import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkerRow, WorkerInsert, SalaryType } from '@/types/database'

interface WorkerFormData {
  full_name: string
  employee_id: string
  photo_url: string
  fin: string
  work_permit_no: string
  passport_no: string
  nationality: string
  dob: string
  gender: string
  phone: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
  occupation: string
  join_date: string
  salary_type: SalaryType
  basic_salary: string
  daily_rate: string
  hourly_rate: string
  ot_rate: string
  allowance: string
  transport: string
  remarks: string
}

const INITIAL_FORM: WorkerFormData = {
  full_name: '',
  employee_id: '',
  photo_url: '',
  fin: '',
  work_permit_no: '',
  passport_no: '',
  nationality: '',
  dob: '',
  gender: '',
  phone: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  occupation: '',
  join_date: '',
  salary_type: 'monthly',
  basic_salary: '',
  daily_rate: '',
  hourly_rate: '',
  ot_rate: '',
  allowance: '',
  transport: '',
  remarks: '',
}

export function WorkerFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const [form, setForm] = useState<WorkerFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof WorkerFormData, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch existing worker when editing
  const { data: existingWorker, isLoading: isLoadingWorker } = useQuery({
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
    enabled: isEditing,
  })

  // Populate form when editing
  useEffect(() => {
    if (existingWorker) {
      const ec = existingWorker.emergency_contact
        ? (typeof existingWorker.emergency_contact === 'string'
            ? JSON.parse(existingWorker.emergency_contact)
            : existingWorker.emergency_contact) as { name?: string; phone?: string; relation?: string }
        : { name: '', phone: '', relation: '' }

      setForm({
        full_name: existingWorker.full_name,
        employee_id: existingWorker.employee_id,
        photo_url: existingWorker.photo_url ?? '',
        fin: existingWorker.fin ?? '',
        work_permit_no: existingWorker.work_permit_no ?? '',
        passport_no: existingWorker.passport_no ?? '',
        nationality: existingWorker.nationality ?? '',
        dob: existingWorker.dob ?? '',
        gender: existingWorker.gender ?? '',
        phone: existingWorker.phone ?? '',
        address: existingWorker.address ?? '',
        emergency_contact_name: ec.name ?? '',
        emergency_contact_phone: ec.phone ?? '',
        emergency_contact_relation: ec.relation ?? '',
        occupation: existingWorker.occupation ?? '',
        join_date: existingWorker.join_date ?? '',
        salary_type: existingWorker.salary_type,
        basic_salary: existingWorker.basic_salary?.toString() ?? '',
        daily_rate: existingWorker.daily_rate?.toString() ?? '',
        hourly_rate: existingWorker.hourly_rate?.toString() ?? '',
        ot_rate: existingWorker.ot_rate?.toString() ?? '',
        allowance: existingWorker.allowance?.toString() ?? '',
        transport: existingWorker.transport?.toString() ?? '',
        remarks: existingWorker.remarks ?? '',
      })
    }
  }, [existingWorker])

  // Validation
  function validate(): boolean {
    const newErrors: Partial<Record<keyof WorkerFormData, string>> = {}

    if (!form.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }
    if (!form.employee_id.trim()) {
      newErrors.employee_id = 'Employee ID is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: WorkerInsert) => {
      // Check for duplicate employee ID
      const { data: existing } = await supabase
        .from('workers')
        .select('id')
        .eq('tenant_id', tenantId!)
        .eq('employee_id', data.employee_id)
        .maybeSingle()

      if (existing && (!isEditing || (existing as any).id !== id)) {
        throw new Error('Employee ID already exists')
      }

      if (isEditing) {
        const { error } = await supabase
          .from('workers')
          .update(data as any)
          .eq('id', id!)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('workers')
          .insert(data as any)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      queryClient.invalidateQueries({ queryKey: ['worker', id] })
      navigate('/office/workers')
    },
    onError: (error) => {
      setSubmitError(error.message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) return

    const emergencyContact = form.emergency_contact_name
      ? JSON.stringify({
          name: form.emergency_contact_name,
          phone: form.emergency_contact_phone,
          relation: form.emergency_contact_relation,
        })
      : null

    const workerData: WorkerInsert = {
      tenant_id: tenantId!,
      user_id: '', // Will be linked when user account is created
      full_name: form.full_name.trim(),
      employee_id: form.employee_id.trim(),
      photo_url: form.photo_url || null,
      fin: form.fin || null,
      work_permit_no: form.work_permit_no || null,
      passport_no: form.passport_no || null,
      nationality: form.nationality || null,
      dob: form.dob || null,
      gender: form.gender || null,
      phone: form.phone || null,
      address: form.address || null,
      emergency_contact: emergencyContact,
      occupation: form.occupation || null,
      join_date: form.join_date || null,
      status: 'active',
      salary_type: form.salary_type,
      basic_salary: form.basic_salary ? parseFloat(form.basic_salary) : null,
      daily_rate: form.daily_rate ? parseFloat(form.daily_rate) : null,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      ot_rate: form.ot_rate ? parseFloat(form.ot_rate) : null,
      allowance: form.allowance ? parseFloat(form.allowance) : null,
      transport: form.transport ? parseFloat(form.transport) : null,
      remarks: form.remarks || null,
      current_site_id: existingWorker?.current_site_id ?? null,
      current_supervisor_id: existingWorker?.current_supervisor_id ?? null,
    }

    createMutation.mutate(workerData)
  }

  function handleChange(field: keyof WorkerFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (isEditing && isLoadingWorker) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/office/workers')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {isEditing ? 'Edit Worker' : 'Add New Worker'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {isEditing ? 'Update worker profile information' : 'Fill in the worker details below'}
          </p>
        </div>
      </div>

      {/* Error message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Photo URL</label>
              <input
                type="url"
                value={form.photo_url}
                onChange={(e) => handleChange('photo_url', e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="John Doe"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.full_name ? 'border-red-300' : 'border-[var(--color-border)]'}`}
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.employee_id}
                onChange={(e) => handleChange('employee_id', e.target.value)}
                placeholder="EMP001"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.employee_id ? 'border-red-300' : 'border-[var(--color-border)]'}`}
              />
              {errors.employee_id && <p className="mt-1 text-xs text-red-500">{errors.employee_id}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">FIN</label>
              <input
                type="text"
                value={form.fin}
                onChange={(e) => handleChange('fin', e.target.value)}
                placeholder="S1234567A"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Work Permit No.</label>
              <input
                type="text"
                value={form.work_permit_no}
                onChange={(e) => handleChange('work_permit_no', e.target.value)}
                placeholder="WP12345678"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passport No.</label>
              <input
                type="text"
                value={form.passport_no}
                onChange={(e) => handleChange('passport_no', e.target.value)}
                placeholder="E12345678"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nationality</label>
              <input
                type="text"
                value={form.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
                placeholder="e.g. Bangladeshi"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => handleChange('dob', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+65 1234 5678"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
                placeholder="Block 123, Street Name, #01-01"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={form.emergency_contact_name}
                onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                placeholder="Contact name"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                placeholder="+65 9876 5432"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Relation</label>
              <input
                type="text"
                value={form.emergency_contact_relation}
                onChange={(e) => handleChange('emergency_contact_relation', e.target.value)}
                placeholder="e.g. Spouse, Parent"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Employment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Occupation</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => handleChange('occupation', e.target.value)}
                placeholder="e.g. General Worker, Electrician"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Join Date</label>
              <input
                type="date"
                value={form.join_date}
                onChange={(e) => handleChange('join_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Salary & Compensation */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Salary & Compensation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Salary Type</label>
              <select
                value={form.salary_type}
                onChange={(e) => handleChange('salary_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Basic Salary ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.basic_salary}
                onChange={(e) => handleChange('basic_salary', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Daily Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.daily_rate}
                onChange={(e) => handleChange('daily_rate', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.hourly_rate}
                onChange={(e) => handleChange('hourly_rate', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">OT Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.ot_rate}
                onChange={(e) => handleChange('ot_rate', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Allowance ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.allowance}
                onChange={(e) => handleChange('allowance', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Transport ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.transport}
                onChange={(e) => handleChange('transport', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="font-semibold mb-4">Additional Notes</h3>
          <textarea
            value={form.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            rows={3}
            placeholder="Any additional remarks about this worker..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/office/workers')}
            className="px-6 py-2.5 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          >
            {createMutation.isPending
              ? 'Saving...'
              : isEditing
                ? 'Update Worker'
                : 'Create Worker'}
          </button>
        </div>
      </form>
    </div>
  )
}
