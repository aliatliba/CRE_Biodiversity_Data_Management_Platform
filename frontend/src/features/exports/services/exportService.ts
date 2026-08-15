import { api } from '@/services/api'
import type { ExportJob } from '../types'

export async function createExport(format: 'csv' | 'xlsx'): Promise<ExportJob> {
  const { data } = await api.post<ExportJob>('/exports', { format })
  return data
}

export async function getExport(id: number): Promise<ExportJob> {
  const { data } = await api.get<ExportJob>(`/exports/${id}`)
  return data
}

// Downloads go through the authenticated axios client (a plain <a href>
// wouldn't carry the Bearer token) and are saved via a temporary object URL.
export async function downloadExport(job: ExportJob): Promise<void> {
  const response = await api.get(`/exports/${job.id}/download`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = `export_${job.id}.${job.format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
