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
export async function addSiteDesignation(
  siteId: number,
  designationId: string,
  url?: string,
): Promise<Designation[]> {
  const { data } = await api.post<Designation[]>(`/sites/${siteId}/designations`, {
    designation_id: designationId,
    ...(url ? { url } : {}),
  })
  return data
}

/** Admin only. Sets the site's website link for a designation; null removes it. */
export async function setSiteDesignationUrl(
  siteId: number,
  designationId: string,
  url: string | null,
): Promise<Designation[]> {
  const { data } = await api.patch<Designation[]>(
    `/sites/${siteId}/designations/${encodeURIComponent(designationId)}`,
    { url },
  )
  return data
}

/** Admin only. */
export async function removeSiteDesignation(siteId: number, designationId: string): Promise<void> {
  await api.delete(`/sites/${siteId}/designations/${encodeURIComponent(designationId)}`)
}

/** Admin only. Adds or replaces the site's landscape photo; returns the site. */
export async function uploadSitePhoto(siteId: number, photo: Blob): Promise<Site> {
  const body = new FormData()
  body.append('file', photo, photo.type === 'image/webp' ? 'photo.webp' : 'photo.jpg')
  // Overrides the JSON default: axios would otherwise serialise the FormData to JSON.
  // The browser then sets the multipart boundary itself.
  const { data } = await api.put<Site>(`/sites/${siteId}/photo`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/** Admin only. */
export async function removeSitePhoto(siteId: number): Promise<void> {
  await api.delete(`/sites/${siteId}/photo`)
}

/**
 * The photo's bytes. Fetched through the API client (not an <img src>) because the
 * endpoint needs the bearer token. `version` is Site.photo_updated_at: it makes the
 * URL change with the photo, so the browser may cache each version for good.
 */
export async function getSitePhoto(siteId: number, version: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`/sites/${siteId}/photo`, {
    params: { v: version },
    responseType: 'blob',
  })
  return data
}
