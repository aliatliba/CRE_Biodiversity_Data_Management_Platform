import { api } from '@/services/api'
import { downloadBlob } from '@/lib/download'
import type { GraphicsFormat, GraphicsJob, GraphicType, SiteClass } from '../types'

export type { GraphicsJob, GraphicType, GraphicsFormat, SiteClass }

/** List the graphics the backend can generate. */
export async function listGraphicTypes(): Promise<GraphicType[]> {
  const response = await api.get<GraphicType[]>('/graphics/types')
  return response.data
}

/** Taxonomic classes of a site's validated species, for class-filtered graphics. */
export async function listSiteClasses(siteId: number): Promise<SiteClass[]> {
  const response = await api.get<SiteClass[]>(`/graphics/sites/${siteId}/classes`)
  return response.data
}

/** Start a graphics generation job. */
export async function generateGraphics(
  siteId: number,
  graphicType: string,
  classNames?: string[],
): Promise<GraphicsJob> {
  const response = await api.post<GraphicsJob>('/graphics/jobs', {
    site_id: siteId,
    graphic_type: graphicType,
    ...(classNames?.length ? { class_names: classNames } : {}),
  })
  return response.data
}

export async function getGraphicsJob(jobId: string): Promise<GraphicsJob> {
  const response = await api.get<GraphicsJob>(`/graphics/jobs/${jobId}`)
  return response.data
}

/** Fetch the PNG through Axios so the auth interceptor is applied. */
export async function getGraphicsPreviewBlob(jobId: string): Promise<Blob> {
  const response = await api.get(`/graphics/jobs/${jobId}/preview`, {
    responseType: 'blob',
  })
  return response.data
}

export async function downloadGraphics(
  jobId: string,
  format: GraphicsFormat,
): Promise<void> {
  const response = await api.get(
    `/graphics/jobs/${jobId}/download/${format}`,
    { responseType: 'blob' },
  )

  const rawType = response.headers['content-type']
  const blob = new Blob([response.data], {
    type: typeof rawType === 'string' ? rawType : undefined,
  })

  let filename = `graphic_${jobId}.${format}`
  const disposition = response.headers['content-disposition']
  if (typeof disposition === 'string') {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (match?.[1]) filename = match[1].replace(/^["']|["']$/g, '')
  }

  downloadBlob(blob, filename)
}
