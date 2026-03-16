import { useEffect, useRef } from 'react'
import { apiClient } from '../lib/axios'
import { useAuthStore, AuthUser } from '../stores/auth.store'

export function useInitialiseAuth() {
  const { isInitialised, setAuth, clearAuth } = useAuthStore()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    apiClient
      .post('/auth/refresh')
      .then((res) => {
        const { accessToken, user } = res.data.data as { accessToken: string; user: AuthUser }
        setAuth(accessToken, user)
      })
      .catch(() => {
        clearAuth()
      })
  }, [])
}
