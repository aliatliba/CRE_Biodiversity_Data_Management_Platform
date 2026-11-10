export interface ChartDatum {
  label: string
  value: number
}

/** `{ CR: 3, EN: 1 }` -> `[{ label: 'CR', value: 3 }, { label: 'EN', value: 1 }]`. */
export function toChartData(stats: Record<string, number> | undefined | null): ChartDatum[] {
  return Object.entries(stats ?? {}).map(([label, value]) => ({ label, value }))
}

/**
 * Kingdom groups shown in the "Biodiversity composition" chart. The API also returns
 * an "Unclassified" group (species with no or unknown kingdom); it is left out on
 * purpose so the percentages are computed over classified species only.
 */
const COMPOSITION_LABELS = ['Fauna', 'Flora', 'Micro-organisms', 'Fungi']

export function toCompositionData(composition: Record<string, number> | undefined | null): ChartDatum[] {
  return COMPOSITION_LABELS.map((label) => ({ label, value: composition?.[label] ?? 0 }))
}

/**
 * IUCN breakdown for the charts, without the "NA" (Not Applicable) group, so the
 * percentages are computed over the remaining categories only.
 */
export function toIucnChartData(breakdown: Record<string, number> | undefined | null): ChartDatum[] {
  return toChartData(breakdown).filter((item) => item.label !== 'NA')
}
