import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { visibleNavItems } from './navConfig'

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function Sidebar() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="glass fixed inset-y-3 left-3 z-40 hidden w-60 flex-col rounded-2xl md:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[0_8px_20px_-8px_var(--color-glow)]">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M6 26C6 14 14 6 26 6C26 18 18 26 6 26Z" fill="var(--color-on-primary)" />
            <path d="M6 26C10 22 16 16 24 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="font-display text-[16px] font-extrabold tracking-tight text-fg">BioData</span>
      </div>

      <p className="px-6 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Workspace</p>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3" aria-label="Main navigation">
        {visibleNavItems(isAdmin).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200',
                isActive ? 'text-primary' : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  // Slides between items when the route changes.
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-primary-soft ring-1 ring-inset ring-primary/20"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  >
                    <span className="absolute inset-y-2 -left-3 w-0.75 rounded-r-full bg-[image:var(--gradient-primary)] shadow-[0_0_12px_var(--color-glow)]" />
                  </motion.span>
                )}
                <Icon size={18} strokeWidth={2} aria-hidden="true" className="relative" />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to={ROUTES.profile}
        className={({ isActive }) =>
          cn(
            'm-3 flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:bg-surface-muted',
            isActive && 'bg-surface-muted'
          )
        }
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-xs font-bold text-on-primary"
          aria-hidden="true"
        >
          {initials(user?.full_name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-fg">{user?.full_name}</span>
          <span className="block truncate text-xs capitalize text-fg-subtle">{user?.role}</span>
        </span>
      </NavLink>
    </aside>
  )
}
