export interface Site {
  id: number
  name: string
  code: string | null
  description: string | null
  created_by: number
}

export interface SiteCreateInput {
  name: string
  code?: string
  description?: string
}
