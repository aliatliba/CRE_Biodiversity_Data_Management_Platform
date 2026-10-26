export interface ApiError {
  detail: string
}

export type Role = 'admin' | 'researcher'

/** A paginated API response (backend app.core.pagination.Page). */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}
