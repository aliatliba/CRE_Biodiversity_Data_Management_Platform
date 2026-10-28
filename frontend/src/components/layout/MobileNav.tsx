import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Ellipsis } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { PROFILE_NAV_ITEM, visibleNavItems } from './navConfig'

const itemClass = (isActive: boolean) =>
  cn(
    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors',
    isActive ? 'text-primary' : 'text-fg-subtle hover:text-fg',
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
          className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-line bg-surface/90 p-1.5 shadow-overlay backdrop-blur-2xl"
        >
          {more.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-soft text-primary'
                    : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                )
              }
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      )}

      <nav
        className="glass fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex rounded-2xl p-1"
        aria-label="Mobile navigation"
      >
        {primary.map(({ to, label, mobileLabel, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="mobile-active"
                    className="absolute inset-0 rounded-xl bg-primary-soft"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={19} strokeWidth={2} aria-hidden="true" className="relative" />
                <span className="relative truncate">{mobileLabel ?? label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setIsMoreOpen((open) => !open)}
          aria-expanded={isMoreOpen}
          aria-controls="mobile-more-menu"
          className={itemClass(isMoreOpen || moreIsActive)}
        >
          <Ellipsis size={19} strokeWidth={2} aria-hidden="true" />
          <span className="truncate">More</span>
        </button>
      </nav>
    </div>
  )
}
