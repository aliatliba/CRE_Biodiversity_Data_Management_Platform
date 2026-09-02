import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper-0 px-6 text-center">
      <p className="font-mono text-sm text-canopy-700">404</p>
      <h1 className="font-display text-2xl font-bold text-canopy-950">This page doesn't exist</h1>
      <Link to={ROUTES.landing} className="mt-2 text-sm font-semibold text-canopy-800 underline underline-offset-4">
        Back to BioData
      </Link>
    </div>
  )
}

export default NotFoundPage
