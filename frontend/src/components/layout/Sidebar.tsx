import { NavLink } from 'react-router-dom'
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-line px-5">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M6 26C6 14 14 6 26 6C26 18 18 26 6 26Z" fill="var(--color-canopy-600)" />
          <path d="M6 26C10 22 16 16 24 8" stroke="var(--color-canopy-900)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="font-display text-[15px] font-extrabold tracking-tight text-fg">BioData</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {visibleNavItems(isAdmin).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary-soft text-primary before:absolute before:inset-y-1.5 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-primary'
                  : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
              )
            }
          >
            <Icon size={17} strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to={ROUTES.profile}
        className={({ isActive }) =>
          cn(
            'mt-auto flex items-center gap-3 border-t border-line px-4 py-3.5 transition-colors hover:bg-surface-muted',
            isActive && 'bg-surface-muted'
          )
        }
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
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
