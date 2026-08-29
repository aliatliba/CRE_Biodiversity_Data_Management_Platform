import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper-50">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col md:pr-3 md:pt-3">
        <div className="flex min-h-full flex-1 flex-col overflow-hidden md:rounded-t-2xl md:border md:border-mist-200/80 md:bg-paper-0 md:shadow-[0_24px_60px_-40px_rgba(16,26,20,0.5)]">
          <Header title={title} />
          <main className="flex-1 px-5 pb-24 pt-6 sm:px-8 md:pb-8">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  )
}
