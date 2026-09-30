import { api } from '@/services/api'
import type { GraphicsFormat, GraphicsJob, GraphicType } from '../types'

export type { GraphicsJob, GraphicType, GraphicsFormat }

/** List the graphics the backend can generate. */
export async function listGraphicTypes(): Promise<GraphicType[]> {
  const response = await api.get<GraphicType[]>('/graphics/types')
  return response.data
}

/** Start a graphics generation job. */
export async function generateGraphics(
  siteId: number,
  graphicType: string,
): Promise<GraphicsJob> {
  const response = await api.post<GraphicsJob>('/graphics/jobs', {
    site_id: siteId,
    graphic_type: graphicType,
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

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}