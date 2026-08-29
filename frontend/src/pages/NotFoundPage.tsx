import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper-50 px-6 text-center">
      <p className="font-mono text-sm text-lichen-400">404</p>
      <h1 className="font-display text-3xl font-medium text-ink-950">This page doesn't exist</h1>
      <Link to={ROUTES.landing} className="mt-2 text-sm font-semibold text-canopy-800 underline underline-offset-4">
        Back to Canopy
      </Link>
    </div>
  )
}

export default NotFoundPage
