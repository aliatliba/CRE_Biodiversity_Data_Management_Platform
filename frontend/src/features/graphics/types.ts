export type GraphicsJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export type GraphicsFormat = 'png' | 'tiff' | 'pdf'

export interface GraphicType {
  key: string
  label: string
  description: string
  formats: GraphicsFormat[]
}

export interface GraphicsJob {
  job_id: string
  status: GraphicsJobStatus
  graphic_type: string
  site_id: number | null
  site_name: string | null
  total_species: number
  processed: number
  started_at: string | null
  finished_at: string | null
  error: string | null
  available_formats: GraphicsFormat[]
}