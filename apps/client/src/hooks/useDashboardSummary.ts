import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/axios'

export type DashboardRange = '1d' | '7d' | '30d'

export interface DashboardSummary {
  currentStatus: {
    down: number
    up: number
    paused: number
  }
  stats: {
    uptimePercent: number | null
    mtbf: number | null           // seconds
    longestStreak: number | null  // seconds
    incidentCount: number
  }
}

async function fetchSummary(range: DashboardRange): Promise<DashboardSummary> {
  const res = await apiClient.get<{ data: DashboardSummary }>(`/dashboard/summary?range=${range}`)
  return res.data.data!
}

export function useDashboardSummary(range: DashboardRange) {
  return useQuery({
    queryKey: ['dashboard-summary', range],
    queryFn: () => fetchSummary(range),
    refetchInterval: 60_000,
  })
}

export function useInvalidateDashboard() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
}
