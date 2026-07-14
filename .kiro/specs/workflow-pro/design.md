# Design — WorkFlow Pro

## Overview

WorkFlow Pro is an offline-first, multi-tenant SaaS PWA for construction workforce attendance
and payroll. The system is a single-page PWA frontend backed by a stateless API and a relational
database. All business data is tenant-scoped. Attendance capture works offline and syncs when
connectivity returns. Payroll and payslips are derived deterministically from approved attendance
plus per-tenant configurable rules.

This document describes the architecture, technology choices, data model, key algorithms (time
parsing, payroll, offline sync), and cross-cutting concerns (security, i18n, PWA). It maps back to
`requirements.md`; requirement IDs are referenced as (R1..R18).

### Design Principles

- **Tenant isolation by default** — every table carries `tenant_id`; every query is filtered by it (R1).
- **Configuration over hard-coding** — working hours, OT multiplier, OT caps, holiday pay, allowances
  are per-tenant settings, versioned so historical payroll stays correct (R7, R18).
- **Offline-first** — the Supervisor's critical actions never require a network round-trip (R15).
- **Tamper-evident** — signed attendance/OT/PPE records are immutable; all changes are audited (R5, R13).
- **Singapore-first, i18n-ready** — SGD + MOM defaults ship first, but currency/locale are data, not code.

---

## Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast SPA, strong typing, mature PWA tooling |
| PWA | Vite PWA plugin (Workbox) + service worker | Installable, asset caching, background sync |
| Styling / UI | Tailwind CSS + headless component set | Responsive, consistent, fast to build |
| State / data | TanStack Query + Zustand | Server-cache + offline mutation queue + local UI state |
| Offline store | IndexedDB (via Dexie) | Queue mutations, cache reference data on-device |
| i18n | i18next | EN / BN / ZH / TA runtime language switching |
| Backend / BaaS | **Supabase** (Postgres + Auth + Storage + Edge Functions + Realtime) | All-in-one; built-in RLS, auth, storage, push — no custom server to maintain |
| Database | PostgreSQL (Supabase-managed) | Relational integrity, RLS for tenant isolation, JSONB for config |
| API | Supabase auto-generated REST (PostgREST) + Edge Functions (Deno/TS) for business logic | Zero boilerplate CRUD; Edge Functions for payroll calc, PDF gen, push |
| Auth | Supabase Auth (email/password, magic link) + custom claims for role/tenant | Built-in JWT, refresh, password reset, session management (R2) |
| Files | Supabase Storage + signed URLs + RLS policies | Worker photos, documents, payslip PDFs (R9, R17) |
| PDF | Edge Function: pdf-lib or @react-pdf/renderer | MOM-compliant payslip layout (R8) |
| QR / verify | QR encodes verification code → public Edge Function | Payslip authenticity (R8b) |
| Push | Web Push (VAPID) via Edge Function + Supabase Realtime for in-app | Notifications on PWA (R11) |
| Realtime | Supabase Realtime (Postgres changes broadcast) | Live dashboard updates, notification badge |

> **Why Supabase fast-track:** Eliminates custom Node.js server, gives us Auth + Storage + RLS +
> Realtime out of the box. Edge Functions handle the business logic that can't be expressed as
> simple CRUD (payroll calculation, PDF generation, push dispatch). Keeps the same PostgreSQL
> schema and RLS-based tenant isolation described below.

---

## System Architecture

