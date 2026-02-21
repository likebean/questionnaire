'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { authApi } from '@/services/api'
import type { CurrentUserVO } from '@/services/api'

interface AuthContextType {
  user: CurrentUserVO | null
  loading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUserVO | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname?.startsWith('/auth/login') ?? false

  const refreshUser = useCallback(async () => {
    if (isLoginPage) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await authApi.getCurrentUser()
      if (res.code === 200 && res.data) {
        setUser(res.data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [isLoginPage])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {}
    setUser(null)
    router.replace('/auth/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
