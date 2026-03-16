import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface StatusPageThemeStore {
  theme: Theme
  toggleTheme: () => void
}

const STORAGE_KEY = 'status-theme'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    // SSR / no window
  }
  return 'light'
}

export const useStatusPageTheme = create<StatusPageThemeStore>((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light'
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
    set({ theme: next })
  },
}))
