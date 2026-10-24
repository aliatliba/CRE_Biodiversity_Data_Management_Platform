import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Ellipsis } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { PROFILE_NAV_ITEM, visibleNavItems } from './navConfig'

const itemClass = (isActive: boolean) =>
  cn(
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
    isActive ? 'text-canopy-700' : 'text-ink-950/45',
  )

export function MobileNav() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { pathname } = useLocation()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const items = visibleNavItems(isAdmin)
  const primary = items.filter((item) => item.primaryOnMobile)
  const more = [...items.filter((item) => !item.primaryOnMobile), PROFILE_NAV_ITEM]
  const moreIsActive = more.some((item) => pathname.startsWith(item.to))

  useEffect(() => {
    if (!isMoreOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsMoreOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isMoreOpen])

  return (
    <div ref={containerRef} className="md:hidden">
      {isMoreOpen && (
        <div
          id="mobile-more-menu"
          className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-canopy-900/10 bg-paper-0 p-2 shadow-2xl"
        >
          {more.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-canopy-700 text-paper-0'
                    : 'text-ink-950/75 hover:bg-mist-100',
                )
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-canopy-900/[0.08] bg-paper-0/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
        aria-label="Mobile navigation"
      >
        {primary.map(({ to, label, mobileLabel, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => itemClass(isActive)}>
            <Icon size={19} strokeWidth={2} />
            <span className="truncate">{mobileLabel ?? label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setIsMoreOpen((open) => !open)}
          aria-expanded={isMoreOpen}
          aria-controls="mobile-more-menu"
          className={itemClass(isMoreOpen || moreIsActive)}
        >
          <Ellipsis size={19} strokeWidth={2} />
          <span className="truncate">More</span>
        </button>
      </nav>
    </div>
  )
}
