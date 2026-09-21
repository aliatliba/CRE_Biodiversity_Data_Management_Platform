import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export function AppLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="h-screen w-full overflow-hidden bg-mist-100/30">
      <Sidebar />

      <div className="flex h-full min-w-0 flex-col md:ml-60">
        <Header title={title} />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 md:px-8 md:pb-8">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}

