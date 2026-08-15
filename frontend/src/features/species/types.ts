export interface Species {
  id: number
  scientific_name: string
  kingdom: string | null
  class_name: string | null
  order_name: string | null
  family: string | null
  genus: string | null
  species_epithet: string | null
  common_name: string | null
  raw_taxonomy_extra: Record<string, unknown> | null
  field_sources: Record<string, string | null> | null
  iucn_status: string | null
  iucn_trend: string | null
  national_status: string
  guild: string | null
  ecosystem_service: string | null
  habitat: string | null
  typology: string | null
  endemism: string | null
  potential_threats: string | null
  reference: string | null
  status: string
  created_by: number
  validated_by: number | null
  validated_at: string | null
  updated_at: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface SpeciesLookupDraft {
  scientific_name: string
  input_scientific_name: string | null
  taxonomy: {
    kingdom?: string | null
    class_name?: string | null
    order_name?: string | null
    family?: string | null
    genus?: string | null
    species_epithet?: string | null
    common_name?: string | null
  }
  conservation: {
    iucn_status?: string | null
    iucn_trend?: string | null
  }
  traits: {
    guild?: string | null
    ecosystem_service?: string | null
    habitat?: string | null
    typology?: string | null
    endemism?: string | null
    potential_threats?: string | null
    reference?: string | null
  }
  field_sources: Record<string, string | null>
}

export interface SpeciesCreateInput {
  scientific_name: string
  site_id: number
  kingdom?: string | null
  class_name?: string | null
  order_name?: string | null
  family?: string | null
  genus?: string | null
  species_epithet?: string | null
  common_name?: string | null
  field_sources?: Record<string, string | null> | null
  iucn_status?: string | null
  iucn_trend?: string | null
  guild?: string | null
  ecosystem_service?: string | null
  habitat?: string | null
  typology?: string | null
  endemism?: string | null
  potential_threats?: string | null
  reference?: string | null
}

export interface ValidationHistoryEntry {
  id: number
  species_id: number
  action: string
  changed_fields: Record<string, unknown>
  validated_by: number
  validated_at: string
}

export interface DuplicateCheckResult {
  exists: boolean
  species?: Species
}
