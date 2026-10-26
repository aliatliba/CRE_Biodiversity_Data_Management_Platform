import { api } from '@/services/api'
import type { Page } from '@/types/common'
import type { ProtectedSpeciesCreateInput, ProtectedSpeciesEntry } from '../types'

export interface ProtectedSpeciesListParams {
  search?: string
  page: number
  page_size: number
}

export async function listProtectedSpecies(
  params: ProtectedSpeciesListParams,
): Promise<Page<ProtectedSpeciesEntry>> {
  const { data } = await api.get<Page<ProtectedSpeciesEntry>>('/protected-species', { params })
  return data
}

export async function addProtectedSpecies(payload: ProtectedSpeciesCreateInput): Promise<ProtectedSpeciesEntry> {
  const { data } = await api.post<ProtectedSpeciesEntry>('/protected-species', payload)
  return data
}

export async function removeProtectedSpecies(id: number): Promise<void> {
  await api.delete(`/protected-species/${id}`)
}
