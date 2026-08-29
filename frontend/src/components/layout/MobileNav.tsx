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
    <nav className="fixed inset-x-3 bottom-3 z-30 flex overflow-hidden rounded-2xl border border-mist-200/80 bg-paper-0/90 shadow-[0_16px_40px_-20px_rgba(16,26,20,0.5)] backdrop-blur-md md:hidden">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
              isActive ? 'text-canopy-700' : 'text-ink-950/40'
            )
          }
        >
          <Icon size={18} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
