import type { Species, SpeciesLookupDraft } from '@/features/species/types'

export type CompletenessStatus = 'complete' | 'missing_taxonomy' | 'missing_conservation'

const CRITICAL_TAXONOMY_FIELDS = [
  'kingdom',
  'class_name',
  'order_name',
  'family',
  'genus',
] as const

export function isTaxonomyComplete(species: Pick<Species, (typeof CRITICAL_TAXONOMY_FIELDS)[number]>): boolean {
  return CRITICAL_TAXONOMY_FIELDS.every((field) => {
    const value = species[field]
    return value != null && String(value).trim() !== ''
  })
}

export function isConservationComplete(species: Pick<Species, 'iucn_status'>): boolean {
  return species.iucn_status != null && species.iucn_status.trim() !== ''
}

export function getCompletenessStatus(species: Species): CompletenessStatus {
  if (!isTaxonomyComplete(species)) return 'missing_taxonomy'
  if (!isConservationComplete(species)) return 'missing_conservation'
  return 'complete'
}

export function getCompletenessLabel(status: CompletenessStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete'
    case 'missing_taxonomy':
      return 'Missing taxonomy'
    case 'missing_conservation':
      return 'Missing conservation'
  }
}

export function getCompletenessTone(status: CompletenessStatus): 'success' | 'danger' | 'warning' {
  switch (status) {
    case 'complete':
      return 'success'
    case 'missing_taxonomy':
      return 'danger'
    case 'missing_conservation':
      return 'warning'
  }
}

export function getDraftCompletenessStatus(draft: SpeciesLookupDraft): CompletenessStatus {
  const pseudoSpecies = {
    kingdom: draft.taxonomy.kingdom ?? null,
    class_name: draft.taxonomy.class_name ?? null,
    order_name: draft.taxonomy.order_name ?? null,
    family: draft.taxonomy.family ?? null,
    genus: draft.taxonomy.genus ?? null,
    iucn_status: draft.conservation.iucn_status ?? null,
  }
  if (!isTaxonomyComplete(pseudoSpecies)) return 'missing_taxonomy'
  if (!isConservationComplete(pseudoSpecies)) return 'missing_conservation'
  return 'complete'
}

export function getMissingTaxonomyLabels(
  species: Pick<Species, (typeof CRITICAL_TAXONOMY_FIELDS)[number]>
): string[] {
  const labels: Record<(typeof CRITICAL_TAXONOMY_FIELDS)[number], string> = {
    kingdom: 'Kingdom',
    class_name: 'Class',
    order_name: 'Order',
    family: 'Family',
    genus: 'Genus',
  }
  return CRITICAL_TAXONOMY_FIELDS.filter((field) => {
    const value = species[field]
    return value == null || String(value).trim() === ''
  }).map((field) => labels[field])
}
