import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'

/**
 * Layout route for admin-only pages. Must sit inside ProtectedRoute (so `user` is
 * loaded); non-admins are redirected before any page hook runs.
 */
export function AdminRoute() {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return <Outlet />
}
