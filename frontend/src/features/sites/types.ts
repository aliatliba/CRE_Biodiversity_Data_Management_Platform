export interface Site {
  id: number
  name: string
  code: string | null
  description: string | null
  created_by: number | null
}

/** A row of GET /sites: the site with its species counters. */
export interface SiteListItem extends Site {
  species_count: number
  /** % of all site-species records (across every site) held by this site. */
  species_share: number
  protected_count: number
  /** IUCN CR / EN / VU */
  threatened_count: number
  /** Full taxonomy and an IUCN status */
  complete_count: number
}

export interface SiteCreateInput {
  name: string
  code?: string
  description?: string
}

export interface SiteUpdateInput {
  name?: string
  code?: string
  description?: string
}
