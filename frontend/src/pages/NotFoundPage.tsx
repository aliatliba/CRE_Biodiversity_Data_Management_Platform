import { Link } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <p className="font-mono text-sm text-link">404</p>
      <h1 className="font-display text-2xl font-bold text-fg">This page doesn't exist</h1>
      <Link to={ROUTES.landing} className="mt-2 text-sm font-semibold text-link underline underline-offset-4 hover:text-primary">
        Back to BioData
      </Link>
    </div>
  )
}

export default NotFoundPage
