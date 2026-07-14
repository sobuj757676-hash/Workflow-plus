# Requirements — WorkFlow Pro

## Introduction

WorkFlow Pro is a multi-tenant SaaS Progressive Web App (PWA) that replaces the paper-based
work-record cards, overtime consent forms, PPE sign-off sheets, and manually-shared payslips
used by construction and electrical contractors (initially targeting Singapore MOM-regulated
companies).

The system lets multiple independent companies (tenants) manage their own workforce. Within
each company, three operational roles — **Office Staff** (company admin), **Supervisor**
(site-level), and **Worker** (personal) — collaborate to record daily attendance, capture
legally-required overtime and rest-day consent, calculate payroll automatically, and deliver
compliant digital payslips. A **Super Admin** role operates the SaaS platform itself.

The application is offline-first (construction sites have poor connectivity), installable from
the browser, multilingual (English, Bengali, Chinese, Tamil), and produces an auditable,
tamper-evident record of all workforce activity.

### Glossary

- **Tenant / Company**: an isolated customer account; all data is scoped to a tenant.
- **WP / FIN / S-Pass**: Singapore work-authorization identifiers for foreign workers.
- **Work Record Card**: the digital equivalent of the paper daily attendance card
  (Date, Time In, Time Out, OT, Remark, Worker Sign, Supervisor Sign).
- **OT**: overtime worked beyond normal contractual hours.
- **Staggered Rest Day**: a rest day that falls on a non-fixed weekday, per MOM rules.
- **Payroll Period**: the month (or custom cycle) over which salary is computed.

---

## Requirements

### Requirement 1 — Multi-Tenant Platform & Isolation

**User Story:** As a SaaS operator, I want each company's data fully isolated, so that one
company can never see or affect another company's workers, sites, or payroll.

#### Acceptance Criteria

1. WHEN a Super Admin onboards a new company THEN the system SHALL create an isolated tenant
   with its own users, workers, sites, and settings.
2. WHEN any user issues a data request THEN the system SHALL scope all reads and writes to that
   user's tenant only.
3. IF a user attempts to access a resource belonging to another tenant THEN the system SHALL
   deny the request and record it in the audit log.
4. WHEN a Super Admin suspends a tenant THEN the system SHALL block all logins for that tenant
   while preserving its data.
5. THE system SHALL support per-tenant configuration for company profile, logo, payroll rules,
   working hours, holiday calendar, and default currency.

### Requirement 2 — Authentication & Role-Based Access

**User Story:** As a user, I want a secure role-based login, so that I only see and do what my
role permits.

#### Acceptance Criteria

1. WHEN a user submits valid credentials (email or Employee ID + password) THEN the system SHALL
   authenticate them and issue a session token.
2. WHEN a user submits invalid credentials THEN the system SHALL reject the login and SHALL NOT
   reveal whether the identifier or the password was wrong.
3. THE system SHALL enforce four roles — Super Admin, Office Staff, Supervisor, Worker — each
   with a defined permission set.
4. WHEN a user requests a password reset THEN the system SHALL send a time-limited reset link/code.
5. WHEN a user selects "Remember me" THEN the system SHALL persist the session across browser
   restarts until expiry or logout.
6. WHEN a session token expires THEN the system SHALL require re-authentication for protected
   actions.
7. THE system SHALL store passwords only as salted hashes.

### Requirement 3 — Worker Management

**User Story:** As Office Staff, I want to create and manage worker profiles, so that every
worker has a complete digital record.

#### Acceptance Criteria

1. WHEN Office Staff creates a worker THEN the system SHALL require full name, employee ID, and
   salary configuration, and SHALL allow photo, FIN/WP/passport, nationality, DOB, gender, phone,
   address, emergency contact, occupation, join date, and allowances.
2. WHEN a worker is created THEN the system SHALL auto-provision a Worker login account and an
   empty digital Work Record Card.
3. THE system SHALL support salary types: monthly, daily, and hourly, each with an OT rate.
4. WHEN Office Staff edits, deactivates, transfers, or deletes a worker THEN the system SHALL
   apply the change and record it in the audit log.
5. WHEN Office Staff searches or filters workers (by name, site, supervisor, status, occupation)
   THEN the system SHALL return matching results.
6. WHEN Office Staff exports workers THEN the system SHALL produce a file (CSV/Excel).
7. IF a required identifier (e.g., employee ID) duplicates an existing one in the tenant THEN
   the system SHALL reject the create and explain the conflict.

### Requirement 4 — Supervisor & Site Management

**User Story:** As Office Staff, I want to manage supervisors and sites and assign workers, so
that each worker's daily attendance flows to the right supervisor.

#### Acceptance Criteria

1. WHEN Office Staff creates a supervisor THEN the system SHALL auto-provision a Supervisor login.
2. WHEN Office Staff creates a site THEN the system SHALL require site name and SHALL allow client,
   address, project, site code, supervisor, start date, end date, and status.
3. WHEN Office Staff assigns a worker to a site and supervisor THEN the system SHALL make that
   worker appear in the assigned Supervisor's panel automatically.