```
                         ┌──────────────────────────────────────┐
                         │         PWA (React + TS + Vite)       │
                         │  Role UIs: SuperAdmin / Office /      │
                         │  Supervisor / Worker                  │
                         │                                       │
                         │  Service Worker (Workbox)             │
                         │   • asset cache (fast load)           │
                         │   • Background Sync queue             │
                         │  IndexedDB (Dexie)                    │
                         │   • cached reference data             │
                         │   • pending mutation queue            │
                         └───────────────┬──────────────────────┘
                                         │ HTTPS (JWT from Supabase Auth)
                                         ▼
                 ┌───────────────────────────────────────────────────┐
                 │                   Supabase                        │
                 │                                                   │
                 │  ┌─────────┐  ┌──────────┐  ┌────────────────┐   │
                 │  │  Auth   │  │ Storage  │  │  Realtime      │   │
                 │  │ (users, │  │ (photos, │  │ (live updates) │   │
                 │  │  roles, │  │  docs,   │  └────────────────┘   │
                 │  │  JWT)   │  │  PDFs)   │                       │
                 │  └─────────┘  └──────────┘                       │
                 │                                                   │
                 │  ┌──────────────────────────────────────────────┐ │
                 │  │  PostgreSQL (RLS — tenant_id on every row)   │ │
                 │  │  PostgREST (auto CRUD API)                   │ │
                 │  └──────────────────────────────────────────────┘ │
                 │                                                   │
                 │  ┌──────────────────────────────────────────────┐ │
                 │  │  Edge Functions (Deno/TS)                    │ │
                 │  │  • Payroll calculation engine                │ │
                 │  │  • Payslip PDF generation                   │ │
                 │  │  • Push notification dispatch               │ │
                 │  │  • Time-shorthand parser                    │ │
                 │  │  • Payslip QR verification                  │ │
                 │  │  • Reports export (CSV/Excel/PDF)           │ │
                 │  │  • OT-cap warning check                     │ │
                 │  └──────────────────────────────────────────────┘ │
                 └───────────────────────────────────────────────────┘
```

### Multi-Tenancy Strategy (R1)

- **Shared database, shared schema, `tenant_id` on every row** (pool model). Simplest to operate,
  cost-efficient for many small companies.
- **Supabase RLS is the primary enforcement** — policies ensure rows are only visible/writable when
  `auth.jwt() ->> 'tenant_id' = tenant_id::text`. This means even a malformed frontend call
  cannot cross tenant boundaries.
- Application-level context (from Supabase Auth custom claims: `role`, `tenant_id`) drives UI
  routing and guards.
- Super Admin operates outside a single tenant (claim `role = super_admin`, `tenant_id = null`);
  specific Edge Functions provide cross-tenant admin actions.
- Suspension flips `tenants.status`; login checks reject suspended tenants (R1.4).

---

## Data Model

Every table below (except `tenants` and platform-level `super_admins`) includes:
`tenant_id`, `created_at`, `updated_at`, `created_by`, `updated_by`.

### Core identity & tenancy

- **tenants**: `id`, `name`, `country` (default `SG`), `currency` (default `SGD`), `logo_url`,
  `status` (active/suspended), `plan`.
- **users**: `id`, `tenant_id`, `role` (super_admin | office_staff | supervisor | worker),
  `email`, `employee_id`, `password_hash`, `locale` (en|bn|zh|ta), `status`, `last_login_at`.
  (Super Admin rows may have `tenant_id = null`.)

### Workforce

- **workers**: `id`, `tenant_id`, `user_id` (1:1 login), `full_name`, `employee_id`, `photo_url`,
  `fin`, `work_permit_no`, `passport_no`, `nationality`, `dob`, `gender`, `phone`, `address`,
  `emergency_contact`, `occupation`, `join_date`, `status` (active/inactive), `salary_type`
  (monthly|daily|hourly), `basic_salary`, `daily_rate`, `hourly_rate`, `ot_rate`, `allowance`,
  `transport`, `remarks`, `current_site_id`, `current_supervisor_id`.
- **supervisors**: modeled as `users` with role=supervisor; optional `supervisor_profiles`
  (`user_id`, contact info).
- **sites**: `id`, `tenant_id`, `name`, `code`, `client`, `address`, `project`,
  `supervisor_id`, `start_date`, `end_date`, `status`.
