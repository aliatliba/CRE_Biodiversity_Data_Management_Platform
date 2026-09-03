import { api } from '@/services/api'
import type { Site, SiteCreateInput, SiteUpdateInput } from '../types'

export async function listSites(search?: string): Promise<Site[]> {
  const { data } = await api.get<Site[]>('/sites', { params: search ? { search } : undefined })
  return data
}

export async function getSite(siteId: number): Promise<Site> {
  const { data } = await api.get<Site>(`/sites/${siteId}`)
  return data
}

export async function createSite(payload: SiteCreateInput): Promise<Site> {
  const { data } = await api.post<Site>('/sites', payload)
  return data
}

export async function updateSite(siteId: number, payload: SiteUpdateInput): Promise<Site> {
  const { data } = await api.patch<Site>(`/sites/${siteId}`, payload)
  return data
}

export async function deleteSite(siteId: number, force = false): Promise<void> {
  await api.delete(`/sites/${siteId}`, { params: force ? { force: true } : undefined })
}