4. WHEN a worker is transferred to a new site/supervisor THEN the system SHALL preserve historical
   attendance under the previous assignment.
5. WHEN Office Staff resets a supervisor's password or deactivates a supervisor THEN the system
   SHALL apply it and log the action.

### Requirement 5 — Digital Work Record Card (Attendance)

**User Story:** As a Supervisor, I want to record daily attendance exactly like the paper card,
so that I can go fully paperless without changing my routine.

#### Acceptance Criteria

1. THE Work Record Card SHALL capture per day: date, time in, time out, OT hours, attendance
   status, remark, worker signature, supervisor signature, and approval status.
2. THE system SHALL support attendance statuses: Present, Absent, MC (medical), Leave, Holiday,
   Rest Day, Half Day, and OT.
3. WHEN a Supervisor enters time in and time out THEN the system SHALL auto-calculate normal
   working hours and OT hours based on the tenant's working-hour rules.
4. WHEN a Supervisor enters a shorthand time (e.g., "8am-8.30pm+2") THEN the system SHALL parse
   it into start, end, and OT values.
5. WHEN a Supervisor saves attendance THEN the system SHALL default its status to "pending"
   until Office Staff approval.
6. WHEN a Supervisor edits an entry on the same calendar day THEN the system SHALL allow it; for
   earlier days the system SHALL require a correction request.
7. WHEN a Supervisor submits attendance to Office Staff THEN the system SHALL notify Office Staff.
8. WHEN a Worker or Supervisor signs an entry THEN the system SHALL capture the signature and lock
   the signed fields against silent modification.

### Requirement 6 — Overtime & Rest-Day Consent

**User Story:** As a Supervisor, I want workers to give consent before working overtime or on a
rest day, so that the company complies with labour law and keeps signed proof.

#### Acceptance Criteria

1. WHEN a Supervisor schedules OT or rest-day work THEN the system SHALL generate a consent
   request listing the worker(s), date(s), and time window (e.g., Sat 1pm–5pm, Sun 8am–5pm).
2. WHEN a Worker receives an OT consent request THEN the system SHALL allow them to approve
   (sign) or decline it.
3. WHEN a Worker signs an OT consent THEN the system SHALL store a timestamped, tamper-evident
   record and make it available as proof.
4. IF a worker's projected monthly OT would exceed the configured legal cap THEN the system SHALL
   warn Office Staff and the Supervisor.
5. THE system SHALL mark rest days (including staggered rest days) per the tenant's rules and flag
   work performed on them.

### Requirement 7 — Payroll Engine

**User Story:** As Office Staff, I want salary to be calculated automatically from approved
attendance, so that I do not compute payroll by hand.

#### Acceptance Criteria

1. WHEN attendance for a payroll period is approved THEN the system SHALL compute working days,
   normal hours, OT hours, gross pay, allowances, transport, bonus, advance, deductions, and net
   pay per worker.
2. THE system SHALL apply the correct rate by salary type (monthly / daily / hourly) plus the
   worker's OT rate.
3. WHEN payroll rules (rates, working hours, holiday pay, OT multiplier) change THEN the system
   SHALL use the rules in effect for the relevant period.
4. IF an attendance entry within the period is still pending THEN the system SHALL exclude it and
   flag the payroll as incomplete until resolved.
5. WHEN Office Staff overrides a computed value THEN the system SHALL keep both original and
   overridden values in the audit log.

### Requirement 8 — Payslip Generation & Delivery

**User Story:** As a Worker, I want a professional, verifiable payslip, so that I can trust and
share proof of my earnings.

#### Acceptance Criteria

1. WHEN payroll is finalized THEN the system SHALL generate a PDF payslip containing company logo,
   employee info, pay period, salary breakdown, attendance summary, OT summary, allowances,
   deductions, and net salary.
2. THE payslip SHALL include the itemised fields required for MOM compliance.
3. WHEN a payslip is generated THEN the system SHALL embed a QR/verification code that resolves to
   a verification view.
4. WHEN a payslip is ready THEN the system SHALL notify the Worker and allow download, print, and
   share (including a share/WhatsApp-friendly link or file).
5. WHEN a Worker searches their payslip history THEN the system SHALL return past payslips.

### Requirement 8b — Payslip Verification

**User Story:** As a payslip recipient, I want to verify a payslip is genuine, so that I can trust
its authenticity.

#### Acceptance Criteria

1. WHEN a verification code is opened THEN the system SHALL show whether the payslip is valid and
   its key details, without exposing unrelated data.
2. IF a payslip has been superseded or voided THEN the verification view SHALL indicate that.

### Requirement 9 — Documents & Permit Expiry

**User Story:** As Office Staff, I want to store worker documents and be warned before they
expire, so that no worker keeps working on an expired permit.

#### Acceptance Criteria

1. THE system SHALL store per-worker documents (passport, work permit, insurance, medical,
   certificates, contracts) as images or PDFs with an optional expiry date.
