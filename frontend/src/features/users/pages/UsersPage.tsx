import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'
import { Users as UsersIcon, Plus, Copy, Check, UserX } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import * as userService from '../services/userService'
import type { AppUser, Role } from '../types'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const [users, setUsers] = useState<AppUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', phone: '', role_id: '', password: generateTempPassword() })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const [userList, roleList] = await Promise.all([userService.listUsers(), userService.listRoles()])
      setUsers(userList)
      setRoles(roleList)
    } catch {
      setError('Could not load users.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function roleName(roleId: number): string {
    return roles.find((r) => r.id === roleId)?.name ?? `role #${roleId}`
  }

  function openModal() {
    setForm({ email: '', full_name: '', phone: '', role_id: '', password: generateTempPassword() })
    setFormError(null)
    setCreatedCredentials(null)
    setIsModalOpen(true)
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (!form.email.trim() || !form.full_name.trim() || !form.role_id) {
      setFormError('Email, full name, and role are required.')
      return
    }
    setIsSubmitting(true)
    try {
      await userService.createUser({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role_id: Number(form.role_id),
        phone: form.phone.trim() || undefined,
      })
      setCreatedCredentials({ email: form.email.trim(), password: form.password })
      load()
    } catch (err) {
      setFormError(
        axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Could not create user.') : 'Could not create user.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivate(user: AppUser) {
    if (!confirm(`Deactivate ${user.full_name}? They'll no longer be able to sign in.`)) return
    try {
      await userService.deactivateUser(user.id)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: false } : u)))
    } catch {
      alert('Could not deactivate this user.')
    }
  }

  function copyCredentials() {
    if (!createdCredentials) return
    navigator.clipboard.writeText(
      `Email: ${createdCredentials.email}\nTemporary password: ${createdCredentials.password}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <AppLayout title="Users">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-ink-950/55">
          Every account here signs in with a temporary password and must set their own on first login.
        </p>
        <Button onClick={openModal} className="shrink-0 gap-2">
          <Plus size={16} />
          New user
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && users.length === 0 && (
        <EmptyState icon={<UsersIcon size={22} />} title="No users yet" description="Create the first researcher account." />
      )}

      {!isLoading && !error && users.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-canopy-900/10 bg-paper-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-canopy-900/[0.08] bg-mist-100/50 text-xs font-semibold uppercase tracking-wide text-ink-950/50">
                <th className="px-5 py-3">Name</th>
                <th className="hidden px-5 py-3 sm:table-cell">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-canopy-900/[0.05] last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink-950">{u.full_name}</p>
                    <p className="text-xs text-ink-950/45 sm:hidden">{u.email}</p>
                  </td>
                  <td className="hidden px-5 py-3.5 text-ink-950/65 sm:table-cell">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={roleName(u.role_id) === 'admin' ? 'accent' : 'neutral'} className="capitalize">
                      {roleName(u.role_id)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    {!u.is_active ? (
                      <Badge tone="danger">Deactivated</Badge>
                    ) : u.must_change_password ? (
                      <Badge tone="warning">Pending first login</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.is_active && u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeactivate(u)}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-ink-950/45 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <UserX size={13} />
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={createdCredentials ? 'User created' : 'New user'}
        description={
          createdCredentials
            ? 'Share these credentials with them securely — this password is shown only once.'
            : 'They will be required to change this password on first login.'
        }
      >
        {!createdCredentials ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input
              label="Full name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              label="Phone (optional)"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/70">Role</label>
              <select
                value={form.role_id}
                onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                className="h-12 rounded-xl border border-mist-200 bg-paper-0 px-4 text-[15px] outline-none transition-colors focus:border-canopy-600"
                required
              >
                <option value="">Select a role…</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id} className="capitalize">
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input label="Temporary password" value={form.password} readOnly />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setForm((f) => ({ ...f, password: generateTempPassword() }))}
              >
                Regenerate
              </Button>
            </div>

            {formError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {formError}
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
              Create user
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-canopy-900/10 bg-mist-100/50 p-4 font-mono text-sm">
              <p>
                <span className="text-ink-950/50">email</span> {createdCredentials.email}
              </p>
              <p className="mt-1">
                <span className="text-ink-950/50">password</span> {createdCredentials.password}
              </p>
            </div>
            <Button variant="secondary" onClick={copyCredentials} className="gap-2">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy credentials'}
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Done</Button>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}

export default UsersPage
