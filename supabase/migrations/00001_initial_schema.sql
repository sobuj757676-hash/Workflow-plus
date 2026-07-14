-- ============================================================================
-- WorkFlow Pro — Initial Database Schema
-- Multi-tenant SaaS for Construction Workforce, Attendance & Payroll
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TENANTS
-- ============================================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'SG',
  currency TEXT NOT NULL DEFAULT 'SGD',
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USERS (extends Supabase auth.users via public profile table)
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'office_staff', 'supervisor', 'worker')),
  email TEXT NOT NULL,
  employee_id TEXT,
  full_name TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_employee_id_tenant ON users(tenant_id, employee_id) WHERE employee_id IS NOT NULL;

-- ============================================================================
-- WORKERS
-- ============================================================================
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  photo_url TEXT,
  fin TEXT,
  work_permit_no TEXT,
  passport_no TEXT,
  nationality TEXT,
  dob DATE,
  gender TEXT,
  phone TEXT,
  address TEXT,
  emergency_contact JSONB,  -- { name, phone, relationship }
  occupation TEXT,
  join_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  salary_type TEXT NOT NULL CHECK (salary_type IN ('monthly', 'daily', 'hourly')),
  basic_salary NUMERIC(12,2),
  daily_rate NUMERIC(10,2),
  hourly_rate NUMERIC(10,2),
  ot_rate NUMERIC(10,2),
  allowance NUMERIC(10,2) DEFAULT 0,
  transport NUMERIC(10,2) DEFAULT 0,
  remarks TEXT,
  current_site_id UUID,
  current_supervisor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_workers_employee_id_tenant ON workers(tenant_id, employee_id);

-- ============================================================================
-- SITES
-- ============================================================================
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  client TEXT,
  address TEXT,
  project TEXT,
  supervisor_id UUID REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Add FK from workers to sites now that sites table exists
ALTER TABLE workers ADD CONSTRAINT fk_workers_current_site FOREIGN KEY (current_site_id) REFERENCES sites(id) ON DELETE SET NULL;
ALTER TABLE workers ADD CONSTRAINT fk_workers_current_supervisor FOREIGN KEY (current_supervisor_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- WORKER ASSIGNMENTS (time-bounded, preserves history)
-- ============================================================================
CREATE TABLE worker_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,  -- NULL = current assignment
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PAYROLL RULES (versioned — configurable per tenant)
-- ============================================================================
CREATE TABLE payroll_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,  -- NULL = current active rule
  normal_hours_per_day NUMERIC(4,2) NOT NULL DEFAULT 8,
  normal_days_per_week INTEGER NOT NULL DEFAULT 6,
  ot_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  rest_day_multiplier NUMERIC(4,2) NOT NULL DEFAULT 2.0,
  public_holiday_multiplier NUMERIC(4,2) NOT NULL DEFAULT 2.0,
  ot_monthly_cap_hours NUMERIC(5,1) NOT NULL DEFAULT 72,
  break_minutes INTEGER NOT NULL DEFAULT 60,
  rounding_rule TEXT DEFAULT 'nearest_15',  -- nearest_15, nearest_30, none
  pay_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (pay_cycle IN ('monthly', 'biweekly', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- HOLIDAY CALENDAR
-- ============================================================================
CREATE TABLE holiday_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'public_holiday' CHECK (type IN ('public_holiday', 'company')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_holiday_tenant_date ON holiday_calendar(tenant_id, date);

-- ============================================================================
-- SIGNATURES
-- ============================================================================
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  signer_user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('worker', 'supervisor', 'worker_consent')),
  image_url TEXT,  -- stored in Supabase Storage
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT,
  device TEXT,
  hash TEXT  -- SHA-256 of the signature image for tamper detection
);

-- ============================================================================
-- ATTENDANCE ENTRIES (the digital work record card)
-- ============================================================================
CREATE TABLE attendance_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES worker_assignments(id),
  site_id UUID REFERENCES sites(id),
  supervisor_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  time_in TIME,
  time_out TIME,
  normal_hours NUMERIC(5,2),
  ot_hours NUMERIC(5,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN (
    'present', 'absent', 'mc', 'leave', 'holiday', 'rest_day', 'half_day', 'ot'
  )),
  remark TEXT,
  worker_signature_id UUID REFERENCES signatures(id),
  supervisor_signature_id UUID REFERENCES signatures(id),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'submitted', 'approved', 'rejected'
  )),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  client_uuid UUID,  -- for offline idempotency
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_attendance_worker_date ON attendance_entries(tenant_id, worker_id, date);
CREATE UNIQUE INDEX idx_attendance_client_uuid ON attendance_entries(client_uuid) WHERE client_uuid IS NOT NULL;

