import { api } from '@/services/api'
import type { ProtectedSpeciesCreateInput, ProtectedSpeciesEntry } from '../types'

export async function listProtectedSpecies(search?: string): Promise<ProtectedSpeciesEntry[]> {
  const { data } = await api.get<ProtectedSpeciesEntry[]>('/protected-species', {
    params: search ? { search } : undefined,
  })
  return data
}

export async function addProtectedSpecies(payload: ProtectedSpeciesCreateInput): Promise<ProtectedSpeciesEntry> {
  const { data } = await api.post<ProtectedSpeciesEntry>('/protected-species', payload)
  return data
}

export async function removeProtectedSpecies(id: number): Promise<void> {
  await api.delete(`/protected-species/${id}`)
}