2. WHEN a document's expiry date is within a configurable warning window THEN the system SHALL
   notify Office Staff and the Worker.
3. WHEN a Worker views their documents THEN the system SHALL show each document and its expiry
   status.

### Requirement 10 — PPE / Safety Sign-Off

**User Story:** As Office Staff, I want workers to acknowledge PPE issuance and safety notices,
so that I keep signed safety records separate from attendance.

#### Acceptance Criteria

1. WHEN Office Staff or a Supervisor issues a PPE/safety sign-off form THEN the system SHALL list
   the workers and items requiring acknowledgment for a given site and period.
2. WHEN a Worker acknowledges (signs) the form THEN the system SHALL store a timestamped record.
3. WHEN Office Staff reviews PPE records THEN the system SHALL show who has and has not signed.

### Requirement 11 — Notifications

**User Story:** As any user, I want timely notifications, so that I act on approvals, payslips,
and expiries without checking manually.

#### Acceptance Criteria

1. THE system SHALL deliver in-app notifications and SHALL support push notifications.
2. WHEN key events occur (attendance submitted, attendance approved, OT consent requested,
   payroll ready, payslip ready, document expiring, worker assigned, leave approved, site changed)
   THEN the system SHALL notify the relevant users.
3. WHEN a user reads a notification THEN the system SHALL mark it read.
4. THE system SHALL allow email notifications as an optional per-tenant setting.

### Requirement 12 — Reports & Export

**User Story:** As Office Staff, I want reports I can export, so that I can share and archive
workforce data.

#### Acceptance Criteria

1. THE system SHALL produce attendance, payroll, OT, site, worker, supervisor, and monthly-summary
   reports.
2. WHEN Office Staff filters a report by date range, site, or worker THEN the system SHALL return
   matching data.
3. WHEN Office Staff exports a report THEN the system SHALL produce PDF, Excel, or CSV.

### Requirement 13 — Audit Logs

**User Story:** As Office Staff / Super Admin, I want every significant action recorded, so that
the system is tamper-evident and accountable.

#### Acceptance Criteria

1. WHEN a create, update, delete, approval, or sign action occurs THEN the system SHALL record who,
   when, action, old value, new value, IP address, and device.
2. THE system SHALL make audit logs read-only (append-only) to users.
3. WHEN Office Staff or Super Admin views audit logs THEN the system SHALL allow filtering by user,
   entity, and date range.

### Requirement 14 — Role Dashboards

**User Story:** As each role, I want a dashboard tailored to me, so that I immediately see what
matters.

#### Acceptance Criteria

1. THE Office Staff dashboard SHALL show totals (workers, supervisors, sites), today's attendance,
   today's OT, pending attendance, pending payslips, payroll status, monthly salary cost, recent
   activities, and charts (attendance trend, payroll cost, worker distribution).
2. THE Supervisor dashboard SHALL show today's workers, pending attendance, today's OT, site
   information, and a quick-attendance action.
3. THE Worker dashboard SHALL show today's status, current site, supervisor, salary summary,
   attendance summary, and notifications.

### Requirement 15 — Offline-First PWA

**User Story:** As a Supervisor on a construction site, I want the app to work without internet,
so that I can record attendance where there is no signal.

#### Acceptance Criteria

1. THE application SHALL be installable from the browser on Android, iOS, Windows, and macOS.
2. WHEN the device is offline THEN the system SHALL allow the Supervisor to record and queue
   attendance, OT consent, and PPE sign-offs locally.
3. WHEN connectivity is restored THEN the system SHALL sync queued changes automatically.
4. IF the same record was changed both offline and on the server THEN the system SHALL detect the
   conflict and resolve it deterministically without silent data loss.
5. THE application SHALL load quickly on repeat visits using cached assets.

### Requirement 16 — Localization

**User Story:** As a worker who does not read English well, I want the app and my payslip in my
language, so that I understand my records.

#### Acceptance Criteria

1. THE system SHALL support English, Bengali, Chinese, and Tamil for UI text.
2. WHEN a user selects a language THEN the system SHALL persist and apply it across sessions.
3. WHERE a payslip or notification is sent to a worker THE system SHALL use the worker's chosen
   language where supported.

### Requirement 17 — Security & Data Protection

**User Story:** As a company, I want my workforce data protected, so that I meet my obligations
and avoid breaches.

#### Acceptance Criteria

1. THE system SHALL serve all traffic over HTTPS.
2. THE system SHALL enforce role-based access on every protected endpoint.
3. THE system SHALL take regular backups of tenant data.
4. THE system SHALL restrict document and payslip file access to authorized users of the owning
   tenant.

### Requirement 18 — Company Settings

**User Story:** As Office Staff, I want to configure how the system computes and behaves for my
company, so that it matches our real rules.

#### Acceptance Criteria

1. THE system SHALL let Office Staff configure company profile, working hours, holiday calendar,
   salary/payroll rules, OT multipliers and caps, roles/permissions, and notification preferences.
2. WHEN a setting changes THEN the system SHALL apply it to future calculations and record the
   change in the audit log.
```
