import { useAuthStore } from '../stores/auth.store'

type Role = 'viewer' | 'admin' | 'owner'

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  admin: 1,
  owner: 2,
}

export function useRole() {
  const role = (useAuthStore((s) => s.user?.role) ?? 'viewer') as Role
  return {
    role,
    isViewer: ROLE_RANK[role] >= ROLE_RANK['viewer'],
    isAdmin: ROLE_RANK[role] >= ROLE_RANK['admin'],
    isOwner: ROLE_RANK[role] >= ROLE_RANK['owner'],
  }
}
