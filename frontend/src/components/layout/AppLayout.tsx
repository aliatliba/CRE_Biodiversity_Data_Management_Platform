import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-mist-100/30">
      <Sidebar />

      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <Header title={title} />

        <main className="flex-1 px-5 pb-24 pt-6 sm:px-8 md:pb-8">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  )
}