import {
  BarChart3,
  Download,
  LayoutGrid,
  Leaf,
  MapPin,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'

export interface NavItem {
  to: string
  /** Label in the desktop sidebar. */
  label: string
  /** Shorter label for the mobile bar (defaults to `label`). */
  mobileLabel?: string
  icon: LucideIcon
  adminOnly?: boolean
  /** Shown directly in the mobile bottom bar; everything else goes under "More". */
  primaryOnMobile?: boolean
}

/** Single navigation config shared by Sidebar and MobileNav. */
export const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Dashboard', mobileLabel: 'Home', icon: LayoutGrid, primaryOnMobile: true },
  { to: ROUTES.sites, label: 'Sites', icon: MapPin, primaryOnMobile: true },
  { to: ROUTES.species, label: 'Species', icon: Leaf, primaryOnMobile: true },
  {
    to: ROUTES.protectedSpecies,
    label: 'Protected list',
    mobileLabel: 'Protected',
    icon: ShieldCheck,
    primaryOnMobile: true,
  },
  { to: ROUTES.exports, label: 'Exports', icon: Download },
  { to: ROUTES.graphics, label: 'Graphics', icon: BarChart3 },
  { to: ROUTES.users, label: 'Users', icon: Users, adminOnly: true },
]

/** Profile is reached from the sidebar footer on desktop and from "More" on mobile. */
export const PROFILE_NAV_ITEM: NavItem = { to: ROUTES.profile, label: 'Profile', icon: User }

export function visibleNavItems(isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
}
