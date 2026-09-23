export interface GraphicsGenerateRequest {
  site_id: number
}

export interface GraphicsJob {
  job_id: string
  status: 'queued' | 'running' | 'completed' | 'failed'

  site_id: number | null
  site_name: string | null

  total_species: number
  processed: number

  started_at: string | null
  finished_at: string | null

  error: string | null

  png_available: boolean
  tiff_available: boolean
  pdf_available: boolean
}