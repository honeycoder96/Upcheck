import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useStatusPageTheme } from '../../stores/statusPageTheme.store'

interface PublicStatusLayoutProps {
  orgName?: string
  children: ReactNode
}

export default function PublicStatusLayout({ orgName, children }: PublicStatusLayoutProps) {
  const { theme, toggleTheme } = useStatusPageTheme()

  // Apply/remove 'dark' class independently of the admin theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            {orgName && (
              <h1 className="text-lg font-semibold text-foreground leading-tight">{orgName}</h1>
            )}
          </div>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          Powered by Uptime Monitor
        </div>
      </footer>
    </div>
  )
}
