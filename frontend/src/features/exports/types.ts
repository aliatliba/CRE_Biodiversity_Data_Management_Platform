

export interface ExportRequest {
  format: 'csv' | 'xlsx'
  filters?: ExportFilters
}

export interface ExportFilters {
  site_ids?: number[]
  kingdom?: string
  class_name?: string
  order_name?: string
  family?: string
  genus?: string
  search?: string
  iucn_status?: string
  iucn_trend?: string
  national_status?: string
  date_from?: string
  date_to?: string
}

export interface ExportOptions {
  sites: {
    id: number
    name: string
  }[]
  kingdoms: string[]
  classes: string[]
  orders: string[]
  families: string[]
  genera: string[]
  iucn_statuses: string[]
  iucn_trends: string[]
  national_statuses: string[]
}

export interface ExportJob {
  id: number
  format: string
  filters: ExportFilters | null
  status: 'pending' | 'processing' | 'done' | 'failed' | string
  file_path: string | null
  created_at: string
  completed_at: string | null
}