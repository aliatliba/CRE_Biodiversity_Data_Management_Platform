export interface ExportJob {
  id: number
  format: string
  filters: Record<string, unknown> | null
  status: 'pending' | 'processing' | 'done' | 'failed' | string
  file_path: string | null
  created_at: string
  completed_at: string | null
}
