import { api } from '@/services/api'
import type { AppUser, Role, UserCreateInput } from '../types'

export async function listUsers(): Promise<AppUser[]> {
  const { data } = await api.get<AppUser[]>('/users')
  return data
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await api.get<Role[]>('/users/roles')
  return data
}

export async function createUser(payload: UserCreateInput): Promise<AppUser> {
  const { data } = await api.post<AppUser>('/users', payload)
  return data
}

export async function deactivateUser(userId: number): Promise<void> {
  await api.delete(`/users/${userId}`)
}
