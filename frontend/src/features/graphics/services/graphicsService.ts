import { api } from '@/services/api'

export type GraphicsJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'

export interface GraphicsJob {
  job_id: string
  status: GraphicsJobStatus

  site_id: number
  site_name: string

  total_species: number
  processed: number

  started_at: string | null
  finished_at: string | null

  message: string | null
  error: string | null

  png_available: boolean
  tiff_available: boolean
  pdf_available: boolean
}

export interface GenerateGraphicsRequest {
  site_id: number
}

export interface GenerateGraphicsResponse {
  job_id: string
}

/**
 * Start a new taxonomic dendrogram generation job.
 */
export async function generateGraphics(
  siteId: number,
): Promise<GenerateGraphicsResponse> {
  const response = await api.post<GenerateGraphicsResponse>(
    '/graphics/jobs',
    {
      site_id: siteId,
    },
  )

  return response.data
}

/**
 * Get the current status and progress of a graphics generation job.
 */
export async function getGraphicsJob(
  jobId: string,
): Promise<GraphicsJob> {
  const response = await api.get<GraphicsJob>(
    `/graphics/jobs/${jobId}`,
  )

  return response.data
}

/**
 * Build the URL used to preview the generated PNG.
 */
export function getGraphicsPreviewUrl(
  jobId: string,
): string {
  return `${api.defaults.baseURL}/graphics/jobs/${jobId}/preview`
}

/**
 * Download a generated graphics file.
 *
 * Supported formats:
 * - png
 * - tiff
 * - pdf
 */
export async function downloadGraphics(
  jobId: string,
  format: 'png' | 'tiff' | 'pdf',
): Promise<void> {
  const response = await api.get(
    `/graphics/jobs/${jobId}/download/${format}`,
    {
      responseType: 'blob',
    },
  )

  const rawContentType = response.headers['content-type']

  const contentType =
    typeof rawContentType === 'string'
      ? rawContentType
      : undefined

  const blob = new Blob([response.data], {
    type: contentType,
  })

  const rawDisposition =
    response.headers['content-disposition']

  let filename = `dendrogram_${jobId}.${format}`

  if (typeof rawDisposition === 'string') {
    const match = rawDisposition.match(
      /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
    )

    if (match?.[1]) {
      filename = match[1].replace(/^["']|["']$/g, '')
    }
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