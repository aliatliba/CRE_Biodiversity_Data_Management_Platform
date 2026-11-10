import { Suspense } from 'react'
import { Outlet, useLocation, useMatches } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AuroraBackground } from '@/components/common/AuroraBackground'
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
  const { pathname } = useLocation()
  const title =
    [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.title)?.handle as
      | RouteHandle
      | undefined

  return (
    <div className="relative h-screen w-full overflow-hidden bg-bg">
      <AuroraBackground />
      <Sidebar />

      <div className="relative flex h-full min-w-0 flex-col md:ml-[16.5rem]">
        <Header title={title?.title ?? ''} />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 md:px-8 md:pb-10">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <LoadingSpinner className="h-7 w-7" />
              </div>
            }
          >
            {/* Each page fades up on navigation (query-string changes don't remount). */}
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </Suspense>
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
