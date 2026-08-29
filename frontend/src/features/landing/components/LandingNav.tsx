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
          <path d="M8 24C8 14 15 8 24 8C24 18 17 24 8 24Z" fill="var(--color-lichen-400)" />
          <path d="M8 24C12 20 17 15 23 10" stroke="var(--color-paper-0)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="font-display text-[19px] font-semibold tracking-tight text-paper-0">
          Canopy
        </span>
      </div>
      <nav className="hidden items-center gap-8 md:flex">
        <a href="#registry" className="text-sm font-medium text-paper-0/65 transition-colors hover:text-paper-0">
          Registry
        </a>
        <a href="#roles" className="text-sm font-medium text-paper-0/65 transition-colors hover:text-paper-0">
          Roles
        </a>
        <a href="#validation" className="text-sm font-medium text-paper-0/65 transition-colors hover:text-paper-0">
          Validation
        </a>
      </nav>
      <Link to={ROUTES.login}>
        <Button variant="primary" size="md" className="bg-lichen-400 text-ink-950 hover:bg-lichen-300">
          Sign in
        </Button>
      </Link>
    </motion.header>
  )
}
