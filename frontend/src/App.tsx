import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { CompleteProfilePage } from '@/features/auth/pages/CompleteProfilePage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { SitesPage } from '@/features/sites/pages/SitesPage'
import { SpeciesPage } from '@/features/species/pages/SpeciesPage'
import { AddSpeciesPage } from '@/features/species/pages/AddSpeciesPage'
import { SpeciesDetailPage } from '@/features/species/pages/SpeciesDetailPage'
import { EditSpeciesPage } from '@/features/species/pages/EditSpeciesPage'
import { SiteDetailPage } from '@/features/sites/pages/SiteDetailPage'
import { ProtectedSpeciesPage } from '@/features/protected-species/pages/ProtectedSpeciesPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { ExportsPage } from '@/features/exports/pages/ExportsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ROUTES } from '@/lib/constants'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path={ROUTES.landing} element={<LandingPage />} />
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route
          path={ROUTES.completeProfile}
          element={
            <ProtectedRoute>
              <CompleteProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.dashboard}
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.sites}
          element={
            <ProtectedRoute>
              <SitesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.species}
          element={
            <ProtectedRoute>
              <SpeciesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.addSpecies}
          element={
            <ProtectedRoute>
              <AddSpeciesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/species/:id/edit"
          element={
            <ProtectedRoute>
              <EditSpeciesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/species/:id"
          element={
            <ProtectedRoute>
              <SpeciesDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sites/:id"
          element={
            <ProtectedRoute>
              <SiteDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.protectedSpecies}
          element={
            <ProtectedRoute>
              <ProtectedSpeciesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.users}
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.exports}
          element={
            <ProtectedRoute>
              <ExportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
