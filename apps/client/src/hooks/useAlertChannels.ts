import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/axios'

export interface AlertChannelConfig {
  email?: string
  url?: string
  secret?: string
  botToken?: string
  chatId?: string
  slackWebhookUrl?: string
}

export interface AlertChannel {
  _id: string
  orgId: string
  type: 'email' | 'webhook' | 'telegram' | 'slack'
  config: AlertChannelConfig
  monitorIds: string[]
  createdAt: string
  updatedAt: string
}

async function fetchAlertChannels(): Promise<AlertChannel[]> {
  const res = await apiClient.get<{ data: AlertChannel[] }>('/alert-channels')
  return res.data.data ?? []
}

export function useAlertChannels() {
  return useQuery({
    queryKey: ['alert-channels'],
    queryFn: fetchAlertChannels,
  })
}

export function useCreateAlertChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { type: 'email' | 'webhook' | 'telegram' | 'slack'; config: AlertChannelConfig; monitorIds: string[] }) =>
      apiClient.post('/alert-channels', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-channels'] }),
  })
}

export function useUpdateAlertChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { config?: AlertChannelConfig; monitorIds?: string[]; newSecret?: string }
    }) => apiClient.put(`/alert-channels/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-channels'] }),
  })
}

export function useDeleteAlertChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/alert-channels/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-channels'] }),
  })
}

export function useTestAlertChannel() {
  return useMutation({
    mutationFn: (
      data:
        | { type: 'telegram'; config: { botToken: string; chatId: string } }
        | { type: 'slack'; config: { slackWebhookUrl: string } }
    ) => apiClient.post('/alert-channels/test', data),
  })
}
