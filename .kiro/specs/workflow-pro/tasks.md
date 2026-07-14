# Tasks — WorkFlow Pro

## Overview

Ordered, incremental implementation steps. Each task is small enough to deliver, test, and review
before moving to the next. Tasks reference requirements (R1–R18) and the design document.

Dependencies flow top to bottom. A task may be started when all its "depends on" tasks are done.

---

## Phase 0 — Project Scaffold & Supabase Setup

### Task 0.1 — Initialize React + Vite + TypeScript project
- `npm create vite@latest workflow-pro -- --template react-ts`
- Add Tailwind CSS 4, PostCSS, Autoprefixer
- Add PWA plugin (`vite-plugin-pwa` with Workbox)
- Configure path aliases (`@/`)
- Add ESLint, Prettier
- Verify: `npm run dev` renders hello page; `npm run build` succeeds

### Task 0.2 — Supabase project setup
- Create Supabase project (or local dev via `supabase init` + `supabase start`)
- Configure environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)
- Install `@supabase/supabase-js` in frontend
- Create `src/lib/supabase.ts` client singleton
- Verify: frontend can call `supabase.auth.getSession()` without error

### Task 0.3 — Database schema migration (core tables)
- Create SQL migration: `tenants`, `users` extension (custom claims), `workers`, `sites`,
  `worker_assignments`, `payroll_rules`, `holiday_calendar`, `settings`
- Enable RLS on all tables
- Write RLS policies: tenant isolation (read/write scoped to `auth.jwt() ->> 'tenant_id'`)
- Create trigger/function to inject `tenant_id` + `role` into JWT custom claims on login
- Seed: one test tenant + one Office Staff user
- Verify: from Supabase dashboard or psql, confirmed RLS blocks cross-tenant reads

### Task 0.4 — Database schema migration (attendance & payroll)
- `attendance_entries`, `signatures`, `ot_consents`, `correction_requests`
- `payroll_runs`, `payroll_items`, `payslips`
- RLS policies for all
- Verify: insert + select scoped correctly

### Task 0.5 — Database schema migration (documents, PPE, notifications, audit)
- `worker_documents`, `ppe_forms`, `ppe_signoffs`, `notifications`, `audit_logs`
- RLS policies
- Create `audit_log_trigger` function (generic trigger attached to key tables)
- Verify: updating a worker row auto-inserts an audit_log entry

### Task 0.6 — Supabase Storage buckets
- Create buckets: `worker-photos`, `worker-documents`, `payslip-pdfs`
- Storage policies: read/write only for owning tenant + authorized roles
- Verify: upload + signed-URL retrieval works from test script

---

## Phase 1 — Authentication & Role Routing

### Task 1.1 — Auth pages (login, forgot password, reset)
- Login form: email or employee ID + password
- "Remember me" checkbox (extends session)
- Forgot password → Supabase `resetPasswordForEmail`
- Reset password page (token from email link)
- Error handling: generic "invalid credentials" message (R2.2)
- Verify: can log in as seeded Office Staff user
- Depends on: 0.1, 0.2, 0.3

### Task 1.2 — Role-based routing & layout shell
- After login, read `role` from JWT custom claims
- Redirect to role-specific dashboard route (`/office`, `/supervisor`, `/worker`, `/admin`)
- Create layout shell with sidebar navigation per role
- Protected route wrapper: unauthorized role → redirect
- Verify: Office Staff sees office nav; direct URL to `/admin` by non-super-admin redirects
- Depends on: 1.1

### Task 1.3 — Session management
- Auto-refresh token via Supabase `onAuthStateChange`
- Logout clears session
- Session expiry redirects to login (R2.6)
- Verify: token refresh works; expired session redirects
- Depends on: 1.1

---

## Phase 2 — Office Staff: Worker & Supervisor Management

### Task 2.1 — Worker list page
- Table: name, employee ID, site, supervisor, status, occupation
- Search (debounced text)
- Filters: site, supervisor, status, occupation
- Pagination
- Verify: shows seeded workers filtered correctly
- Depends on: 1.2

