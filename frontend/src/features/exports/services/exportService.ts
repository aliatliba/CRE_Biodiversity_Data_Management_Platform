import { api } from '@/services/api'
import { downloadBlob } from '@/lib/download'
import type { ExportFilters, ExportJob, ExportOptions } from '../types'

export async function createExport(
  format: 'csv' | 'xlsx',
  filters?: ExportFilters
): Promise<ExportJob> {
  const { data } = await api.post<ExportJob>('/exports', {
    format,
    filters,
  })

  return data
}

export async function getExportOptions(): Promise<ExportOptions> {
  const { data } = await api.get<ExportOptions>('/exports/options')
  return data
}

export async function getExport(exportId: number): Promise<ExportJob> {
  const { data } = await api.get<ExportJob>(`/exports/${exportId}`)
  return data
}

export async function downloadExport(job: ExportJob): Promise<void> {
  const response = await api.get<Blob>(`/exports/${job.id}/download`, {
    responseType: 'blob',
  })

  downloadBlob(response.data, `export_${job.id}.${job.format}`)
}
