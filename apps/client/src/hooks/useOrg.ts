import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/axios'
import type { UpdateOrgInput } from '@uptimemonitor/shared/schemas'

export interface Org {
  _id: string
  name: string
  slug: string
  plan: string
  planLimits: { maxMonitors: number }
  createdAt: string
  updatedAt: string
}

export function useOrg() {
  return useQuery<Org>({
    queryKey: ['org'],
    queryFn: async () => {
      const res = await apiClient.get('/org')
      return res.data.data
    },
  })
}

export function useUpdateOrg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateOrgInput) => apiClient.patch('/org', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org'] }),
  })
}