- **worker_assignments**: `id`, `tenant_id`, `worker_id`, `site_id`, `supervisor_id`,
  `start_date`, `end_date` (null = current). Preserves history on transfer (R4.4).

### Attendance & consent

- **attendance_entries**: `id`, `tenant_id`, `worker_id`, `assignment_id`, `site_id`,
  `supervisor_id`, `date`, `time_in`, `time_out`, `normal_hours`, `ot_hours`, `status`
  (present|absent|mc|leave|holiday|rest_day|half_day|ot), `remark`,
  `worker_signature_id`, `supervisor_signature_id`, `approval_status`
  (pending|submitted|approved|rejected), `approved_by`, `approved_at`,
  `locked` (bool), `client_uuid` (for offline idempotency), `synced_at`.
  Unique on (`tenant_id`, `worker_id`, `date`).
- **signatures**: `id`, `tenant_id`, `signer_user_id`, `type` (worker|supervisor|worker_consent),
  `image_blob_ref` or vector data, `signed_at`, `ip`, `device`, `hash`.
- **ot_consents**: `id`, `tenant_id`, `worker_id`, `requested_by`, `site_id`,
  `work_type` (ot|rest_day|public_holiday), `date`, `time_from`, `time_to`,
  `status` (requested|approved|declined), `signature_id`, `responded_at`.
- **correction_requests**: `id`, `tenant_id`, `attendance_entry_id`, `requested_by`,
  `reason`, `proposed_changes` (JSONB), `status` (pending|approved|rejected), `resolved_by`.

### Payroll

- **payroll_rules** (versioned): `id`, `tenant_id`, `effective_from`, `effective_to`,
  `normal_hours_per_day`, `normal_days_per_week`, `ot_multiplier`, `rest_day_multiplier`,
  `public_holiday_multiplier`, `ot_monthly_cap_hours`, `rounding_rule`, `pay_cycle` (monthly|custom).
  Payroll always reads the rule version covering the period (R7.3).
- **holiday_calendar**: `id`, `tenant_id`, `date`, `name`, `type` (public_holiday|company).
- **payroll_runs**: `id`, `tenant_id`, `period_start`, `period_end`, `status`
  (draft|calculated|approved|finalized), `total_cost`, `created_by`, `approved_by`.
- **payroll_items**: `id`, `tenant_id`, `payroll_run_id`, `worker_id`, `working_days`,
  `normal_hours`, `ot_hours`, `gross_pay`, `ot_pay`, `allowance`, `transport`, `bonus`,
  `advance`, `deductions` (JSONB list), `net_pay`, `overrides` (JSONB), `computed_snapshot` (JSONB).
- **payslips**: `id`, `tenant_id`, `payroll_item_id`, `worker_id`, `pdf_url`,
  `verification_code` (unique), `status` (issued|superseded|void), `issued_at`, `language`.

### Documents, PPE, notifications, audit

- **worker_documents**: `id`, `tenant_id`, `worker_id`, `type` (passport|work_permit|insurance|
  medical|certificate|contract|other), `file_url`, `number`, `expiry_date`, `status`.
- **ppe_forms**: `id`, `tenant_id`, `site_id`, `period`, `items` (JSONB), `created_by`.
- **ppe_signoffs**: `id`, `tenant_id`, `ppe_form_id`, `worker_id`, `signature_id`,
  `acknowledged_at`.
- **notifications**: `id`, `tenant_id`, `user_id`, `type`, `title`, `body`, `data` (JSONB),
  `channel` (in_app|push|email), `read_at`, `created_at`.
- **audit_logs** (append-only): `id`, `tenant_id`, `actor_user_id`, `action`, `entity_type`,
  `entity_id`, `old_value` (JSONB), `new_value` (JSONB), `ip`, `device`, `created_at`.
- **settings**: `id`, `tenant_id`, `key`, `value` (JSONB) — company profile, working hours,
  notification prefs, roles/permissions overrides, language defaults.

### Key relationships (text ERD)

