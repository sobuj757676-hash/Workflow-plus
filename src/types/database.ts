/**
 * Supabase Database types — auto-generated or manually maintained.
 * This file will be replaced by `supabase gen types typescript` once schema is deployed.
 * For now it defines the shape expected by the app.
 */

export type UserRole = 'super_admin' | 'office_staff' | 'supervisor' | 'worker'
export type SalaryType = 'monthly' | 'daily' | 'hourly'
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'mc'
  | 'leave'
  | 'holiday'
  | 'rest_day'
  | 'half_day'
  | 'ot'
export type ApprovalStatus = 'pending' | 'submitted' | 'approved' | 'rejected'
export type TenantStatus = 'active' | 'suspended'
export type PayrollRunStatus = 'draft' | 'calculated' | 'approved' | 'finalized'
export type OtConsentStatus = 'requested' | 'approved' | 'declined'
export type OtWorkType = 'ot' | 'rest_day' | 'public_holiday'
export type DocumentType =
  | 'passport'
  | 'work_permit'
  | 'insurance'
  | 'medical'
  | 'certificate'
  | 'contract'
  | 'other'

export type PPEFormStatus = 'open' | 'completed'

export interface PPEItem {
  name: string
  quantity: number
}

export interface PPESignOff {
  worker_id: string
  worker_name: string
  signed: boolean
  signature_id: string | null
  signed_at: string | null
}

export interface PPEFormRow {
  id: string
  tenant_id: string
  site_id: string
  site_name: string
  period: string
  items: PPEItem[]
  sign_offs: PPESignOff[]
  status: PPEFormStatus
  created_by: string
  created_at: string
  updated_at: string
}

export type PPEFormInsert = Omit<PPEFormRow, 'id' | 'created_at' | 'updated_at'>
export type PPEFormUpdate = Partial<PPEFormInsert>

// Row types
export interface TenantRow {
  id: string
  name: string
  country: string
  currency: string
  logo_url: string | null
  status: TenantStatus
  plan: string | null
  created_at: string
  updated_at: string
}

