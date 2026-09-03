import { api } from '@/services/api'
import type { DashboardStats } from '../types'

export async function getStats(siteId?: number): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/dashboard/stats', {
    params: siteId ? { site_id: siteId } : undefined,
  })
  return data
}
