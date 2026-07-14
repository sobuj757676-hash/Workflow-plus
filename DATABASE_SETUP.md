# Database Setup Guide — WorkFlow Pro

## Quick Overview

তোমার ২টা SQL ফাইল run করতে হবে Supabase SQL Editor-এ:

1. `supabase/migrations/00001_initial_schema.sql` — Database structure (tables + RLS)
2. `supabase/seed.sql` — Initial data (company, sites, holidays, payroll rules)

---

## Step-by-Step Setup

### Step 1: Supabase Project তৈরি

1. Go to [https://supabase.com](https://supabase.com) → Sign Up / Login
2. Click **"New Project"**
3. Fill in:
   - **Project Name:** `workflow-pro`
   - **Database Password:** (মনে রাখো, secure রাখো)
   - **Region:** Southeast Asia (Singapore)
4. Click **"Create new project"** → Wait 1-2 minutes

---

### Step 2: Database Schema তৈরি (SQL Editor)

1. Supabase Dashboard → Left sidebar → **"SQL Editor"** (code icon)
2. Click **"New query"** (top left)
3. তোমার repo থেকে এই file open করো:
   👉 `supabase/migrations/00001_initial_schema.sql`
4. **সম্পূর্ণ SQL কপি করো** (Ctrl+A → Ctrl+C)
5. SQL Editor-এ **paste করো** (Ctrl+V)
6. নিচে **"Run"** button চাপো (অথবা Ctrl+Enter)

✅ সফল হলে: "Success. No rows returned" দেখাবে

> ⚠️ যদি error আসে — সবচেয়ে common সমস্যা:
> - "extension uuid-ossp does not exist" → Supabase-এ এটা already enabled থাকে, retry করো
> - "relation already exists" → মানে আগে run হয়ে গেছে, skip করো

---

### Step 3: Seed Data (Initial Company + Sites + Holidays)

1. আবার **"New query"** click করো
2. `supabase/seed.sql` ফাইলটা কপি-paste করো
3. **"Run"** চাপো

✅ এটা তৈরি করবে:
- Prospect Electrical Engineering Pte Ltd (tenant)
- Tampines N9C10&12 site
- Woodlands Site A
- 2026 Singapore public holidays (11টা)
- Payroll rules (8h/day, 1.5x OT, 2x rest day, 72h cap)
- Company settings

---

### Step 4: Admin User তৈরি

1. Supabase Dashboard → Left sidebar → **"Authentication"**
2. **"Users"** tab → **"Add User"** button
3. Fill:
   - **Email:** তোমার email (e.g., `admin@prospect.sg`)
   - **Password:** তোমার password
   - **Auto Confirm User:** ✅ (toggle ON)
4. Click **"Create User"**
5. User তৈরি হলে → **UUID কপি করো** (User row-এ click করলে দেখা যাবে)

6. SQL Editor-এ যাও → New query → এটা run করো:

```sql
INSERT INTO users (id, tenant_id, role, email, full_name, status)
VALUES (
  'PASTE-YOUR-USER-UUID-HERE',
  '11111111-1111-1111-1111-111111111111',
  'office_staff',
  'admin@prospect.sg',
  'Admin',
  'active'
);
```

> ⚠️ `PASTE-YOUR-USER-UUID-HERE` জায়গায় Step 4 থেকে কপি করা UUID paste করো!

✅ এখন login করতে পারবে!

---

### Step 5: Vercel Environment Variables

Supabase Dashboard → **Settings** (gear icon, left sidebar bottom) → **API**

সেখান থেকে কপি করো:

| Supabase-তে যা লেখা | Vercel-এ Key | কোথায় পাবে |
|---|---|---|
| **Project URL** | `VITE_SUPABASE_URL` | Settings → API → Project URL |
| **anon public** key | `VITE_SUPABASE_ANON_KEY` | Settings → API → Project API keys → `anon` `public` |

Vercel-এ:
1. Project → **Settings** → **Environment Variables**
2. Add:
   - Key: `VITE_SUPABASE_URL` → Value: `https://xxxxx.supabase.co`
   - Key: `VITE_SUPABASE_ANON_KEY` → Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...`
3. Apply to: ✅ Production, ✅ Preview, ✅ Development
4. **Save**
5. Go to **Deployments** → Latest → **"..." menu** → **"Redeploy"**

---

### Step 6: Test Login

1. তোমার Vercel URL-এ যাও (e.g., `https://workflow-plus.vercel.app`)
2. Login:
   - Email: Step 4-এ যে email দিয়েছিলে
   - Password: Step 4-এ যে password দিয়েছিলে
3. ✅ Office Staff Dashboard দেখতে পাবে!

---

## Adding More Users (Supervisors, Workers)

### Supervisor যোগ করতে:

App-এ login → Office Panel → Supervisors → "Add Supervisor"

অথবা manually:

1. Supabase Auth → Add User (email + password)
2. SQL:
```sql
INSERT INTO users (id, tenant_id, role, email, full_name, status)
VALUES ('NEW-USER-UUID', '11111111-1111-1111-1111-111111111111', 'supervisor', 'supervisor@email.com', 'Supervisor Name', 'active');
```

### Worker যোগ করতে:

App-এ login → Office Panel → Workers → "Add Worker"

(App automatically creates auth user + workers row + assignment)

---

## Environment Variables Summary

| Variable | Where to find | Description |
|----------|--------------|-------------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public | Public API key (safe for frontend) |

শুধু এই ২টাই লাগে! ❌ `service_role` key কখনো frontend-এ দিবে না — সেটা secret।

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Login করলে error | Check: user কি Auth-এ আছে? `users` table-এ row আছে? |
| "Invalid credentials" | Email/password check; Supabase Auth → user status = confirmed? |
| Dashboard empty | Seed data run হয়েছে? `tenants` table check করো |
| "RLS policy violation" | `users` table-এ `tenant_id` ঠিক আছে? trigger run হয়েছে? |
| Vercel-এ blank page | Environment variables add করেছো? Redeploy করেছো? |

---

## Database Tables (25+)

| Table | Purpose |
|-------|---------|
| `tenants` | Companies (multi-tenant) |
| `users` | All users (linked to auth.users) |
| `workers` | Worker profiles |
| `sites` | Construction sites |
| `worker_assignments` | Worker ↔ Site ↔ Supervisor |
| `attendance_entries` | Daily work record (the digital card) |
| `signatures` | Digital signatures |
| `ot_consents` | OT/Rest-day consent forms |
| `correction_requests` | Attendance corrections |
| `payroll_rules` | Configurable OT/salary rules |
| `payroll_runs` | Monthly payroll cycles |
| `payroll_items` | Per-worker salary calculation |
| `payslips` | Generated payslips with QR |
| `worker_documents` | Passport, WP, insurance |
| `ppe_forms` | PPE acknowledgment forms |
| `ppe_signoffs` | Worker PPE signatures |
| `notifications` | In-app notifications |
| `audit_logs` | Every action recorded |
| `settings` | Company configuration |
| `holiday_calendar` | Public holidays |
