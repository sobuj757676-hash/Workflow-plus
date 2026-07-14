-- ============================================================================
-- WorkFlow Pro — Seed Data
-- Run this AFTER the migration to set up initial data
-- ============================================================================

-- ============================================================================
-- 1. Create Demo Tenant (Prospect Electrical Engineering Pte Ltd)
-- ============================================================================
INSERT INTO tenants (id, name, country, currency, status, plan)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Prospect Electrical Engineering Pte Ltd',
  'SG',
  'SGD',
  'active',
  'professional'
);

-- ============================================================================
-- 2. Default Payroll Rules for the tenant
-- ============================================================================
INSERT INTO payroll_rules (
  tenant_id, effective_from, normal_hours_per_day, normal_days_per_week,
  ot_multiplier, rest_day_multiplier, public_holiday_multiplier,
  ot_monthly_cap_hours, break_minutes, pay_cycle
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '2026-01-01',
  8,        -- Normal hours per day
  6,        -- Normal days per week (Mon-Sat)
  1.5,      -- OT multiplier (1.5x)
  2.0,      -- Rest day multiplier (2x)
  2.0,      -- Public holiday multiplier (2x)
  72,       -- MOM max OT cap: 72 hours/month
  60,       -- Break: 60 minutes (1 hour lunch)
  'monthly' -- Pay cycle
);

-- ============================================================================
-- 3. Singapore Public Holidays 2026
-- ============================================================================
INSERT INTO holiday_calendar (tenant_id, date, name, type) VALUES
  ('11111111-1111-1111-1111-111111111111', '2026-01-01', 'New Year''s Day', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-01-29', 'Chinese New Year Day 1', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-01-30', 'Chinese New Year Day 2', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-04-03', 'Good Friday', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-04-22', 'Hari Raya Puasa', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-01', 'Labour Day', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-12', 'Vesak Day', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-06-29', 'Hari Raya Haji', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-08-09', 'National Day', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-10-20', 'Deepavali', 'public_holiday'),
  ('11111111-1111-1111-1111-111111111111', '2026-12-25', 'Christmas Day', 'public_holiday');

-- ============================================================================
-- 4. Company Settings
-- ============================================================================
INSERT INTO settings (tenant_id, key, value) VALUES
  ('11111111-1111-1111-1111-111111111111', 'company_profile', '{
    "name": "Prospect Electrical Engineering Pte Ltd",
    "address": "55 Serangoon North Avenue 4, #05-02.59, Singapore 555859",
    "phone": "6255 0028",
    "fax": "6255 0068",
    "registration_no": "201530786J"
  }'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'working_hours', '{
    "start": "08:00",
    "end": "17:00",
    "break_start": "12:00",
    "break_end": "13:00"
  }'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'notification_preferences', '{
    "push_enabled": true,
    "email_enabled": false,
    "attendance_reminder": true,
    "expiry_warning_days": 30
  }'::jsonb);

-- ============================================================================
-- 5. Demo Sites
-- ============================================================================
INSERT INTO sites (id, tenant_id, name, code, client, address, project, status, start_date)
VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Tampines N9C10&12', 'TAMP-N9C', 'HDB', 'Tampines', 'Electrical Works', 'active', '2026-01-01'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Woodlands Site A', 'WDL-A', 'JTC', 'Woodlands Industrial Park', 'Power Installation', 'active', '2026-03-01');

-- ============================================================================
-- NOTE: Users (auth) must be created through Supabase Auth UI or API.
-- After creating a user in Auth, link them by running:
--
-- INSERT INTO users (id, tenant_id, role, email, full_name, status)
-- VALUES ('AUTH-USER-UUID', '11111111-1111-1111-1111-111111111111', 'office_staff', 'your@email.com', 'Your Name', 'active');
--
-- This trigger will automatically inject role + tenant_id into their JWT.
-- ============================================================================
