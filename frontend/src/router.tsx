import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { AdminRoute } from '@/components/common/AdminRoute'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ROUTES } from '@/lib/constants'

/** React.lazy for a module with a named export. */
function lazyPage<T extends ComponentType>(load: () => Promise<Record<string, unknown>>, name: string) {
  return lazy(async () => ({ default: (await load())[name] as T }))
}

const LandingPage = lazyPage(() => import('@/features/landing/pages/LandingPage'), 'LandingPage')
const LoginPage = lazyPage(() => import('@/features/auth/pages/LoginPage'), 'LoginPage')
const CompleteProfilePage = lazyPage(
  () => import('@/features/auth/pages/CompleteProfilePage'),
  'CompleteProfilePage',
)
const DashboardPage = lazyPage(() => import('@/features/dashboard/pages/DashboardPage'), 'DashboardPage')
const SitesPage = lazyPage(() => import('@/features/sites/pages/SitesPage'), 'SitesPage')
const SiteDetailPage = lazyPage(() => import('@/features/sites/pages/SiteDetailPage'), 'SiteDetailPage')
const SpeciesPage = lazyPage(() => import('@/features/species/pages/SpeciesPage'), 'SpeciesPage')
const AddSpeciesPage = lazyPage(() => import('@/features/species/pages/AddSpeciesPage'), 'default')
const SpeciesDetailPage = lazyPage(
  () => import('@/features/species/pages/SpeciesDetailPage'),
  'SpeciesDetailPage',
)
const ProtectedSpeciesPage = lazyPage(
  () => import('@/features/protected-species/pages/ProtectedSpeciesPage'),
  'ProtectedSpeciesPage',
)
const UsersPage = lazyPage(() => import('@/features/users/pages/UsersPage'), 'UsersPage')
const ExportsPage = lazyPage(() => import('@/features/exports/pages/ExportsPage'), 'ExportsPage')
const GraphicsPage = lazyPage(() => import('@/features/graphics/pages/GraphicsPage'), 'GraphicsPage')
const ProfilePage = lazyPage(() => import('@/features/profile/pages/ProfilePage'), 'ProfilePage')
const NotFoundPage = lazyPage(() => import('@/pages/NotFoundPage'), 'NotFoundPage')

function page(Component: ComponentType) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper-0">
          <LoadingSpinner />
        </div>
      }
    >
      <Component />
    </Suspense>
  )
}

export const routes = [
  {
    element: <App />,
    children: [
      // Public pages (the landing page is its own chunk, separate from the app).
      { path: ROUTES.landing, element: page(LandingPage) },
      { path: ROUTES.login, element: page(LoginPage) },

      {
        element: <ProtectedRoute />,
        children: [
          { path: ROUTES.completeProfile, element: page(CompleteProfilePage) },

          {
            element: <AppLayout />,
            children: [
              { path: ROUTES.dashboard, element: <DashboardPage />, handle: { title: 'Dashboard' } },
              { path: ROUTES.sites, element: <SitesPage />, handle: { title: 'Sites' } },
              { path: ROUTES.siteDetail, element: <SiteDetailPage />, handle: { title: 'Site detail' } },
              { path: ROUTES.species, element: <SpeciesPage />, handle: { title: 'Species' } },
              { path: ROUTES.addSpecies, element: <AddSpeciesPage />, handle: { title: 'Log a species' } },
              {
                path: ROUTES.speciesDetail,
                element: <SpeciesDetailPage />,
                handle: { title: 'Species record' },
              },
              {
                path: ROUTES.protectedSpecies,
                element: <ProtectedSpeciesPage />,
                handle: { title: 'Protected species list' },
              },
              { path: ROUTES.exports, element: <ExportsPage />, handle: { title: 'Exports' } },
              { path: ROUTES.graphics, element: <GraphicsPage />, handle: { title: 'Graphics' } },
              { path: ROUTES.profile, element: <ProfilePage />, handle: { title: 'Profile' } },

              {
                element: <AdminRoute />,
                children: [{ path: ROUTES.users, element: <UsersPage />, handle: { title: 'Users' } }],
              },
            ],
          },
        ],
      },

      { path: '*', element: page(NotFoundPage) },
    ],
  },
]

export const router = createBrowserRouter(routes)
