import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/axios'
import type { Monitor } from './useMonitors'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Incident {
  _id: string
  monitorId: string
  startedAt: string
  resolvedAt?: string
  cause?: string
}

export interface CheckLog {
  _id: string
  monitorId: string
  timestamp: string
  result: 'up' | 'down'
  responseTime?: number
  statusCode?: number
  error?: string
}

export interface LogsPage {
  logs: CheckLog[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface SslState {
  expiresAt: string
  lastCheckedAt: string
  alertsSent: number[]
}

export interface MonitorDetail extends Monitor {
  lastIncident: Incident | null
  uptimeLast24h: number | null
  sslState?: SslState | null
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useMonitorDetail(monitorId: string) {
  return useQuery({
    queryKey: ['monitor', monitorId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MonitorDetail }>(`/monitors/${monitorId}`)
      return res.data.data
    },
    refetchInterval: 60_000,
    enabled: !!monitorId,
  })
}

export function useMonitorChartLogs(monitorId: string) {
  return useQuery({
    queryKey: ['monitor-chart-logs', monitorId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LogsPage }>(
        `/monitors/${monitorId}/logs?limit=100&page=1`
      )
      // Return in ascending order for the chart
      return [...res.data.data.logs].reverse()
    },
    refetchInterval: 60_000,
    enabled: !!monitorId,
  })
}

export function useMonitorLogs(
  monitorId: string,
  params: { page: number; limit: number; from?: string; to?: string }
) {
  return useQuery({
    queryKey: ['monitor-logs', monitorId, params],
    queryFn: async () => {
      const q = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        ...(params.from ? { from: params.from } : {}),
        ...(params.to ? { to: params.to } : {}),
      })
      const res = await apiClient.get<{ data: LogsPage }>(
        `/monitors/${monitorId}/logs?${q.toString()}`
      )
      return res.data.data
    },
    enabled: !!monitorId,
  })
}

export function useMonitorIncidents(monitorId: string) {
  return useQuery({
    queryKey: ['monitor-incidents', monitorId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Incident[] }>(
        `/monitors/${monitorId}/incidents`
      )
      return res.data.data
    },
    enabled: !!monitorId,
  })
}
