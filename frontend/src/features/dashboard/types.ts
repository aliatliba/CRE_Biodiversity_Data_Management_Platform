export interface DashboardStats {
  total_species: number
  total_sites: number
  total_associations: number
  status_breakdown: Record<string, number>
  iucn_breakdown: Record<string, number>
  top_families: { family: string; count: number }[]
  completeness_breakdown: {
    complete: number
    missing_taxonomy: number
    missing_conservation: number
  }
  validations_last_30_days: number
  site_stats: SiteStatSummary[]
  site?: {
    id: number
    name: string
    code: string | null
  }
}

export interface SiteStatSummary {
  site_id: number
  site_name: string
  species_count: number
  protected_count: number
  complete_count: number
  incomplete_count: number
}
