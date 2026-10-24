import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users as UsersIcon, Plus, Copy, Check, UserX, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import * as userService from '../services/userService'
import type { AppUser } from '../types'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export function UsersPage() {
  // Admin-only: the route is wrapped in <AdminRoute>, so no role check is needed here.
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', phone: '', role_id: '', password: generateTempPassword() })
  const [formError, setFormError] = useState<string | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [userToDeactivate, setUserToDeactivate] = useState<AppUser | null>(null)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const usersQuery = useQuery({ queryKey: queryKeys.users, queryFn: userService.listUsers })
  const rolesQuery = useQuery({ queryKey: queryKeys.roles, queryFn: userService.listRoles })

  const users = usersQuery.data ?? []
  const roles = rolesQuery.data ?? []
  const isPending = usersQuery.isPending || rolesQuery.isPending
  const loadError = usersQuery.error ?? rolesQuery.error

  function refetch() {
    void usersQuery.refetch()
    void rolesQuery.refetch()
  }

  function invalidateUsers() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.users })
  }

  function roleName(roleId: number): string {
    return roles.find((r) => r.id === roleId)?.name ?? `role #${roleId}`
  }

  function openModal() {
    setForm({ email: '', full_name: '', phone: '', role_id: '', password: generateTempPassword() })
    setFormError(null)
    setCreatedCredentials(null)
    setIsModalOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      userService.createUser({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role_id: Number(form.role_id),
        phone: form.phone.trim() || undefined,
      }),
    onSuccess: () => {
      setCreatedCredentials({ email: form.email.trim(), password: form.password })
      invalidateUsers()
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Could not create user.')),
  })

  const deactivateMutation = useMutation({
    mutationFn: (target: AppUser) => userService.deactivateUser(target.id),
    onSuccess: invalidateUsers,
    onError: (err) => setActionError(getErrorMessage(err, 'Could not deactivate this user.')),
    onSettled: () => setUserToDeactivate(null),
  })

  const deleteMutation = useMutation({
    mutationFn: (target: AppUser) => userService.deleteUser(target.id),
    onSuccess: invalidateUsers,
    onError: (err) => setActionError(getErrorMessage(err, 'Could not delete this user.')),
    onSettled: () => setUserToDelete(null),
  })

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (!form.email.trim() || !form.full_name.trim() || !form.role_id) {
      setFormError('Email, full name, and role are required.')
      return
    }
    createMutation.mutate()
  }

  async function copyCredentials() {
    if (!createdCredentials) return
    try {
      await navigator.clipboard.writeText(
        `Email: ${createdCredentials.email}\nTemporary password: ${createdCredentials.password}`,
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setFormError('Could not copy to the clipboard. Select the text and copy it manually.')
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-ink-950/55">
          Every account here signs in with a temporary password and must set their own on first login.
        </p>
        <Button onClick={openModal} className="shrink-0 gap-2">
          <Plus size={16} />
          New user
        </Button>
      </div>

      {actionError && <Alert className="mb-4">{actionError}</Alert>}

      {isPending && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {loadError && !isPending && (
        <ErrorState message={getErrorMessage(loadError, 'Could not load users.')} onRetry={refetch} />
      )}

      {!isPending && !loadError && users.length === 0 && (
        <EmptyState icon={<UsersIcon size={22} />} title="No users yet" description="Create the first researcher account." />
      )}

      {!isPending && !loadError && users.length > 0 && (
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
                    {u.id !== currentUser?.id && (
                      <>
                        {u.is_active ? (
                          <button
                            onClick={() => {
                              setActionError(null)
                              setUserToDeactivate(u)
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-950/45 transition-colors hover:bg-red-50 hover:text-red-600 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1"
                            aria-label={`Deactivate ${u.full_name}`}
                            title={`Deactivate ${u.full_name}`}
                          >
                            <UserX size={13} />
                            <span className="hidden sm:inline">Deactivate</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setActionError(null)
                              setUserToDelete(u)
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-950/45 transition-colors hover:bg-red-50 hover:text-red-600 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1"
                            aria-label={`Delete ${u.full_name}`}
                            title={`Permanently delete ${u.full_name}`}
                          >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        )}
                      </>
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
            <Select
              label="Role"
              name="role"
              value={form.role_id}
              onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
              required
            >
              <option value="">Select a role…</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id} className="capitalize">
                  {role.name}
                </option>
              ))}
            </Select>
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

            {formError && <Alert>{formError}</Alert>}

            <Button type="submit" isLoading={createMutation.isPending} className="mt-1 w-full">
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

      <ConfirmDialog
        isOpen={userToDeactivate !== null}
        title={`Deactivate ${userToDeactivate?.full_name ?? ''}?`}
        description="They'll no longer be able to sign in."
        confirmLabel="Deactivate"
        destructive
        isLoading={deactivateMutation.isPending}
        onConfirm={() => userToDeactivate && deactivateMutation.mutate(userToDeactivate)}
        onCancel={() => setUserToDeactivate(null)}
      />

      <ConfirmDialog
        isOpen={userToDelete !== null}
        title={`Permanently delete ${userToDelete?.full_name ?? ''}?`}
        description="This removes their account. Their biodiversity records are kept but will no longer be linked to them. This can't be undone."
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => userToDelete && deleteMutation.mutate(userToDelete)}
        onCancel={() => setUserToDelete(null)}
      />
    </>
  )
}

export default UsersPage
