export interface ProtectedSpeciesEntry {
  id: number
  scientific_name: string
  source_reference: string | null
  added_by: number
  created_at: string
}

export interface ProtectedSpeciesCreateInput {
  scientific_name: string
  source_reference?: string
}
