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
  species: '/species',
  addSpecies: '/species/new',
  editSpecies: '/species/:id/edit',
  protectedSpecies: '/protected-species',
  users: '/users',
  exports: '/exports',
} as const