export interface UserRow {
  id: string
  tenant_id: string | null
  role: UserRole
  email: string
  full_name: string | null
  phone: string | null
  employee_id: string | null
  locale: string
  status: string
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface WorkerRow {
  id: string
  tenant_id: string
  user_id: string
  full_name: string
  employee_id: string
  photo_url: string | null
  fin: string | null
  work_permit_no: string | null
  passport_no: string | null
  nationality: string | null
  dob: string | null
  gender: string | null
  phone: string | null
  address: string | null
  emergency_contact: string | null
  occupation: string | null
  join_date: string | null
  status: string
  salary_type: SalaryType
  basic_salary: number | null
  daily_rate: number | null
  hourly_rate: number | null
  ot_rate: number | null
  allowance: number | null
  transport: number | null
  remarks: string | null
  current_site_id: string | null
  current_supervisor_id: string | null
  created_at: string
  updated_at: string
}

export interface SiteRow {
  id: string
  tenant_id: string
  name: string
  code: string | null
  client: string | null
  address: string | null
  project: string | null
  supervisor_id: string | null
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface AttendanceEntryRow {
  id: string
  tenant_id: string
  worker_id: string
  assignment_id: string | null
  site_id: string | null
  supervisor_id: string | null
  date: string
  time_in: string | null
  time_out: string | null
  normal_hours: number | null
  ot_hours: number | null
  status: AttendanceStatus
  remark: string | null
  worker_signature_id: string | null
  supervisor_signature_id: string | null
  approval_status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  locked: boolean
  client_uuid: string | null
  synced_at: string | null
  created_at: string
  updated_at: string
}

export interface PayrollRuleRow {
  id: string
  tenant_id: string
  effective_from: string
  effective_to: string | null
  normal_hours_per_day: number
  normal_days_per_week: number
  ot_multiplier: number
  rest_day_multiplier: number
  public_holiday_multiplier: number
  ot_monthly_cap_hours: number
  rounding_rule: string | null
  pay_cycle: string
  break_minutes: number
  created_at: string
  updated_at: string
}

export interface WorkerAssignmentRow {
  id: string
  tenant_id: string
  worker_id: string
  site_id: string
  supervisor_id: string | null
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface OtConsentRow {
  id: string
  tenant_id: string
  worker_id: string
  supervisor_id: string
  date: string
  time_from: string
  time_to: string
  work_type: OtWorkType
  status: OtConsentStatus
  worker_response_at: string | null
  worker_signature_id: string | null
  created_at: string
  updated_at: string
}

export interface SignatureRow {
  id: string
  tenant_id: string
  user_id: string
  data_url: string
  created_at: string
}

export interface PayrollRunRow {
  id: string
  tenant_id: string
  period_start: string
  period_end: string
  status: PayrollRunStatus
  total_cost: number | null
  created_at: string
  updated_at: string
}

export interface PayrollDeduction {
  type: string
  amount: number
  description: string
}

export interface PayrollOverride {
  field: string
  original_value: number
  new_value: number
  reason: string
}

export interface PayrollItemRow {
  id: string
  payroll_run_id: string
  worker_id: string
  working_days: number
  normal_hours: number
  ot_hours: number
  rest_day_hours: number
  ph_hours: number
  normal_pay: number
  ot_pay: number
  rest_day_pay: number
  ph_pay: number
  gross_pay: number
  allowance: number
  transport: number
  bonus: number
  advance: number
  deductions: PayrollDeduction[]
  overrides: PayrollOverride[]
  computed_snapshot: Record<string, unknown> | null
  net_pay: number
  created_at: string
  updated_at: string
}

export type PayslipStatus = 'issued' | 'superseded' | 'void'

export interface PayslipRow {
  id: string
  payroll_item_id: string
  worker_id: string
  pdf_url: string | null
  verification_code: string
  status: PayslipStatus
  language: string
  issued_at: string
  created_at: string
  updated_at: string
}

export type DocumentStatus = 'active' | 'expiring_soon' | 'expired'

export interface DocumentRow {
  id: string
  tenant_id: string
  worker_id: string
  type: DocumentType
  document_number: string | null
  expiry_date: string | null
  file_url: string | null
  file_name: string | null
  notes: string | null
  status: DocumentStatus
  created_at: string
  updated_at: string
}

export type DocumentInsert = Omit<DocumentRow, 'id' | 'created_at' | 'updated_at' | 'status'>
export type DocumentUpdate = Partial<DocumentInsert>

export type PayrollRunInsert = Omit<PayrollRunRow, 'id' | 'created_at' | 'updated_at'>
export type PayrollRunUpdate = Partial<PayrollRunInsert>

export type PayrollItemInsert = Omit<PayrollItemRow, 'id' | 'created_at' | 'updated_at'>
export type PayrollItemUpdate = Partial<PayrollItemInsert>

export type PayslipInsert = Omit<PayslipRow, 'id' | 'created_at' | 'updated_at'>
export type PayslipUpdate = Partial<PayslipInsert>

// Insert/Update types
export type TenantInsert = Omit<TenantRow, 'id' | 'created_at' | 'updated_at'>
export type TenantUpdate = Partial<TenantInsert>

export type UserInsert = Omit<UserRow, 'id' | 'created_at' | 'updated_at'>
export type UserUpdate = Partial<UserInsert>

export type WorkerInsert = Omit<WorkerRow, 'id' | 'created_at' | 'updated_at'>
export type WorkerUpdate = Partial<WorkerInsert>

export type SiteInsert = Omit<SiteRow, 'id' | 'created_at' | 'updated_at'>
export type SiteUpdate = Partial<SiteInsert>

export type AttendanceEntryInsert = Omit<AttendanceEntryRow, 'id' | 'created_at' | 'updated_at'>
export type AttendanceEntryUpdate = Partial<AttendanceEntryInsert>

export type PayrollRuleInsert = Omit<PayrollRuleRow, 'id' | 'created_at' | 'updated_at'>
export type PayrollRuleUpdate = Partial<PayrollRuleInsert>

export type WorkerAssignmentInsert = Omit<WorkerAssignmentRow, 'id' | 'created_at' | 'updated_at'>
export type WorkerAssignmentUpdate = Partial<WorkerAssignmentInsert>

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: TenantRow
        Insert: TenantInsert
        Update: TenantUpdate
      }
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
      }
      workers: {
        Row: WorkerRow
        Insert: WorkerInsert
        Update: WorkerUpdate
      }
      sites: {
        Row: SiteRow
        Insert: SiteInsert
        Update: SiteUpdate
      }
      attendance_entries: {
        Row: AttendanceEntryRow
        Insert: AttendanceEntryInsert
        Update: AttendanceEntryUpdate
      }
      payroll_rules: {
        Row: PayrollRuleRow
        Insert: PayrollRuleInsert
        Update: PayrollRuleUpdate
      }
      worker_assignments: {
        Row: WorkerAssignmentRow
        Insert: WorkerAssignmentInsert
        Update: WorkerAssignmentUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
