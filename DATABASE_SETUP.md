# Database Setup Guide — WorkFlow Pro (Phone-Friendly)

> **Good news:** Supabase IS Postgres. You're already using Postgres — Supabase just
> adds the API + login + hosting on top, so a phone browser can talk to it safely.
> Raw Postgres (Vercel/Neon) would need a separate backend, so Supabase is the easy path.

This guide is optimized for setting up **entirely from a phone**. You paste **ONE** SQL
file, set **2** environment variables, then just **Sign Up** in the app. No UUID copying.

---

## The whole setup: 3 things

1. Create a Supabase project
2. Paste ONE SQL file (`supabase/setup.sql`)
3. Add 2 environment variables in Vercel

Then open your app → **Sign Up** → done. The first account becomes the admin.

---

## Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign in
2. **New Project**
   - Name: `workflow-pro`
   - Database Password: (choose one, save it)
   - Region: **Southeast Asia (Singapore)**
3. **Create** → wait ~2 minutes

---

## Step 2 — Run the ONE setup file

1. Left sidebar → **SQL Editor** → **New query**
2. Open this file from your repo and copy ALL of it:
   👉 [`supabase/setup.sql`](./supabase/setup.sql)
   (This = schema + demo company + Singapore holidays + payroll rules + auto-signup trigger, all in one)
3. Paste into the SQL Editor → press **Run**

✅ You should see "Success." That's the entire database done.

> 💡 Tip: On GitHub mobile, open `supabase/setup.sql`, tap the "Raw" / copy button to grab the whole file easily.

---

## Step 3 — Turn OFF email confirmation (makes signup instant)

So you can sign up and log in immediately without checking email:

1. Supabase → **Authentication** → **Sign In / Providers** → **Email**
2. Turn **OFF** "Confirm email"
3. Save

(If you skip this, signup still works — you'll just get a confirmation email to click first.)

---

## Step 4 — Get your 2 keys

Supabase → **Settings** (gear, bottom of sidebar) → **API**

| Copy this | Use as this Vercel variable |
|-----------|------------------------------|
| **Project URL** (e.g. `https://abcd.supabase.co`) | `VITE_SUPABASE_URL` |
| **anon public** key (long token) | `VITE_SUPABASE_ANON_KEY` |

> ❌ Never use the `service_role` key in the app — it's secret.

---

## Step 5 — Add the keys to Vercel

1. [vercel.com](https://vercel.com) → your project → **Settings** → **Environment Variables**
2. Add both:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
3. Check **Production**, **Preview**, **Development**
4. **Save**
5. Go to **Deployments** → latest → **⋯** menu → **Redeploy**

---

## Step 6 — Sign up in the app 🎉

1. Open your Vercel URL (e.g. `https://workflow-plus.vercel.app`)
2. Tap **Sign Up**
3. Enter your name, email, password → **Create account**
4. The **first account automatically becomes the Office Staff admin** — no UUID, no extra query.
5. You're in! From the Office panel you can add supervisors, workers, sites, etc.

---

## Adding Supervisors & Workers (after you're in)

Best way: **inside the app** → Office panel → Supervisors / Workers → "Add".

They can then sign up / be created and you assign their role. (New self-signups default to
`worker`; you can change roles from the Office panel or via SQL.)

To change someone's role manually in SQL Editor:
```sql
UPDATE users SET role = 'supervisor' WHERE email = 'person@email.com';
```
Valid roles: `office_staff`, `supervisor`, `worker`, `super_admin`.

---

## Why not "just Postgres" (Vercel Postgres / Neon)?

| | Supabase (what we use) | Raw Postgres |
|---|---|---|
| Database (Postgres) | ✅ | ✅ |
| Auto REST API for the browser | ✅ built-in | ❌ must build a backend |
| Login / Auth | ✅ built-in | ❌ must build it |
| Security (Row-Level Security) | ✅ | manual |
| Works from a phone browser directly | ✅ | ❌ (needs a server in between) |

Supabase gives you Postgres **plus** the API and login for free, so there's no backend to build.

---

## Environment Variables (summary)

| Variable | Where |
|----------|-------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |

Only these two. Nothing else.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page on Vercel | Env vars added? Redeployed after adding? |
| Can't log in after signup | Email confirmation still ON — disable it (Step 3) or click the email link |
| "Invalid credentials" | Wrong email/password, or account not confirmed |
| First user isn't admin | Make sure `setup.sql` ran fully (it creates the auto-signup trigger + demo tenant) |
| Want to reset | In SQL Editor: delete rows from `users` and re-run, or delete the auth user in Authentication |
