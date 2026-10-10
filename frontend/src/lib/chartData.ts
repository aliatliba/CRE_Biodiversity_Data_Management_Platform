export interface ChartDatum {
  label: string
  value: number
}

/** `{ CR: 3, EN: 1 }` -> `[{ label: 'CR', value: 3 }, { label: 'EN', value: 1 }]`. */
export function toChartData(stats: Record<string, number> | undefined | null): ChartDatum[] {
  return Object.entries(stats ?? {}).map(([label, value]) => ({ label, value }))
}
