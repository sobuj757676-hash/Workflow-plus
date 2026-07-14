import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError('Unable to send reset email. Please try again.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold mb-2">Forgot Password</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            Enter your email and we'll send you a reset link.
          </p>

          {sent ? (
            <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
              Check your email for a password reset link.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-[var(--color-primary)] hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
