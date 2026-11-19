import type { Designation } from '../types'

/** Test fixtures: `count` catalog-like designations. */
export function makeDesignations(count: number): Designation[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `d${i}`,
    name_en: `Designation ${i}`,
    name_fr: `Désignation ${i}`,
    short_name: `D${i}`,
    icon: `/assets/designations/d${i}.svg`,
    official_url: null,
    sort_order: i,
  }))
}
