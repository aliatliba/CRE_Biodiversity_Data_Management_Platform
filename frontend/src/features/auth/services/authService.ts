import { api, setTokens, clearTokens } from '@/services/api'
import type { CompleteProfileRequest, LoginRequest, TokenResponse, UserProfile } from '../types'

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/login', payload)
  setTokens(data.access_token, data.refresh_token)
  return data
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/auth/me')
  return data
}

export async function completeProfile(payload: CompleteProfileRequest): Promise<void> {
  await api.post('/auth/complete-profile', payload)
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('canopy.refresh_token')
  clearTokens()
  if (refreshToken) {
    try {
      await api.post('/auth/logout', { refresh_token: refreshToken })
    } catch {
      // best-effort; token is already cleared client-side
    }
  }
}
