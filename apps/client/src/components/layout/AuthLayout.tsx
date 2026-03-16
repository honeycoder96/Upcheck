import type { ReactNode } from 'react';
import { useState } from 'react';
import { LayoutDashboard, Monitor, Bell, Users, Settings } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const sidebarItems = [
  { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Monitors', icon: <Monitor className="h-4 w-4" />, href: '/monitors' },
  { label: 'Alert Channels', icon: <Bell className="h-4 w-4" />, href: '/alert-channels' },
  { label: 'Users', icon: <Users className="h-4 w-4" />, href: '/settings/users' },
  { label: 'Org Settings', icon: <Settings className="h-4 w-4" />, href: '/settings/org' },
];

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar showLogout={true} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={sidebarItems} collapsed={collapsed} onToggle={handleToggle} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
