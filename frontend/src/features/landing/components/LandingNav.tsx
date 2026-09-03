import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

export function LandingNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8"
    >
      <div className="flex items-center gap-2.5">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M6 26C6 14 14 6 26 6C26 18 18 26 6 26Z" fill="var(--color-canopy-600)" />
          <path d="M6 26C10 22 16 16 24 8" stroke="var(--color-canopy-900)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="font-display text-[17px] font-extrabold tracking-tight text-canopy-950">
          BioData
        </span>
      </div>
      <nav className="hidden items-center gap-8 md:flex">
        <a href="#registry" className="text-sm font-medium text-ink-950/70 transition-colors hover:text-canopy-800">
          Registry
        </a>
        <a href="#roles" className="text-sm font-medium text-ink-950/70 transition-colors hover:text-canopy-800">
          Roles
        </a>
        <a href="#validation" className="text-sm font-medium text-ink-950/70 transition-colors hover:text-canopy-800">
          Validation
        </a>
      </nav>
      <Link to={ROUTES.login}>
        <Button variant="primary" size="md">
          Sign in
        </Button>
      </Link>
    </motion.header>
  )
}
