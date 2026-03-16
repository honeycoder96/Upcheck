import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import NotFound from './pages/NotFound';
import { useInitialiseAuth } from './hooks/useInitialiseAuth';
import { useAuthStore } from './stores/auth.store';
import { AuthGuard } from './components/shared/AuthGuard';
import LoginPage from './pages/Login';
import ChangePasswordPage from './pages/ChangePassword';
import StatusPage from './pages/StatusPage';
import Dashboard from './pages/Dashboard';
import MonitorList from './pages/MonitorList';
import MonitorCreate from './pages/MonitorCreate';
import MonitorEdit from './pages/MonitorEdit';
import MonitorDetail from './pages/MonitorDetail';
import AlertChannels from './pages/AlertChannels';
import UserManagement from './pages/UserManagement';
import OrgSettings from './pages/OrgSettings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AppBootstrap({ children }: { children: React.ReactNode }) {
  useInitialiseAuth()
  const isInitialised = useAuthStore(s => s.isInitialised)
  if (!isInitialised) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-4 h-4 rounded-full bg-foreground animate-pulse" />
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public status page — no auth bootstrap needed */}
          <Route path="/status/:orgSlug" element={<StatusPage />} />

          {/* All other routes go through auth bootstrap */}
          <Route
            path="*"
            element={
              <AppBootstrap>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  <Route element={<AuthGuard />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/monitors" element={<MonitorList />} />
                    <Route path="/monitors/new" element={<MonitorCreate />} />
                    <Route path="/monitors/:id" element={<MonitorDetail />} />
                    <Route path="/monitors/:id/edit" element={<MonitorEdit />} />
                    <Route path="/alert-channels" element={<AlertChannels />} />
                    <Route path="/settings/users" element={<UserManagement />} />
                    <Route path="/settings/org" element={<OrgSettings />} />
                  </Route>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/change-password" element={<ChangePasswordPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppBootstrap>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
