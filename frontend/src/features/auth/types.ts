import type { Role } from '@/types/common'

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  must_change_password: boolean
}

export interface UserProfile {
  id: number
  email: string
  full_name: string
  phone: string | null
  role: Role
  is_active: boolean
  must_change_password: boolean
}

export interface CompleteProfileRequest {
  current_password: string
  new_password: string
  full_name?: string
  phone?: string
}
