# WorkFlow Pro

**Digital Workforce, Attendance & Payroll Management System**

A multi-tenant SaaS Progressive Web App (PWA) that replaces paper work record cards with a complete digital workforce management system for construction companies (Singapore MOM-compliant).

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS 4
- **PWA:** vite-plugin-pwa (Workbox) — installable, offline-first
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime)
- **Multi-tenancy:** Row-Level Security (RLS) with `tenant_id` on every row
- **State:** TanStack Query + Zustand + IndexedDB (Dexie) for offline

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase project credentials

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the migration: `supabase/migrations/00001_initial_schema.sql`
3. Update `.env` with your project URL and anon key

## Project Structure

```
src/
  app/               # Main App entry, router
  components/        # Shared UI components
  contexts/          # React contexts (Auth)
  layouts/           # Dashboard layout shell
  lib/               # Supabase client, utilities
  pages/
    auth/            # Login, forgot password
    office/          # Office Staff pages
    supervisor/      # Supervisor pages
    worker/          # Worker pages
  types/             # TypeScript types (database schema)
  utils/             # Time parser, helpers
supabase/
  migrations/        # SQL schema migrations
```

## Features

- 4 roles: Super Admin, Office Staff, Supervisor, Worker
- Digital Work Record Card (replaces paper attendance card)
- Time shorthand parser (`8am-8.30pm+2`)
- OT & Rest-Day consent workflow
- Automatic payroll calculation (configurable rules)
- MOM-compliant payslip PDF with QR verification
- Worker document management with expiry alerts
- PPE sign-off
- Offline-first (works without internet on construction sites)
- Multi-language (EN, BN, ZH, TA)
- Full audit log

## Spec Documents

- [Requirements](/.kiro/specs/workflow-pro/requirements.md)
- [Design](/.kiro/specs/workflow-pro/design.md)
- [Tasks](/.kiro/specs/workflow-pro/tasks.md)
