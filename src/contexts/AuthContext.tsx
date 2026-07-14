import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'

interface AuthState {
  session: Session | null
  user: User | null
  role: UserRole | null
  tenantId: string | null
  loading: boolean
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: Error | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    role: null,
    tenantId: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateStateFromSession(session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateStateFromSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  function updateStateFromSession(session: Session | null) {
    if (session?.user) {
      // Extract custom claims from JWT (set by Supabase trigger)
      const metadata = session.user.app_metadata
      setState({
        session,
        user: session.user,
        role: (metadata?.role as UserRole) || null,
        tenantId: (metadata?.tenant_id as string) || null,
        loading: false,
      })
    } else {
      setState({
        session: null,
        user: null,
        role: null,
        tenantId: null,
        loading: false,
      })
    }
  }

  /**
   * Ensures the logged-in user has a public.users profile.
   * Calls the SECURITY DEFINER function setup_new_user(), then refreshes the
   * session so the new role/tenant_id claims land in the JWT.
   * Safe to call every login — the function is idempotent.
   */
  async function ensureProfile(fullName?: string) {
    try {
      const { error } = await supabase.rpc('setup_new_user', {
        p_full_name: fullName ?? null,
      })
      if (error) {
        console.warn('setup_new_user failed:', error.message)
        return
      }
      // Refresh the token so app_metadata (role, tenant_id) is up to date.
      const { data } = await supabase.auth.refreshSession()
      if (data.session) {
        updateStateFromSession(data.session)
      }
    } catch (e) {
      console.warn('ensureProfile error:', e)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: new Error(error.message) }
    }
    await ensureProfile()
    return { error: null }
  }

  async function signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    })
    if (error) {
      return { error: new Error(error.message), needsConfirmation: false }
    }
    // If a session is returned immediately, email confirmation is disabled → user is logged in.
    // If no session but a user exists, confirmation email was sent.
    const needsConfirmation = !data.session && !!data.user
    if (data.session) {
      // Logged in right away → create the profile now.
      await ensureProfile(fullName)
    }
    return { error: null, needsConfirmation }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
