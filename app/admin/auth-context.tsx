'use client'

import { createContext, useContext } from 'react'

// ==================== 认证上下文类型 ====================
export interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  login: (password: string) => Promise<boolean>
  logout: () => void
}

// ==================== 认证上下文 ====================
export const AuthContext = createContext<AuthContextType | null>(null)

// ==================== Hook ====================
export function useAdminAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminLayout')
  }
  return context
}

