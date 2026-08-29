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
    <aside className="hidden w-[15.5rem] shrink-0 flex-col bg-shell text-shell-text md:flex">
      <div className="flex items-center gap-2.5 px-6 py-7">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M8 24C8 14 15 8 24 8C24 18 17 24 8 24Z" fill="var(--color-lichen-400)" />
          <path d="M8 24C12 20 17 15 23 10" stroke="var(--color-shell-text)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="font-display text-[18px] font-semibold tracking-tight">Canopy</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-shell-text/10 text-shell-text'
                  : 'text-shell-text/55 hover:bg-shell-text/[0.06] hover:text-shell-text'
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/profile"
        className={({ isActive }) =>
          cn(
            'mx-3 mb-4 block rounded-xl px-3.5 py-3.5 transition-colors hover:bg-shell-text/[0.06]',
            isActive && 'bg-shell-text/[0.08]'
          )
        }
      >
        <p className="truncate text-sm font-semibold text-shell-text">{user?.full_name}</p>
        <p className="truncate text-[11px] uppercase tracking-[0.12em] text-shell-text/40">{user?.role}</p>
      </NavLink>
    </aside>
  )
}