```
tenant 1─* users
tenant 1─* workers ; worker 1─1 user
tenant 1─* sites ; site *─1 supervisor(user)
worker *─* site  (via worker_assignments, time-bounded)
worker 1─* attendance_entries *─0..1 signature (worker/supervisor)
worker 1─* ot_consents
payroll_run 1─* payroll_items 1─1 payslip
worker 1─* worker_documents
ppe_form 1─* ppe_signoffs *─1 worker
```

---

## Key Algorithms

### 1. Time-Shorthand Parser (R5.4)

Supervisors write cards like `8am-8.30pm+2` or `8am 5pm`. The parser:

1. Extract **start** and **end** clock times (accepts `8am`, `8.30pm`, `08:30`, `5pm`).
2. Extract optional trailing `+N` as explicit OT hours.
3. Compute `worked = end - start` (minus configured unpaid break if set).
4. If explicit `+N` present → `ot_hours = N`, `normal_hours = min(worked - N, normal_hours_per_day)`.
5. Else → `normal_hours = min(worked, normal_hours_per_day)`,
   `ot_hours = max(worked - normal_hours_per_day, 0)`.
6. Return a structured `{ time_in, time_out, normal_hours, ot_hours }`; ambiguous input is flagged
   for supervisor confirmation rather than guessed silently.

All thresholds (`normal_hours_per_day`, break length) come from the active `payroll_rules` (R18).

### 2. Payroll Calculation (R7)

For each worker over a period, using the `payroll_rules` version in effect:

```
For each approved attendance_entry in period:
    accumulate normal_hours, ot_hours by day-type (normal / rest_day / public_holiday)
    count working_days by status

base_rate:
    monthly  -> derived hourly = basic_salary / (normal_days * normal_hours_per_day)  [rule-defined]
    daily    -> daily_rate
    hourly   -> hourly_rate

normal_pay      = f(base_rate, working_days / normal_hours)
ot_pay          = ot_hours * ot_hourly_rate * ot_multiplier
rest_day_pay    = rest_day_hours * rate * rest_day_multiplier
ph_pay          = ph_hours * rate * public_holiday_multiplier
gross           = normal_pay + ot_pay + rest_day_pay + ph_pay + allowance + transport + bonus
net             = gross - advance - sum(deductions)
```

- All multipliers/caps are configurable (R18). If `ot_hours` projected for the month exceeds
  `ot_monthly_cap_hours`, the run is flagged with a warning (R6.4).
- Pending entries are excluded and mark the run incomplete (R7.4).
- Every computed value is stored in `computed_snapshot`; manual overrides keep both values (R7.5).

### 3. Offline Sync & Conflict Resolution (R15)

- Each offline-created mutation gets a `client_uuid`; the server upsert is **idempotent** on it,
  so retries don't duplicate.
- Reference data (assigned workers, sites, rules) is cached in IndexedDB so the Supervisor UI works
  fully offline.
- Queued mutations flush via Background Sync (or on `online` event) in creation order.
- **Conflict rule:** attendance is keyed by (`worker_id`, `date`).
  - If server copy is **unsigned/unapproved** → last-write-wins by `updated_at`, surfaced in a sync log.
  - If server copy is **signed/approved/locked** → offline change is **rejected** and raised to the
    Supervisor as a correction request (never silently overwritten) (R15.4, R5.8).

### 4. Payslip Verification (R8b)

- `verification_code` maps to a signed token embedded in the QR.
- Public endpoint returns `{ valid, status, employee_name, period, net_pay_masked }` only; superseded
  or void payslips report their state. No cross-tenant or unrelated data is exposed.

---

## Frontend Structure

