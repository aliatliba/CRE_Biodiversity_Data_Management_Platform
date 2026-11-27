/** A designation from the catalog (Ramsar, UNESCO MAB, IBA, KBA, national park...). */
export interface Designation {
  id: string
  name_en: string
  name_fr: string
  short_name: string
  /** Served from frontend/public, e.g. /assets/designations/ramsar.svg */
  icon: string
  official_url: string | null
  sort_order: number
  /** On a site: that site's own page for the designation, set by an admin. */
  url?: string | null
}

/** Where a designation's logo leads: the site's own page, else the designation's website. */
export function designationLink(d: Designation): string | null {
  return d.url || d.official_url || null
}

export interface Site {
  id: number
  name: string
  code: string | null
  description: string | null
  created_by: number | null
  /** Sorted by the catalog order. */
  designations: Designation[]
  /** ISO date of the last photo change; null when the site has no photo. */
  photo_updated_at: string | null
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

/** What saving a site form does to its photo. */
export type PhotoChange =
  | { kind: 'keep' }
  | { kind: 'set'; photo: Blob }
  | { kind: 'remove' }
