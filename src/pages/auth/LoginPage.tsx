import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError('Invalid credentials. Please try again.')
      setLoading(false)
      return
    }

    // Get user role and redirect
    const { data } = await supabase.auth.getSession()
    const role = data.session?.user?.app_metadata?.role as UserRole | undefined

    const dashboardMap: Record<UserRole, string> = {
      super_admin: '/admin',
      office_staff: '/office',
      supervisor: '/supervisor',
      worker: '/worker',
    }

    navigate(dashboardMap[role || 'worker'] || '/worker')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-primary)] rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">WF</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">WorkFlow Pro</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Digital Workforce, Attendance & Payroll Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Email or Employee ID
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-[var(--color-border)]" />
                <span className="text-[var(--color-text-muted)]">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-sm text-[var(--color-primary)] hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          WorkFlow Pro &copy; {new Date().getFullYear()} &mdash; All rights reserved.
        </p>
      </div>
    </div>
  )
}
