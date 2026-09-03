import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

const LINKS = [
  { href: '#landscapes', label: 'Landscapes' },
  { href: '#species', label: 'Species' },
  { href: '#validation', label: 'Validation' },
  { href: '#ecosystem', label: 'Ecosystem' },
]

export function LandingNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-x-0 top-0 z-20 flex w-full items-center justify-between border-b border-paper-0/10 bg-canopy-950/80 px-10 py-4 backdrop-blur-md"
    >
      <div className="flex items-center gap-2.5">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M6 26C6 14 14 6 26 6C26 18 18 26 6 26Z" fill="var(--color-canopy-600)" />
          <path d="M6 26C10 22 16 16 24 8" stroke="var(--color-canopy-900)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="font-display text-[17px] font-extrabold tracking-tight text-paper-0">
          BioData
        </span>
      </div>
      <nav className="hidden items-center gap-8 md:flex">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-paper-0/75 transition-colors hover:text-lichen-300"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center">
        <Link to={ROUTES.login}>
          <Button
            variant="ghost"
            size="md"
            className="border border-paper-0/25 bg-transparent text-paper-0 hover:border-paper-0/50 hover:bg-paper-0/10 hover:text-paper-0"
          >
            Sign in
          </Button>
        </Link>
      </div>
    </motion.header>
  )
}