import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import { LoadingSpinner } from './LoadingSpinner'

/** Layout route: renders its children only for signed-in users. */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-0">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  if (user?.must_change_password && location.pathname !== ROUTES.completeProfile) {
    return <Navigate to={ROUTES.completeProfile} replace />
  }

  return <Outlet />
}
