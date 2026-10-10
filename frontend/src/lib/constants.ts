export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

// Every backend route is mounted under this prefix (see app/api/__init__.py).
export const API_PREFIX = '/api/v1'

export const ACCESS_TOKEN_KEY = 'canopy.access_token'
export const REFRESH_TOKEN_KEY = 'canopy.refresh_token'

export const ROUTES = {
  landing: '/',
  login: '/login',
  completeProfile: '/complete-profile',
  dashboard: '/dashboard',
  sites: '/sites',
  siteDetail: '/sites/:id',
  species: '/species',
  addSpecies: '/species/new',
  speciesDetail: '/species/:id',
  protectedSpecies: '/protected-species',
  graphics: '/graphics',
  users: '/users',
  exports: '/exports',
  profile: '/profile',
} as const

export const siteUrl = (id: number | string) => `/sites/${id}`
export const speciesUrl = (id: number | string) => `/species/${id}`

/**
 * Link to the species list with filters in the URL, e.g.
 * speciesListUrl({ site_id: 3, iucn_status: THREATENED_STATUSES_PARAM }).
 */
export function speciesListUrl(
  filters: Record<string, string | number | null | undefined> = {},
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `${ROUTES.species}?${query}` : ROUTES.species
}
