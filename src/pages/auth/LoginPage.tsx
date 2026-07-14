import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

type Mode = 'signin' | 'signup'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const dashboardMap: Record<UserRole, string> = {
    super_admin: '/admin',
    office_staff: '/office',
    supervisor: '/supervisor',
    worker: '/worker',
  }

  async function redirectByRole() {
    const { data } = await supabase.auth.getSession()
    const role = data.session?.user?.app_metadata?.role as UserRole | undefined
    navigate(dashboardMap[role || 'worker'] || '/worker')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    if (mode === 'signin') {
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        setError('Invalid credentials. Please try again.')
        setLoading(false)
        return
      }
      await redirectByRole()
      setLoading(false)
      return
    }

    // Sign up
    const { error: signUpError, needsConfirmation } = await signUp(email, password, fullName)
    if (signUpError) {
      setError(signUpError.message || 'Could not create account. Please try again.')
      setLoading(false)
      return
    }
    if (needsConfirmation) {
      setInfo('Account created! Please check your email to confirm, then sign in.')
      setMode('signin')
      setLoading(false)
      return
    }
    // Logged in immediately (email confirmation disabled)
    await redirectByRole()
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

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-6">
          {/* Tab toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError('')
                setInfo('')
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'signin'
                  ? 'bg-white text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError('')
                setInfo('')
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}
            {info && (
              <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
                {info}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                {mode === 'signin' ? 'Email or Employee ID' : 'Email'}
              </label>
              <input
                id="email"
                type="email"
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
                placeholder={mode === 'signup' ? 'Create a password (min 6 chars)' : 'Enter your password'}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            </div>

            {mode === 'signin' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-[var(--color-border)]" />
                  <span className="text-[var(--color-text-muted)]">Remember me</span>
                </label>
                <a href="/forgot-password" className="text-sm text-[var(--color-primary)] hover:underline">
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? mode === 'signin'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-xs text-[var(--color-text-muted)] mt-4 text-center">
              The first account created becomes the Office Staff admin.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          WorkFlow Pro &copy; {new Date().getFullYear()} &mdash; All rights reserved.
        </p>
      </div>
    </div>
  )
}
