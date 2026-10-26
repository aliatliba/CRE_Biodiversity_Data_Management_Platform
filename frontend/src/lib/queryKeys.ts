/** Central TanStack Query keys, so invalidation and sharing stay consistent. */
export const queryKeys = {
  sites: ['sites'] as const,
  site: (id: number) => ['sites', id] as const,
  dashboard: (siteId?: number) => ['dashboard', siteId ?? 'all'] as const,
  species: (params: object) => ['species', params] as const,
  speciesAll: ['species'] as const,
  speciesDetail: (id: number) => ['species', 'detail', id] as const,
  protectedSpecies: (params: { search?: string; page: number; page_size: number }) =>
    ['protected-species', params] as const,
  users: ['users'] as const,
  roles: ['roles'] as const,
  exportOptions: ['export-options'] as const,
  exportJobs: ['export-jobs'] as const,
  graphicTypes: ['graphic-types'] as const,
}
