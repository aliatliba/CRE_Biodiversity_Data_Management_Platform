export interface AppUser {
  id: number
  email: string
  full_name: string
  phone: string | null
  role_id: number
  is_active: boolean
  must_change_password: boolean
}

export interface Role {
  id: number
  name: string
  description: string | null
}

export interface UserCreateInput {
  email: string
  password: string
  full_name: string
  role_id: number
  phone?: string
}