-- ============================================================================
-- OT CONSENTS
-- ============================================================================
CREATE TABLE ot_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  site_id UUID REFERENCES sites(id),
  work_type TEXT NOT NULL CHECK (work_type IN ('ot', 'rest_day', 'public_holiday')),
  date DATE NOT NULL,
  time_from TIME,
  time_to TIME,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'declined')),
  signature_id UUID REFERENCES signatures(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CORRECTION REQUESTS
-- ============================================================================
CREATE TABLE correction_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  attendance_entry_id UUID NOT NULL REFERENCES attendance_entries(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  proposed_changes JSONB NOT NULL,  -- { time_in, time_out, ot_hours, remark, ... }
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PAYROLL RUNS
-- ============================================================================
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'finalized')),
  total_cost NUMERIC(14,2),
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PAYROLL ITEMS (per worker per run)
-- ============================================================================
CREATE TABLE payroll_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  working_days NUMERIC(5,1) DEFAULT 0,
  normal_hours NUMERIC(7,2) DEFAULT 0,
  ot_hours NUMERIC(7,2) DEFAULT 0,
  rest_day_hours NUMERIC(7,2) DEFAULT 0,
  ph_hours NUMERIC(7,2) DEFAULT 0,
  normal_pay NUMERIC(12,2) DEFAULT 0,
  ot_pay NUMERIC(12,2) DEFAULT 0,
  rest_day_pay NUMERIC(12,2) DEFAULT 0,
  ph_pay NUMERIC(12,2) DEFAULT 0,
  gross_pay NUMERIC(12,2) DEFAULT 0,
  allowance NUMERIC(10,2) DEFAULT 0,
  transport NUMERIC(10,2) DEFAULT 0,
  bonus NUMERIC(10,2) DEFAULT 0,
  advance NUMERIC(10,2) DEFAULT 0,
  deductions JSONB DEFAULT '[]',  -- [{ type, amount, description }]
  net_pay NUMERIC(12,2) DEFAULT 0,
  overrides JSONB DEFAULT '{}',   -- { field: { original, override, reason } }
  computed_snapshot JSONB,         -- full computation details for audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PAYSLIPS
-- ============================================================================
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_item_id UUID NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  pdf_url TEXT,
  verification_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'superseded', 'void')),
  language TEXT NOT NULL DEFAULT 'en',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- WORKER DOCUMENTS
-- ============================================================================
CREATE TABLE worker_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'passport', 'work_permit', 'insurance', 'medical', 'certificate', 'contract', 'other'
  )),
  file_url TEXT NOT NULL,
  number TEXT,  -- document number (WP no, passport no, etc.)
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================================================
-- PPE FORMS & SIGN-OFFS
-- ============================================================================
CREATE TABLE ppe_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  period TEXT NOT NULL,  -- e.g., "Jul 2026"
  items JSONB NOT NULL DEFAULT '[]',  -- [{ item_name, description }]
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ppe_signoffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ppe_form_id UUID NOT NULL REFERENCES ppe_forms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  signature_id UUID REFERENCES signatures(id),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- attendance_submitted, payslip_ready, ot_consent_requested, etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,  -- additional context for navigation
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'push', 'email')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

