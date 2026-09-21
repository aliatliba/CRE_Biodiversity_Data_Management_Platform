export interface DashboardStats {
  total_species: number

  total_sites: number

  iucn_threatened_species: number

  biodiversity_composition: Record<string, number>

  status_breakdown: Record<string, number>

  iucn_breakdown: Record<string, number>

  species_richness_by_site: SiteRichness[]

  site_stats: SiteStatSummary[]

  top_families: { family: string; count: number }[]

  // Kept for API compatibility.
  total_associations: number

  completeness_breakdown: {
    complete: number
    missing_taxonomy: number
    missing_conservation: number
  }

  validations_last_30_days: number

  site?: {
    id: number
    name: string
    code: string | null
  }
}

export interface SiteRichness {
  site_name: string
  species_count: number
  percentage: number
}

export interface SiteStatSummary {
  site_id: number
  site_name: string
  species_count: number
  protected_count: number
  complete_count: number
  incomplete_count: number
}