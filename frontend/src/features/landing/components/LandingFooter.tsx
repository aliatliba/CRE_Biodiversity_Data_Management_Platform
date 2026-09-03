import { Link } from 'react-router-dom'
import { Reveal } from '@/components/common/Reveal'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

export function LandingFooter() {
  return (
    <footer className="bg-grain bg-canopy-950 text-paper-0">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-8">
        <Reveal className="flex flex-col items-start justify-between gap-8 border-b border-paper-0/10 pb-14 md:flex-row md:items-end">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Your credentials are waiting.
            </h2>
            <p className="mt-3 max-w-sm text-[15px] text-paper-0/60">
              Ask your administrator for access, then sign in to set your own
              password and get to work.
            </p>
          </div>
          <Link to={ROUTES.login}>
            <Button
              variant="ghost"
              size="lg"
              className="border border-paper-0/25 bg-transparent text-paper-0 hover:border-paper-0/50 hover:bg-paper-0/10 hover:text-paper-0"
            >
              Sign in to BioData
            </Button>
          </Link>
        </Reveal>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs text-paper-0/40 sm:flex-row">
          <span>© {new Date().getFullYear()} BioData — Field Biodiversity Registry</span>
          <span className="font-mono">Internal research tool · not for public use</span>
        </div>
      </div>
    </footer>
  )
}