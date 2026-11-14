/** Outcome of checking a decree name against current nomenclature. */
export type VerificationStatus =
  | 'OK'
  | 'Spelling'
  | 'Outdated'
  | 'Spelling+Outdated'
  | 'Taxonomic note'
  | 'Unverified/doubtful'

export interface ProtectedSpeciesEntry {
  id: number
  /** Current accepted name, without author. */
  scientific_name: string
  source_reference: string | null
  /** "12-03" (plants) or "12-235" (animals); null for entries added by an administrator. */
  decree: string | null
  kingdom: string | null
  taxon_group: string | null
  family: string | null
  common_name_fr: string | null
  common_name_ar: string | null
  verification_status: VerificationStatus | string | null
  verification_note: string | null
  added_by: number | null
  created_at: string
  /** Names as printed in the decree, when different from scientific_name. */
  printed_names?: string[]
  /** Other names that also mark a recorded species as protected. */
  synonyms?: string[]
  /** Recorded species carrying one of this entry's names. */
  recorded_species_id?: number | null
  /** IUCN status of that recorded species; null if not recorded / unassessed. */
  iucn_status?: string | null
}

export interface TaxonGroupCount {
  taxon_group: string
  count: number
}

export interface ProtectedSpeciesCreateInput {
  scientific_name: string
  source_reference?: string
  common_name_fr?: string
  taxon_group?: string
}
