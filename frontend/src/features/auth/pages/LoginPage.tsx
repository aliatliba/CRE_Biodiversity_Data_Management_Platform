import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { ContourField } from '@/features/landing/components/ContourField'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    const errors: typeof fieldErrors = {}
    if (!email.trim()) errors.email = 'Enter your email address'
    if (!password) errors.password = 'Enter your password'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      const profile = await signIn({ email: email.trim(), password })

      const redirectTo = (location.state as LocationState | null)?.from?.pathname
      if (profile.must_change_password) {
        navigate(ROUTES.completeProfile, { replace: true })
      } else {
        navigate(redirectTo ?? ROUTES.dashboard, { replace: true })
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setFormError('Incorrect email or password.')
        } else if (error.response?.status === 429) {
          setFormError('Too many attempts. Wait a moment before trying again.')
        } else {
          setFormError('Something went wrong. Please try again.')
        }
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden bg-shell lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-50">
          <ContourField tone="dark" />
        </div>
        <div className="pointer-events-none absolute -left-16 top-20 h-72 w-72 rounded-full bg-canopy-700/30 blur-[90px]" />
        <div className="relative z-10 p-10">
          <Link to={ROUTES.landing} className="inline-flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M8 24C8 14 15 8 24 8C24 18 17 24 8 24Z" fill="var(--color-lichen-400)" />
              <path d="M8 24C12 20 17 15 23 10" stroke="var(--color-shell-text)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="font-display text-[18px] font-semibold tracking-tight text-shell-text">Canopy</span>
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-10 p-10"
        >
          <p className="font-display max-w-sm text-3xl font-medium leading-snug text-shell-text">
            Every site, every specimen, every source — <em className="italic text-lichen-300">traceable.</em>
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-shell-text/40">
            Field Biodiversity Registry
          </p>
        </motion.div>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-paper-50 px-6 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm rounded-2xl border border-mist-200/80 bg-paper-0 p-8 shadow-[0_24px_50px_-32px_rgba(16,26,20,0.45)]"
        >
          <Link to={ROUTES.landing} className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M8 24C8 14 15 8 24 8C24 18 17 24 8 24Z" fill="var(--color-lichen-400)" />
              <path d="M8 24C12 20 17 15 23 10" stroke="var(--color-canopy-900)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="font-display text-[17px] font-semibold tracking-tight text-ink-950">Canopy</span>
          </Link>

          <h1 className="font-display text-[1.85rem] font-medium tracking-tight text-ink-950">
            Sign in
          </h1>
          <p className="mt-2 text-[14.5px] text-ink-950/60">
            Use the email and temporary password your administrator sent you.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@organization.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
              >
                {formError}
              </div>
            )}

            <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2 w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-ink-950/40">
            First time signing in? You'll be asked to set a new password
            right after this.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default LoginPage
