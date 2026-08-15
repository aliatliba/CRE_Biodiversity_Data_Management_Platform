export interface DashboardStats {
  total_species: number
  total_sites: number
  total_associations: number
  status_breakdown: Record<string, number>
  validations_last_30_days: number
}
