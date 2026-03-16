import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/axios'
import { STATUS_POLL_INTERVAL_MS } from '@uptimemonitor/shared/constants'
import type { MonitorStatus, MonitorType, VisibilityState, MonitorInterval } from '@uptimemonitor/shared/constants'

export interface Monitor {
  _id: string
  orgId: string
  name: string
  type: MonitorType
  url?: string
  host?: string
  port?: number
  interval: MonitorInterval
  status: MonitorStatus
  visibility: VisibilityState
  heartbeatToken?: string
  lastCheckedAt?: string
  lastStatusChangeAt?: string
  lastResponseTime?: number
  createdAt: string
  updatedAt: string
}

async function fetchMonitors(): Promise<Monitor[]> {
  const res = await apiClient.get<{ data: Monitor[] }>('/monitors')
  return res.data.data
}

export function useMonitors() {
  return useQuery({
    queryKey: ['monitors'],
    queryFn: fetchMonitors,
    refetchInterval: STATUS_POLL_INTERVAL_MS,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function usePauseMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (monitorId: string) => apiClient.post(`/monitors/${monitorId}/pause`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitors'] }),
  })
}

export function useResumeMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (monitorId: string) => apiClient.post(`/monitors/${monitorId}/resume`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitors'] }),
  })
}

export function useDeleteMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (monitorId: string) => apiClient.delete(`/monitors/${monitorId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitors'] }),
  })
}
