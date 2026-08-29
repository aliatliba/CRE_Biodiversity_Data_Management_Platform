import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { UserRound, KeyRound, Palette } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import * as authService from '@/features/auth/services/authService'

export function ProfilePage() {
  const { user, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()

  // ---- Profile info (name / phone) ----
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null)
  const [isSavingInfo, setIsSavingInfo] = useState(false)

  // ---- Password change ----
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  function extractError(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err) && err.response?.data?.detail) {
      return String(err.response.data.detail)
    }
    return fallback
  }

  async function handleSaveInfo(event: FormEvent) {
    event.preventDefault()
    setInfoError(null)
    setInfoSuccess(null)
    setIsSavingInfo(true)
    try {
      await authService.updateOwnProfile({
        full_name: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      await refreshProfile()
      setInfoSuccess('Profile updated.')
      setIsEditingInfo(false)
    } catch (err) {
      setInfoError(extractError(err, 'Could not update your profile.'))
    } finally {
      setIsSavingInfo(false)
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)
    setIsSavingPassword(true)
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      setPasswordSuccess('Password changed.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPasswordError(extractError(err, 'Could not change your password.'))
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <AppLayout title="Profile">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-shell text-lichen-400">
                <UserRound size={22} />
              </div>
              <div>
                <h2 className="font-display text-lg font-medium text-ink-950">
                  {user?.full_name}
                </h2>
                <p className="text-sm text-ink-950/55">{user?.email}</p>
              </div>
            </div>
            <Badge tone="accent" className="capitalize">
              {user?.role}
            </Badge>
          </div>

          <form onSubmit={handleSaveInfo} className="mt-6 flex flex-col gap-4 border-t border-canopy-900/[0.08] pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-medium text-ink-950">Profile information</h3>
              {!isEditingInfo && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingInfo(true)
                    setInfoSuccess(null)
                  }}
                  className="text-sm font-medium text-canopy-700 underline underline-offset-4"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                value={fullName}
                disabled={!isEditingInfo}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="Phone"
                type="tel"
                value={phone}
                disabled={!isEditingInfo}
                placeholder="Not set"
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input label="Email" value={user?.email ?? ''} disabled />
              <Input label="Role" value={user?.role ?? ''} disabled className="capitalize" />
            </div>

            {infoError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {infoError}
              </div>
            )}
            {infoSuccess && (
              <div className="rounded-lg border border-canopy-700/20 bg-canopy-500/10 px-3.5 py-2.5 text-sm font-medium text-canopy-800">
                {infoSuccess}
              </div>
            )}

            {isEditingInfo && (
              <div className="flex gap-3">
                <Button type="submit" isLoading={isSavingInfo}>
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditingInfo(false)
                    setFullName(user?.full_name ?? '')
                    setPhone(user?.phone ?? '')
                    setInfoError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-2">
            <KeyRound size={17} className="text-canopy-800" />
            <h3 className="font-display text-sm font-medium text-ink-950">Change password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <Input
              label="Current password"
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

            {passwordError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-lg border border-canopy-700/20 bg-canopy-500/10 px-3.5 py-2.5 text-sm font-medium text-canopy-800">
                {passwordSuccess}
              </div>
            )}

            <Button type="submit" isLoading={isSavingPassword} className="self-start">
              Update password
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-2">
            <Palette size={17} className="text-canopy-800" />
            <h3 className="font-display text-sm font-medium text-ink-950">Appearance</h3>
          </div>
          <div className="flex gap-3">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium capitalize transition-colors ${
                  theme === t
                    ? 'border-canopy-700 bg-canopy-700/10 text-canopy-800'
                    : 'border-mist-200 text-ink-950/60 hover:bg-mist-100'
                }`}
              >
                {t} mode
              </button>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}

export default ProfilePage