-- ============================================================================
-- AUDIT LOGS (append-only)
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- create, update, delete, approve, sign, login, etc.
  entity_type TEXT NOT NULL,  -- workers, attendance_entries, payroll_runs, etc.
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip TEXT,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================================================
-- SETTINGS (per-tenant key-value config)
-- ============================================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_settings_tenant_key ON settings(tenant_id, key);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Helper function: get tenant_id from JWT
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', TRUE)::jsonb -> 'app_metadata' ->> 'tenant_id')::UUID,
    NULL
  );
$$ LANGUAGE sql STABLE;

-- Helper function: get role from JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', TRUE)::jsonb -> 'app_metadata' ->> 'role',
    ''
  );
$$ LANGUAGE sql STABLE;

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- === TENANTS ===
-- Super Admin can see all; others see own tenant only
CREATE POLICY "tenants_super_admin" ON tenants
  FOR ALL USING (public.get_user_role() = 'super_admin');

CREATE POLICY "tenants_member_read" ON tenants
  FOR SELECT USING (id = public.get_tenant_id());

-- === USERS ===
CREATE POLICY "users_tenant_isolation" ON users
  FOR ALL USING (
    public.get_user_role() = 'super_admin'
    OR tenant_id = public.get_tenant_id()
  );

-- === WORKERS ===
CREATE POLICY "workers_tenant_isolation" ON workers
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === SITES ===
CREATE POLICY "sites_tenant_isolation" ON sites
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === WORKER ASSIGNMENTS ===
CREATE POLICY "assignments_tenant_isolation" ON worker_assignments
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === PAYROLL RULES ===
CREATE POLICY "payroll_rules_tenant_isolation" ON payroll_rules
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === HOLIDAY CALENDAR ===
CREATE POLICY "holidays_tenant_isolation" ON holiday_calendar
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === SIGNATURES ===
CREATE POLICY "signatures_tenant_isolation" ON signatures
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === ATTENDANCE ENTRIES ===
CREATE POLICY "attendance_tenant_isolation" ON attendance_entries
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === OT CONSENTS ===
CREATE POLICY "ot_consents_tenant_isolation" ON ot_consents
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === CORRECTION REQUESTS ===
CREATE POLICY "corrections_tenant_isolation" ON correction_requests
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === PAYROLL RUNS ===
CREATE POLICY "payroll_runs_tenant_isolation" ON payroll_runs
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === PAYROLL ITEMS ===
CREATE POLICY "payroll_items_tenant_isolation" ON payroll_items
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === PAYSLIPS ===
CREATE POLICY "payslips_tenant_isolation" ON payslips
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === WORKER DOCUMENTS ===
CREATE POLICY "documents_tenant_isolation" ON worker_documents
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === PPE FORMS ===
CREATE POLICY "ppe_forms_tenant_isolation" ON ppe_forms
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === PPE SIGNOFFS ===
CREATE POLICY "ppe_signoffs_tenant_isolation" ON ppe_signoffs
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- === NOTIFICATIONS ===
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- === AUDIT LOGS (read-only for tenant members) ===
CREATE POLICY "audit_logs_read" ON audit_logs
  FOR SELECT USING (
    public.get_user_role() = 'super_admin'
    OR tenant_id = public.get_tenant_id()
  );

-- === SETTINGS ===
CREATE POLICY "settings_tenant_isolation" ON settings
  FOR ALL USING (tenant_id = public.get_tenant_id());

-- ============================================================================
-- TRIGGER: Set custom claims on user creation/update (for JWT role & tenant_id)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users raw_app_meta_data with role and tenant_id from public.users
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object('role', NEW.role)
    || jsonb_build_object('tenant_id', NEW.tenant_id)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_profile_change
  AFTER INSERT OR UPDATE OF role, tenant_id ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_metadata();

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to key tables
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON worker_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payroll_rules_updated_at BEFORE UPDATE ON payroll_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ot_consents_updated_at BEFORE UPDATE ON ot_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payroll_runs_updated_at BEFORE UPDATE ON payroll_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payroll_items_updated_at BEFORE UPDATE ON payroll_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON worker_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
