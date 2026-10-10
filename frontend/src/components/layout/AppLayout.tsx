import { Suspense } from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export interface RouteHandle {
  title?: string
}

/**
 * Persistent app shell (sidebar, header, mobile nav). Rendered once as a layout
 * route, so it does not remount when navigating between pages. The header title
 * comes from the deepest matching route's `handle.title`.
 */
export function AppLayout() {
  const matches = useMatches()
  const title =
    [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.title)?.handle as
      | RouteHandle
      | undefined

  return (
    <div className="h-screen w-full overflow-hidden bg-mist-100/30">
      <Sidebar />

      <div className="flex h-full min-w-0 flex-col md:ml-60">
        <Header title={title?.title ?? ''} />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 md:px-8 md:pb-8">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <LoadingSpinner className="h-7 w-7" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
