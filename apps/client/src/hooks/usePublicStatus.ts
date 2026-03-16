import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const publicApi = axios.create({ baseURL: '/api/v1' })

export interface PublicMonitor {
  _id: string
  name: string
  type: string
  status: 'up' | 'down' | 'paused' | 'pending'
  lastCheckedAt: string | null
  uptimeLast30d: number | null
  dailyHistory: Array<{ date: string; status: 'up' | 'down' | null }>
}

export interface PublicStatusData {
  org: { name: string; slug: string }
  monitors: PublicMonitor[]
}

export function usePublicStatus(slug: string) {
  return useQuery<PublicStatusData>({
    queryKey: ['public-status', slug],
    queryFn: async () => {
      const res = await publicApi.get(`/status/${slug}`)
      return res.data.data
    },
    refetchInterval: 60_000,
    retry: 1,
    enabled: !!slug,
  })
}

export interface PublicIncident {
  _id: string
  monitorName: string
  cause: string | null
  startedAt: string
  resolvedAt: string | null
  durationSecs: number | null
}

export interface PublicSummaryData {
  overallStatus: 'operational' | 'partial_outage' | 'major_outage'
  stats: {
    uptimePercent: number | null
    incidentCount: number
    downCount: number
    upCount: number
    pausedCount: number
    totalCount: number
  }
  recentIncidents: PublicIncident[]
}

export function usePublicSummary(slug: string) {
  return useQuery<PublicSummaryData>({
    queryKey: ['public-summary', slug],
    queryFn: async () => {
      const res = await publicApi.get(`/status/${slug}/summary`)
      return res.data.data
    },
    refetchInterval: 60_000,
    retry: 1,
    enabled: !!slug,
  })
}
