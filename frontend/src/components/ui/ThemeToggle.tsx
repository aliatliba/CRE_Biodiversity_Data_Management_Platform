import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-950/55 transition-colors hover:bg-mist-100 hover:text-ink-950"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
