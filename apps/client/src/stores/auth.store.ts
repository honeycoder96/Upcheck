import { create } from 'zustand'

export interface AuthUser {
  userId: string
  orgId: string
  role: string
  email: string
  mustChangePassword: boolean
}

interface AuthStore {
  accessToken: string | null
  user: AuthUser | null
  isInitialised: boolean
  setAuth: (accessToken: string, user: AuthUser) => void
  clearAuth: () => void
  setInitialised: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,
  isInitialised: false,
  setAuth: (accessToken, user) => set({ accessToken, user, isInitialised: true }),
  clearAuth: () => set({ accessToken: null, user: null, isInitialised: true }),
  setInitialised: () => set({ isInitialised: true }),
}))
