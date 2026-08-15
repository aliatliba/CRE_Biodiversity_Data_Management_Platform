import { NavLink } from 'react-router-dom'
import { LayoutGrid, MapPin, Leaf, Users, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutGrid, adminOnly: false },
  { to: '/sites', label: 'Sites', icon: MapPin, adminOnly: false },
  { to: '/species', label: 'Species', icon: Leaf, adminOnly: false },
  { to: '/protected-species', label: 'Protected', icon: ShieldCheck, adminOnly: false },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
]

export function MobileNav() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-canopy-900/[0.08] bg-paper-0/95 backdrop-blur-sm md:hidden">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
              isActive ? 'text-canopy-700' : 'text-ink-950/45'
            )
          }
        >
          <Icon size={19} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
