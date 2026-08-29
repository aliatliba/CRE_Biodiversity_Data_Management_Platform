import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import * as authService from '@/features/auth/services/authService'
import { ROUTES } from '@/lib/constants'

// First-login flow: swap the admin-issued temporary password for a real
// one and fill in the rest of the profile. Kept minimal for now — full
// design pass to follow alongside the rest of the authenticated app.
export function CompleteProfilePage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await authService.completeProfile({
        current_password: currentPassword,
        new_password: newPassword,
        full_name: fullName || undefined,
        phone: phone || undefined,
      })
      await refreshProfile()
      navigate(ROUTES.dashboard, { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(String(err.response.data.detail))
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-50 px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-mist-200/80 bg-paper-0 p-8 shadow-[0_24px_50px_-32px_rgba(16,26,20,0.45)]">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink-950">
          Set your password
        </h1>
        <p className="mt-2 text-sm text-ink-950/60">
          Replace the temporary password with one only you know, and confirm
          a few details before continuing.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
          <Input
            label="Temporary password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2 w-full">
            Continue
          </Button>
        </form>
      </div>
    </div>
  )
}

export default CompleteProfilePage
