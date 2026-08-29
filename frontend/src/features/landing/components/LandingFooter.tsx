import { Link } from 'react-router-dom'
import { Reveal } from '@/components/common/Reveal'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

export function LandingFooter() {
  return (
    <footer className="bg-shell text-shell-text">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-8">
        <Reveal className="flex flex-col items-start justify-between gap-8 border-b border-shell-text/10 pb-14 md:flex-row md:items-end">
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Your credentials are waiting.
            </h2>
            <p className="mt-3 max-w-sm text-[15px] text-shell-text/55">
              Ask your administrator for access, then sign in to set your own
              password and get to work.
            </p>
          </div>
          <Link to={ROUTES.login}>
            <Button
              variant="primary"
              size="lg"
              className="bg-lichen-400 text-ink-950 hover:bg-lichen-300"
            >
              Sign in to Canopy
            </Button>
          </Link>
        </Reveal>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-shell-text/35 sm:flex-row">
          <span>© {new Date().getFullYear()} Canopy — Field Biodiversity Registry</span>
          <span className="font-mono">Internal research tool · not for public use</span>
        </div>
      </div>
    </footer>
  )
}
