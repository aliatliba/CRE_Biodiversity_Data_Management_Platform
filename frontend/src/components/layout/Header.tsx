import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function Header({ title }: { title: string }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-canopy-900/[0.08] bg-paper-0 px-6">
      <h1 className="font-display text-lg font-bold tracking-tight text-canopy-950">{title}</h1>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-950/60 transition-colors hover:bg-mist-100 hover:text-canopy-900"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
