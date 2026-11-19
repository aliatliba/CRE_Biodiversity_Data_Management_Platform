import { api } from '@/services/api'
import type { Designation, Site, SiteCreateInput, SiteListItem, SiteUpdateInput } from '../types'

export async function listSites(search?: string): Promise<SiteListItem[]> {
  const { data } = await api.get<SiteListItem[]>('/sites', { params: search ? { search } : undefined })
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

/** The designation catalog, in display order. */
export async function listDesignations(): Promise<Designation[]> {
  const { data } = await api.get<Designation[]>('/designations')
  return data
}

/** Admin only. Returns the site's designations after the change. */
export async function addSiteDesignation(siteId: number, designationId: string): Promise<Designation[]> {
  const { data } = await api.post<Designation[]>(`/sites/${siteId}/designations`, {
    designation_id: designationId,
  })
  return data
}

/** Admin only. */
export async function removeSiteDesignation(siteId: number, designationId: string): Promise<void> {
  await api.delete(`/sites/${siteId}/designations/${encodeURIComponent(designationId)}`)
}
