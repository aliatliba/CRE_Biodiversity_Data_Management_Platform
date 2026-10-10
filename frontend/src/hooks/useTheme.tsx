import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'canopy.theme'

function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : null
  } catch {
    return null
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

interface ThemeContextValue {
  /** The theme currently shown (may be a temporary override, see `forceTheme`). */
  theme: Theme
  toggleTheme: () => void
  /** Choose a theme and remember it as the user's preference. */
  setTheme: (theme: Theme) => void
  /**
   * Show `theme` without touching the stored preference (null = back to the
   * preference). Used by public pages that are always light.
   */
  forceTheme: (theme: Theme | null) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The user's preference: stored choice, otherwise follow the system.
  const [preference, setPreference] = useState<Theme>(() => getStoredTheme() ?? getSystemTheme())
  const [forced, setForced] = useState<Theme | null>(null)
  const theme = forced ?? preference

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Follow the system preference only while the user has not chosen a theme.
  // The stored value is re-checked inside the handler, so a choice made after
  // mount is respected too.
  useEffect(() => {
    if (!window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent) => {
      if (getStoredTheme()) return
      setPreference(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage unavailable: the choice still applies for this session
    }
    setPreference(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, forceTheme: setForced }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
