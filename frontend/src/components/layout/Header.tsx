import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'

export function Header({ title }: { title: string }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-16 w-full shrink-0 items-center justify-between gap-3 border-b border-canopy-900/[0.08] bg-paper-0/95 px-4 backdrop-blur-md sm:px-6">
      <h1 className="min-w-0 truncate font-display text-base font-bold tracking-tight text-canopy-950 sm:text-lg">
        {title}
      </h1>

      <div className="flex shrink-0 items-center gap-1.5">
        <ThemeToggle />

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium text-ink-950/60 transition-colors hover:bg-mist-100 hover:text-canopy-900 sm:px-3"
          aria-label="Sign out"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}