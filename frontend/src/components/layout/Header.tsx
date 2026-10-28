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
    <header className="relative z-30 flex h-16 w-full shrink-0 items-center justify-between gap-3 px-4 sm:px-6 md:px-8 md:pt-3">
      <h1 className="min-w-0 truncate font-display text-lg font-bold tracking-tight text-fg sm:text-2xl">
        {title}
      </h1>

      <div className="glass flex shrink-0 items-center gap-1 rounded-xl p-1">
        <ThemeToggle />

        <button
          onClick={handleSignOut}
          className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg sm:px-3"
          aria-label="Sign out"
        >
          <LogOut size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}

