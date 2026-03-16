import { Sun, Moon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../stores/theme.store';
import { useAuthStore } from '../../stores/auth.store';
import { apiClient } from '../../lib/axios';

interface NavbarProps {
  showLogout?: boolean;
}

export default function Navbar({ showLogout = true }: NavbarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore errors — still clear auth
    } finally {
      useAuthStore.getState().clearAuth();
      navigate('/login');
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
      <a href="/" className="text-lg font-semibold text-foreground tracking-tight">
        Uptime Monitor
      </a>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {showLogout && user && (
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
