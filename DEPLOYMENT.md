# WorkFlow Pro — Vercel Deployment Guide

Complete step-by-step guide to deploy the WorkFlow Pro PWA on Vercel.

---

## Prerequisites

Before deploying, ensure you have:

1. **A GitHub account** with the repository pushed (already done: `sobuj757676-hash/Workflow-plus`)
2. **A Vercel account** — sign up free at [vercel.com](https://vercel.com)
3. **A Supabase project** — sign up free at [supabase.com](https://supabase.com)

---

## Step 1: Set Up Supabase (Backend)

### 1.1 Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **"New project"**
3. Choose your organization
4. Fill in:
   - **Project name:** `workflow-pro`
   - **Database Password:** (generate a strong password — save it!)
   - **Region:** Choose closest to your users (e.g., `Southeast Asia (Singapore)`)
5. Click **"Create new project"** and wait 2-3 minutes

### 1.2 Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste the contents of `supabase/setup.sql` (this is the combined migration + seed + functions)
4. Click **"Run"** — you should see "Success"
5. Run a second query with `supabase/migrations/00003_production_user_management.sql`
6. Run a third query with `supabase/migrations/00004_audit_trigger_and_notifications.sql`

### 1.3 Get Your Credentials

1. Go to **Settings → API** in Supabase Dashboard
2. Copy:
   - **Project URL** (e.g., `https://abcdefghijk.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 1.4 Configure Authentication

1. Go to **Authentication → Settings → General**
2. Set **Site URL** to your Vercel deployment URL (update after first deploy):
   - `https://your-project.vercel.app`
3. Under **Email Auth**, ensure:
   - ✅ Enable Email Signup
   - Optional: Disable "Confirm email" for easier testing
4. Under **URL Configuration → Redirect URLs**, add:
   - `https://your-project.vercel.app/**`
   - `http://localhost:5173/**` (for local dev)

### 1.5 Create Storage Buckets (Optional)

1. Go to **Storage** in Supabase Dashboard
2. Create these buckets:
   - `worker-photos` (public: false)
   - `worker-documents` (public: false)
   - `payslip-pdfs` (public: false)
3. For each bucket, add a storage policy allowing authenticated users from the same tenant to read/write

---

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

#### 2.1 Import Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Connect your GitHub account if not already connected
4. Find and select **`sobuj757676-hash/Workflow-plus`**
5. Click **"Import"**

#### 2.2 Configure Build Settings

Vercel auto-detects Vite. Verify these settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 20.x |

#### 2.3 Add Environment Variables

Click **"Environment Variables"** and add:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...your-anon-key...` | Production, Preview, Development |

> **Important:** Vite environment variables MUST start with `VITE_` to be exposed to the client.

#### 2.4 Deploy

Click **"Deploy"** — Vercel will:
1. Clone the repository
2. Install dependencies (`npm install`)
3. Build the project (`npm run build`)
4. Deploy the `dist/` folder to the CDN

First deploy takes ~60-90 seconds.

---

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to project
cd Workflow-plus

# Login to Vercel
vercel login

# Deploy (first time — sets up project)
vercel

# Follow prompts:
#   ? Set up and deploy? → Yes
#   ? Which scope? → Your team/account
#   ? Link to existing project? → No
#   ? What's your project's name? → workflow-pro
#   ? In which directory is your code located? → ./
#   ? Want to modify settings? → No

# Set environment variables
vercel env add VITE_SUPABASE_URL
# paste: https://your-project.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# paste: your-anon-key

# Deploy to production
vercel --prod
```

---

## Step 3: Post-Deployment Configuration

### 3.1 Update Supabase Site URL

1. Go back to Supabase Dashboard → **Authentication → URL Configuration**
2. Set **Site URL** to: `https://workflow-pro.vercel.app` (your actual Vercel URL)
3. Add to **Redirect URLs**: `https://workflow-pro.vercel.app/**`

### 3.2 Custom Domain (Optional)

1. In Vercel Dashboard → Your project → **Settings → Domains**
2. Add your custom domain: `app.yourcompany.com`
3. Follow DNS instructions (add CNAME record pointing to `cname.vercel-dns.com`)
4. Vercel automatically provisions SSL certificate
5. Update Supabase Site URL and Redirect URLs to include your custom domain

### 3.3 Verify PWA Installation

After deployment:
1. Open your deployment URL in Chrome/Edge
2. You should see an **"Install"** button in the address bar
3. On mobile (Android Chrome): You'll see "Add to Home Screen" prompt
4. On iOS Safari: Share → "Add to Home Screen"

### 3.4 Test the Application

1. Open the deployed URL
2. **Sign up** with an email — the first account automatically becomes Office Staff (admin)
3. Navigate through the dashboard
4. Invite other users via **Team & Roles** page

---

## Step 4: Continuous Deployment

Vercel automatically deploys on every push:

| Event | Deployment |
|-------|------------|
| Push to `main` | Production deployment |
| Push to any other branch | Preview deployment (unique URL) |
| Pull Request opened | Preview deployment + comment with URL |

### Auto-deploy workflow:
```bash
# Make changes locally
git add .
git commit -m "feat: add new feature"
git push origin main
# → Vercel automatically deploys to production in ~60s
```

---

## Step 5: Monitoring & Maintenance

### Vercel Analytics (Optional)

1. Go to **Vercel Dashboard → Analytics**
2. Enable **Web Vitals** for performance monitoring
3. Enable **Speed Insights** for real-user metrics

### Supabase Monitoring

1. **Database → Reports** — monitor query performance
2. **Authentication → Users** — manage user accounts
3. **Settings → Database → Backups** — enable Point-in-Time Recovery (PITR) for production

---

## Environment Variables Reference

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase → Settings → API → anon key |

---

## Troubleshooting

### Build Fails

```bash
# Test build locally first
npm run build

# Common issues:
# - TypeScript errors → run `npx tsc --noEmit` to check
# - Missing env vars → Vercel uses VITE_ prefix for client-side vars
```

### PWA Not Working

- Service worker requires HTTPS (Vercel provides this automatically)
- Check `manifest.webmanifest` is accessible at `https://your-url/manifest.webmanifest`
- Clear browser cache and service worker: DevTools → Application → Service Workers → Unregister

### Supabase Connection Issues

- Verify `VITE_SUPABASE_URL` is the full URL with `https://`
- Verify `VITE_SUPABASE_ANON_KEY` is the **anon** key (not the **service_role** key)
- Check Supabase Dashboard → Authentication → URL Configuration for correct redirect URLs

### SPA Routing (404 on refresh)

The `vercel.json` file handles this with rewrites. If you still get 404s on page refresh:
- Verify `vercel.json` is in the project root
- Verify the rewrites configuration is correct

### Offline Not Working

- PWA requires HTTPS (Vercel provides this)
- First visit must be online to cache the app shell
- Check DevTools → Application → Cache Storage for cached resources

---

## Production Checklist

Before going live:

- [ ] Supabase project in production mode (not free tier for production use)
- [ ] Database backups enabled (PITR)
- [ ] Custom domain configured with SSL
- [ ] Email templates customized in Supabase Auth settings
- [ ] Rate limiting configured
- [ ] Supabase RLS policies tested (try accessing other tenant's data)
- [ ] Environment variables set for production
- [ ] PWA installable and working offline
- [ ] All 4 roles tested (Super Admin, Office Staff, Supervisor, Worker)
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (optional: Sentry, LogRocket)

---

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│         Vercel CDN (Global Edge)        │
│  ┌───────────────────────────────────┐  │
│  │  Static Assets (React SPA)        │  │
│  │  • index.html                     │  │
│  │  • JS/CSS chunks (code-split)     │  │
│  │  • Service Worker (sw.js)         │  │
│  │  • PWA manifest                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────┬───────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────┐
│         Supabase Cloud                  │
│  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Auth     │ │ Storage  │ │Realtime│  │
│  │ (JWT)    │ │ (files)  │ │(ws)    │  │
│  └──────────┘ └──────────┘ └────────┘  │
│  ┌──────────────────────────────────┐   │
│  │  PostgreSQL + PostgREST (API)    │   │
│  │  • RLS policies (tenant isolation) │ │
│  │  • Edge Functions (payroll, PDF)  │  │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## Cost Estimate

| Service | Free Tier | Production |
|---------|-----------|------------|
| Vercel | 100GB bandwidth, unlimited deploys | $20/mo (Pro) |
| Supabase | 500MB DB, 1GB storage, 50K auth users | $25/mo (Pro) |
| Custom Domain | - | ~$12/year |
| **Total** | **$0/month** (for development/demo) | **~$45/month** (production) |

---

*Last updated: July 2026*
