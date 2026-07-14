import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/database'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to the user's own dashboard if they try accessing unauthorized route
    const dashboardMap: Record<UserRole, string> = {
      super_admin: '/admin',
      office_staff: '/office',
      supervisor: '/supervisor',
      worker: '/worker',
    }
    return <Navigate to={dashboardMap[role] || '/login'} replace />
  }

  return <Outlet />
}
