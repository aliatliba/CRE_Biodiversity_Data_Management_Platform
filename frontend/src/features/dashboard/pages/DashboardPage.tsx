import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

// Placeholder — the authenticated app shell (sidebar, header, real
// dashboard widgets) is the next build phase.
export function DashboardPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-0 px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-canopy-700">Signed in</p>
      <h1 className="font-display text-2xl font-bold text-canopy-950">
        Welcome, {user?.full_name ?? 'researcher'}
      </h1>
      <p className="max-w-sm text-sm text-ink-950/60">
        The dashboard, sites, species, and export views are next up.
      </p>
      <Button variant="secondary" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  )
}

export default DashboardPage