### Task 2.2 — Create / Edit Worker form
- All fields from worker profile (R3.1): photo upload, personal info, salary config, documents
- On create: insert `workers` row + auto-create `users` row (role=worker) with generated password
- Duplicate employee ID check (R3.7)
- Verify: create worker → appears in list; login as new worker succeeds
- Depends on: 2.1, 0.6

### Task 2.3 — Worker detail / profile page
- View all worker info
- Edit inline or via form
- Deactivate / activate toggle
- Delete (soft or hard depending on references)
- Verify: edit saves; deactivated worker cannot login
- Depends on: 2.2

### Task 2.4 — Worker export (CSV/Excel)
- Export current filtered list as CSV
- Verify: downloaded file matches displayed data
- Depends on: 2.1

### Task 2.5 — Supervisor management
- List supervisors (users with role=supervisor)
- Create supervisor (similar to worker but role=supervisor)
- Edit, password reset (Supabase admin reset), deactivate
- Verify: create → can login as supervisor
- Depends on: 1.2, 0.3

### Task 2.6 — Site management
- CRUD sites: name, code, client, address, project, supervisor (select), dates, status
- Assign supervisor to site
- List workers assigned to site
- Verify: create site + assign supervisor → supervisor sees site on their panel
- Depends on: 2.5

### Task 2.7 — Worker assignment flow
- UI: select worker → select site → select supervisor → assign
- Creates `worker_assignments` row (starts new, ends previous if transferring)
- Updates `workers.current_site_id` and `current_supervisor_id`
- Verify: assigned worker appears in supervisor's panel; historical assignment preserved
- Depends on: 2.2, 2.6

---

## Phase 3 — Digital Work Record Card (Attendance)

### Task 3.1 — Supervisor: daily attendance view
- Show list of workers assigned to this supervisor today
- Each row: worker name, photo, today's attendance status (or empty)
- "Quick Attendance" action per worker
- Verify: supervisor sees only their assigned workers
- Depends on: 2.7, 1.2

### Task 3.2 — Supervisor: record attendance
- Form: date (default today), time in, time out, remark, status dropdown
- Time-shorthand parser: accepts `8am-8.30pm+2`, `8am 5pm`, `08:00-17:00`
- Auto-calculate normal_hours and ot_hours (using tenant payroll_rules)
- Save → creates `attendance_entries` row with `approval_status = pending`
- Same-day edit allowed; past-day → triggers correction request
- Verify: entry appears with computed hours; shorthand correctly parsed
- Depends on: 3.1, 0.4

### Task 3.3 — Time-shorthand parser (utility)
- Standalone function with tests
- Inputs: raw string, `normal_hours_per_day` (from settings), `break_minutes`
- Outputs: `{ time_in, time_out, normal_hours, ot_hours }` or error
- Handles: `8am-8.30pm+2`, `8am 5pm`, `08:00-17:00+1.5`, `8am-5pm`
- Verify: unit tests cover all documented formats + edge cases
- Depends on: 0.3 (needs payroll_rules for normal_hours_per_day)

### Task 3.4 — Digital Work Record Card view (calendar / monthly)
- Monthly grid: rows = days 1–31, columns = date, time in, time out, OT, status, remark, signatures
- Mimics the yellow paper card layout
- Shows approval badges (pending/approved/rejected)
- Accessible by: Supervisor (for their workers), Worker (own card), Office Staff (any worker)
- Verify: UI matches paper card structure; data correct
- Depends on: 3.2

### Task 3.5 — Signatures (worker + supervisor)
- Signature pad component (canvas-based)
- Worker can sign their entry; Supervisor can sign
- Store signature as image blob in storage, reference in `signatures` table
- Once both signed → entry is locked (R5.8)
- Verify: sign → locked → cannot edit without correction request
- Depends on: 3.2, 0.6

### Task 3.6 — Attendance submission & Office Staff approval
- Supervisor submits day/period attendance → status = `submitted`
- Office Staff sees pending list → approve/reject per entry or bulk
- Approved → `approval_status = approved`, `locked = true`
- Notification sent to Supervisor on approval/rejection
- Verify: full flow from record → submit → approve → locked
- Depends on: 3.2, 3.5

