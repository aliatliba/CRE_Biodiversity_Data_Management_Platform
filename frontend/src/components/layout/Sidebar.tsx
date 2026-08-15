import { NavLink } from 'react-router-dom'
import { LayoutGrid, MapPin, Leaf, Users, Download, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid, adminOnly: false },
  { to: '/sites', label: 'Sites', icon: MapPin, adminOnly: false },
  { to: '/species', label: 'Species', icon: Leaf, adminOnly: false },
  { to: '/protected-species', label: 'Protected list', icon: ShieldCheck, adminOnly: false },
  { to: '/exports', label: 'Exports', icon: Download, adminOnly: false },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
]

export function Sidebar() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-canopy-900/[0.08] bg-paper-0 md:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M6 26C6 14 14 6 26 6C26 18 18 26 6 26Z" fill="var(--color-canopy-600)" />
          <path d="M6 26C10 22 16 16 24 8" stroke="var(--color-canopy-900)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="font-display text-[15px] font-extrabold tracking-tight text-canopy-950">Canopy</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-canopy-700 text-paper-0'
                  : 'text-ink-950/65 hover:bg-mist-100 hover:text-canopy-900'
              )
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-canopy-900/[0.08] px-6 py-5">
        <p className="truncate text-sm font-semibold text-canopy-950">{user?.full_name}</p>
        <p className="truncate text-xs capitalize text-ink-950/45">{user?.role}</p>
      </div>
    </aside>
  )
}
