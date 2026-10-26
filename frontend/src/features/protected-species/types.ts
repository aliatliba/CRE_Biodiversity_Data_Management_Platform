export interface ProtectedSpeciesEntry {
  id: number
  scientific_name: string
  source_reference: string | null
  added_by: number | null
  created_at: string
  /** IUCN status of the recorded species with this name; null if not recorded / unassessed. */
  iucn_status?: string | null
}

export interface ProtectedSpeciesCreateInput {
  scientific_name: string
  source_reference?: string
}