### Task 3.7 — Correction requests
- Supervisor requests correction for past/locked entry
- Office Staff reviews: approve (unlocks for edit, then re-lock) or reject
- Audit log captures correction
- Verify: correction flow works; audit logged
- Depends on: 3.6

---

## Phase 4 — OT & Rest-Day Consent

### Task 4.1 — Supervisor: create OT consent request
- Form: select workers, date(s), time window, work_type (ot/rest_day/public_holiday)
- Saves `ot_consents` rows with status=requested
- Notification sent to workers
- Verify: consent appears in worker's panel
- Depends on: 3.1, 0.4

### Task 4.2 — Worker: respond to OT consent
- Worker sees pending consents
- Approve (sign) or decline
- Signature captured; status updated
- Notification to Supervisor
- Verify: signed consent is tamper-evident; declined shows in Supervisor view
- Depends on: 4.1, 3.5

### Task 4.3 — OT cap warning
- When attendance saved or payroll calculated, if worker's projected monthly OT > `ot_monthly_cap_hours`
- Warn Supervisor + Office Staff
- Verify: exceeding cap triggers warning notification
- Depends on: 3.2, 0.3

---

## Phase 5 — Payroll Engine

### Task 5.1 — Payroll run creation
- Office Staff selects period (month by default) → creates `payroll_runs` row (status=draft)
- System checks: all attendance in period approved? Flag incomplete if not (R7.4)
- Verify: run created; incomplete flagged when pending entries exist
- Depends on: 3.6, 0.4

### Task 5.2 — Payroll calculation Edge Function
- For each worker in the period:
  - Sum normal_hours, ot_hours, rest_day_hours, PH_hours from approved entries
  - Apply rate (monthly/daily/hourly) from worker profile
  - Apply multipliers from active `payroll_rules` version
  - Add allowance, transport, bonus; subtract advance, deductions
  - Produce `payroll_items` row with all computed values + `computed_snapshot`
- Verify: calculation matches manual check for sample workers (daily/hourly/monthly types)
- Depends on: 5.1

### Task 5.3 — Payroll review & override
- Office Staff views computed payroll per worker
- Can override any value (reason required) → stored in `overrides` JSONB + audit log
- Approve payroll run → status = approved
- Verify: override keeps both original + new; audit logged
- Depends on: 5.2

### Task 5.4 — Finalize payroll → trigger payslip generation
- Office Staff finalizes → status = finalized
- Calls payslip generation Edge Function
- Verify: finalize triggers payslip creation
- Depends on: 5.3, 6.1

---

## Phase 6 — Payslip Generation & Delivery

### Task 6.1 — Payslip PDF generation Edge Function
- Template: company logo, employee info, period, salary breakdown, attendance summary, OT, allowances,
  deductions, net pay, QR verification code
- MOM-required itemised fields included
- Generate PDF → upload to `payslip-pdfs` bucket → create `payslips` row
- Render in worker's language preference
- Verify: generated PDF matches expected layout; QR scannable
- Depends on: 5.2, 0.6

### Task 6.2 — Worker: view & download payslips
- Payslip history list (searchable by period)
- View inline (PDF viewer) or download
- Share button (Web Share API → WhatsApp-friendly)
- Verify: worker sees own payslips; share produces correct file
- Depends on: 6.1

### Task 6.3 — Payslip verification (public endpoint)
- Edge Function: receives verification code
- Returns `{ valid, status, employee_name, period, net_pay (masked) }`
- Superseded/void payslips report their status
- No auth required (public verify)
- Verify: QR from generated payslip resolves correctly; voided shows warning
- Depends on: 6.1

---

## Phase 7 — Documents & Permit Expiry

### Task 7.1 — Worker documents CRUD
- Upload documents (passport, WP, insurance, medical, certificates, contracts)
- Store file in `worker-documents` bucket; metadata in `worker_documents` table
- Set expiry date (optional)
- View / download
- Verify: upload + download works; metadata saved
- Depends on: 2.2, 0.6

