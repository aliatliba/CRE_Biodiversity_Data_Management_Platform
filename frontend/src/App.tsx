import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { ROUTES } from '@/lib/constants'

/** Public pages are always light, without overwriting the user's saved preference. */
function PublicThemeGuard() {
  const { pathname } = useLocation()
  const { forceTheme } = useTheme()
  const isPublic = pathname === ROUTES.landing || pathname === ROUTES.login

  useEffect(() => {
    forceTheme(isPublic ? 'light' : null)
    return () => forceTheme(null)
  }, [isPublic, forceTheme])

  return null
}

/** Root route element: providers shared by every page. */
function App() {
  return (
    <AuthProvider>
      <PublicThemeGuard />
      <Outlet />
    </AuthProvider>
  )
}

export default App
