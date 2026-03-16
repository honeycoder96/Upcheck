import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'

export function AuthGuard() {
  const { user, isInitialised } = useAuthStore()

  if (!isInitialised) {
    return null // AppBootstrap handles the loading state
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  return <Outlet />
}