### Task 7.2 — Expiry alerts
- Scheduled Edge Function (cron) or DB function: check documents expiring within configured window
- Create notification for Office Staff + Worker
- Dashboard card: "Expiring soon" list
- Verify: document expiring in 30 days triggers alert
- Depends on: 7.1, 8.1

---

## Phase 8 — PPE / Safety Sign-Off

### Task 8.1 — Create PPE form
- Office Staff / Supervisor creates form for a site + period + items
- List workers who need to sign
- Verify: form created with correct workers
- Depends on: 2.6

### Task 8.2 — Worker PPE acknowledgment
- Worker sees pending PPE sign-offs
- Sign (signature pad) → `ppe_signoffs` row created
- Office Staff view: who signed / who hasn't
- Verify: signed workers show as acknowledged; unsigned flagged
- Depends on: 8.1, 3.5

---

## Phase 9 — Notifications

### Task 9.1 — In-app notification system
- `notifications` table + Supabase Realtime subscription
- Bell icon with unread count
- Notification list (mark read, click to navigate)
- Trigger notifications from: attendance submit/approve, payslip ready, OT consent, document expiry,
  worker assigned, leave approved, site changed
- Verify: action triggers notification; appears in bell; mark-read works
- Depends on: 1.2, 0.5

### Task 9.2 — Push notifications (Web Push)
- Service worker push handler
- Edge Function: send VAPID push to subscribed users
- User opts in to push from settings
- Verify: push received on mobile/desktop when app is closed
- Depends on: 9.1, 0.1

### Task 9.3 — Email notifications (optional)
- Tenant setting to enable email
- Edge Function sends email via Supabase Auth email provider or external (Resend/SendGrid)
- Verify: email received for enabled tenant
- Depends on: 9.1

---

## Phase 10 — Reports & Export

### Task 10.1 — Report engine
- Attendance report, payroll report, OT report, site report, worker report, supervisor report,
  monthly summary
- Filters: date range, site, worker, supervisor
- Display as tables + summary cards
- Verify: reports show correct aggregated data
- Depends on: 3.6, 5.2

### Task 10.2 — Export to PDF / Excel / CSV
- Export current report view
- PDF: uses server-side rendering (Edge Function)
- Excel: client-side (xlsx library)
- CSV: client-side
- Verify: exported files contain correct filtered data
- Depends on: 10.1

---

## Phase 11 — Audit Logs

### Task 11.1 — Audit log viewer
- Office Staff / Super Admin: searchable, filterable audit log
- Columns: timestamp, user, action, entity, old value, new value, IP, device
- Filters: user, entity type, date range
- Read-only (no delete/edit)
- Verify: actions from earlier tasks appear in log; filters work
- Depends on: 0.5, 1.2

---

## Phase 12 — Dashboards & Charts

### Task 12.1 — Office Staff dashboard
- Cards: total workers, supervisors, sites, today's attendance, today's OT, pending attendance,
  pending payslips, payroll status, monthly salary cost
- Recent activities feed
- Charts: attendance trend (line), payroll cost (bar), worker distribution (pie)
- Verify: numbers match DB state; charts render
- Depends on: 2.1, 3.6, 5.2

### Task 12.2 — Supervisor dashboard
- Cards: today's workers, pending attendance, today's OT, site info
- Quick attendance button
- Verify: data scoped to supervisor's assigned workers/site
- Depends on: 3.1

### Task 12.3 — Worker dashboard
- Cards: today's status, current site, supervisor, salary summary (this month), attendance summary
- Notifications section
- Verify: worker sees own data only
- Depends on: 3.4, 6.2, 9.1

---

## Phase 13 — Settings & Configuration

