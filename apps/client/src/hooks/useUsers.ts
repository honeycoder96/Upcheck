import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/axios'
import type { CreateUserInput, UpdateUserRoleInput } from '@uptimemonitor/shared/schemas'

export interface OrgUser {
  _id: string
  email: string
  role: 'owner' | 'admin' | 'viewer'
  mustChangePassword: boolean
  createdAt: string
}

export function useUsers() {
  return useQuery<OrgUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get('/users')
      return res.data.data
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserInput) => apiClient.post('/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRoleInput }) =>
      apiClient.put(`/users/${id}/role`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