```
src/
  app/            # routing, providers, role-based route guards
  auth/           # login, forgot/reset, session, remember-me
  i18n/           # en, bn, zh, ta resource bundles
  offline/        # Dexie schema, mutation queue, sync engine
  shared/         # UI kit, forms, tables, charts, signature pad
  modules/
    dashboard/    # role-specific dashboards (R14)
    workers/      # CRUD, profile, search/filter/export
    sites/        # sites + assignments
    supervisors/
    attendance/   # digital work record card, quick attendance
    ot-consent/   # request + worker sign flow
    payroll/      # runs, review, override
    payslip/      # view, PDF, share, history, verify
    documents/    # upload, expiry status
    ppe/          # forms + sign-off
    notifications/
    reports/      # filters + export
    audit/
    settings/     # company, rules, hours, holidays, roles, language
    admin/        # Super Admin tenant management
```

Route guards resolve the role from the session and render the correct navigation and permitted
screens (R2.3, R14).

---

## Security Design (R17)

- HTTPS everywhere (Supabase default); HSTS.
- Passwords managed by Supabase Auth (bcrypt); never exposed by any endpoint (R2.7).
- Supabase Auth JWT access token (short-lived) + refresh token; custom claims carry `role` and
  `tenant_id`; "remember me" extends refresh lifetime.
- **Row-Level Security is the primary access-control mechanism** — every table has RLS policies
  checking `tenant_id` and `role` from the JWT.
- File access via short-lived signed URLs from Supabase Storage, scoped to owning tenant via
  Storage policies (R17.4).
- Append-only audit; sensitive reads (payslip, documents) are logged.
- Supabase Point-in-Time-Recovery (PITR) for backups (R17.3).

---

## PWA & Offline Design (R15)

- Web App Manifest (name, icons, theme) → installable on Android/iOS/Windows/macOS.
- Workbox: precache app shell; runtime cache for reference data; Background Sync for the mutation queue.
- Cache-first for static assets → fast repeat loads (R15.5).
- Network-first with fallback for API reads; queued writes when offline.
- Web Push via VAPID for notifications (R11).

---

## Localization (R16)

- i18next with lazy-loaded EN/BN/ZH/TA bundles; user `locale` persisted on the profile.
- Dates, numbers, and currency formatted via `Intl` using tenant currency (SGD default).
- Payslip PDFs and worker notifications rendered in the worker's chosen language where translated,
  falling back to English otherwise.

---

## Testing Strategy

- **Unit**: time-shorthand parser, payroll engine (all salary types, OT cap, rule versioning),
  sync conflict resolver, verification token.
- **Integration**: tenant isolation (cross-tenant access denied), RBAC per endpoint, attendance →
  approval → payroll → payslip flow, offline queue → sync.
- **E2E (happy paths)**: create worker → assign → supervisor records attendance → OT consent →
  approve → payroll → payslip → worker downloads/verifies.
- **PWA checks**: installability, offline attendance capture, sync-on-reconnect.

---

## Assumptions & Decisions

- **Supabase is the backend** — Auth, Storage, Realtime, PostgreSQL, Edge Functions. No custom
  Node.js server. Business logic (payroll calc, PDF, push, reports) lives in Edge Functions.
- Singapore-first: default country `SG`, currency `SGD`, MOM-oriented payslip fields and OT cap
  defaults — all overridable per tenant (R1.5, R18).
- OT/normal-hours/multipliers are **configuration**, not code, and are **versioned** so past payroll
  is reproducible.
- Pool multi-tenancy (shared schema + `tenant_id` + RLS) for cost efficiency; can graduate a large
  tenant to an isolated schema later without changing the domain model.
- Supervisor is represented as a `user` (role=supervisor) rather than a separate identity system,
  keeping auth uniform.
- Supabase custom claims (via trigger or hook on sign-up/login) inject `tenant_id` and `role` into
  the JWT so RLS policies can read them without a join.
- Edge Functions are deployed alongside the Supabase project and invoked via `supabase.functions.invoke()`.
- Supabase client library (`@supabase/supabase-js`) is used in the frontend for auth, DB queries,
  storage, and realtime subscriptions.
