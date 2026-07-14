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

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
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
