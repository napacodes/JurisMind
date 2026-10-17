'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, api } from '@/lib/api'
import type { CurrentUser, WorkspaceMembership } from '@/lib/api'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error'
type AuthContextValue = {
  state: AuthState
  user: CurrentUser | null
  workspaces: WorkspaceMembership[]
  refresh: () => Promise<void>
  clear: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([])

  const clear = useCallback(() => {
    setUser(null)
    setWorkspaces([])
    setState('unauthenticated')
  }, [])

  const refresh = useCallback(async () => {
    setState('loading')
    try {
      const current = await api.currentUser()
      const memberships = await api.workspaces()
      setUser(current.user)
      setWorkspaces(memberships)
      setState('authenticated')
    } catch (error) {
      setUser(null)
      setWorkspaces([])
      setState(error instanceof ApiError && error.status === 401 ? 'unauthenticated' : 'error')
      throw error
    }
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const current = await api.currentUser()
        const memberships = await api.workspaces()
        if (!active) return
        setUser(current.user)
        setWorkspaces(memberships)
        setState('authenticated')
      } catch (error) {
        if (!active) return
        setUser(null)
        setWorkspaces([])
        setState(error instanceof ApiError && error.status === 401 ? 'unauthenticated' : 'error')
      }
    })()
    return () => { active = false }
  }, [])

  const value = useMemo(() => ({ state, user, workspaces, refresh, clear }), [state, user, workspaces, refresh, clear])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider.')
  return value
}