### Task 13.1 — Company settings page
- Company profile (name, logo, address)
- Working hours (normal_hours_per_day, break, start/end)
- OT rules (multiplier, rest_day_multiplier, PH_multiplier, monthly cap)
- Pay cycle (monthly / custom)
- Holiday calendar (add/edit/delete public holidays)
- Notification preferences (push, email toggle)
- Language default
- Verify: changing OT multiplier affects next payroll calc; holiday added appears in attendance logic
- Depends on: 0.3, 1.2

### Task 13.2 — Payroll rules versioning
- When a payroll rule is changed, old version gets `effective_to = today - 1`; new version
  `effective_from = today`
- Payroll engine uses version active during the payroll period
- Verify: changing rule mid-month → old payroll unaffected, new period uses new rule
- Depends on: 13.1, 5.2

---

## Phase 14 — Localization (i18n)

### Task 14.1 — i18next setup + English bundle
- Configure i18next with lazy loading
- Extract all hardcoded strings to EN namespace
- Language selector in user settings (persisted to `users.locale`)
- Verify: app fully renders in English from resource bundle
- Depends on: 1.2

### Task 14.2 — Bengali, Chinese, Tamil translations
- Translate all strings to BN, ZH, TA
- Verify: switching language updates entire UI; dates/numbers formatted correctly
- Depends on: 14.1

### Task 14.3 — Localized payslips & notifications
- Payslip PDF rendered in worker's locale
- Notification body uses worker's locale
- Verify: BN worker gets BN payslip
- Depends on: 14.2, 6.1, 9.1

---

## Phase 15 — Offline-First PWA

### Task 15.1 — PWA manifest & install
- Web App Manifest: name, icons (multiple sizes), theme color, display: standalone
- Install prompt handling
- Verify: installable on Android Chrome, iOS Safari, Windows Edge
- Depends on: 0.1

### Task 15.2 — Service worker caching strategy
- Precache: app shell, static assets
- Runtime cache: reference data (workers, sites, payroll_rules) → cache-first with background revalidate
- API mutations: network-first with queue fallback
- Verify: app loads fully offline on repeat visit
- Depends on: 15.1

### Task 15.3 — Offline mutation queue (attendance)
- Dexie IndexedDB schema for queued mutations
- When offline: attendance save → queue locally with `client_uuid`
- UI shows "pending sync" badge
- Verify: record attendance offline → appears in local list with sync badge
- Depends on: 3.2, 15.2

### Task 15.4 — Background sync on reconnect
- On `online` event / Background Sync: flush queue to Supabase in order
- Server upserts are idempotent on `client_uuid`
- Conflict detection: if server entry is locked → reject + surface as correction request
- Sync log shows results
- Verify: go offline → record 3 entries → come online → all synced; locked conflict surfaced
- Depends on: 15.3

---

## Phase 16 — Super Admin Panel

### Task 16.1 — Tenant management
- List all tenants (name, status, plan, created)
- Create new tenant (company name, admin email → provisions tenant + first Office Staff user)
- Suspend / activate tenant
- View tenant stats
- Verify: create tenant → new company admin can login; suspend → blocked
- Depends on: 0.3, 1.2

---

## Phase 17 — Final Polish & Deployment

### Task 17.1 — Responsive design pass
- Ensure all pages work on mobile (375px), tablet (768px), desktop (1280px+)
- Touch-friendly buttons for Supervisor attendance input
- Verify: manual QA on multiple viewports
- Depends on: all UI tasks

### Task 17.2 — Performance optimization
- Code splitting per route (lazy load modules)
- Image optimization (worker photos)
- Lighthouse PWA + Performance audit (target: 90+ both)
- Verify: Lighthouse scores
- Depends on: 17.1

### Task 17.3 — E2E happy path test
- Automated or manual: create tenant → create worker → assign → supervisor records attendance →
  OT consent → approve → payroll → payslip → worker views → verify QR
- Verify: full flow completes without error
- Depends on: all prior phases

### Task 17.4 — Deployment
- Frontend: deploy to Vercel/Netlify (or Supabase hosting)
- Supabase project: production mode, backups enabled, custom domain
- Environment variables secured
- DNS + SSL
- Verify: production URL accessible; full flow works
- Depends on: 17.3
