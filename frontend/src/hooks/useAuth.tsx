import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getAccessToken } from '@/services/api'
import * as authService from '@/features/auth/services/authService'
import type { LoginRequest, UserProfile } from '@/features/auth/types'

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (payload: LoginRequest) => Promise<UserProfile>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const profile = await authService.fetchCurrentUser()
      setUser(profile)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const signIn = useCallback(async (payload: LoginRequest) => {
    await authService.login(payload)
    const profile = await authService.fetchCurrentUser()
    setUser(profile)
    return profile
  }, [])

  const signOut = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
