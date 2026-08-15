import { api } from '@/services/api'
import type {
  DuplicateCheckResult,
  Page,
  Species,
  SpeciesCreateInput,
  SpeciesLookupDraft,
  ValidationHistoryEntry,
} from '../types'

interface ListParams {
  status?: string
  family?: string
  national_status?: string
  page?: number
  page_size?: number
}

export async function listSpecies(params: ListParams = {}): Promise<Page<Species>> {
  const { data } = await api.get<Page<Species>>('/species', { params })
  return data
}

export async function getSpecies(id: number): Promise<Species> {
  const { data } = await api.get<Species>(`/species/${id}`)
  return data
}

export async function getSpeciesHistory(id: number): Promise<ValidationHistoryEntry[]> {
  const { data } = await api.get<ValidationHistoryEntry[]>(`/species/${id}/history`)
  return data
}

export async function checkDuplicate(scientificName: string): Promise<DuplicateCheckResult> {
  const { data } = await api.get<DuplicateCheckResult>('/species/check', {
    params: { scientific_name: scientificName },
  })
  return data
}

export async function lookupSpecies(scientificName: string): Promise<SpeciesLookupDraft> {
  const { data } = await api.post<SpeciesLookupDraft>('/species/lookup', {
    scientific_name: scientificName,
  })
  return data
}

export async function createSpecies(payload: SpeciesCreateInput): Promise<Species> {
  const { data } = await api.post<Species>('/species', payload)
  return data
}

export async function associateSpeciesWithSite(siteId: number, speciesId: number, notes?: string) {
  const { data } = await api.post(`/species/${siteId}/species`, { species_id: speciesId, notes })
  return data
}
