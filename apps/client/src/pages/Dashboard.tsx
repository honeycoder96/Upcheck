import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, TrendingUp, Clock, Zap, AlertTriangle, ExternalLink } from 'lucide-react'
import { useDashboardSummary, useInvalidateDashboard, type DashboardRange } from '../hooks/useDashboardSummary'
import { useMonitors } from '../hooks/useMonitors'
import type { Monitor } from '../hooks/useMonitors'
import { useOrg } from '../hooks/useOrg'
import AuthLayout from '../components/layout/AuthLayout'
import PageHeader from '../components/shared/PageHeader'
import RefreshButton from '../components/shared/RefreshButton'
import StatusBadge from '../components/shared/StatusBadge'
import MonitorTypeIcon from '../components/shared/MonitorTypeIcon'
import { formatDuration } from '../components/shared/DurationFormatter'
import { Button } from '../components/ui/button'

// ── Range tabs ───────────────────────────────────────────────────────────────

const RANGES: { label: string; value: DashboardRange }[] = [
  { label: '1d', value: '1d' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
]

// ── Status pills ─────────────────────────────────────────────────────────────

function StatusPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-6 py-4 min-w-[110px]">
      <span className={`text-2xl font-bold ${color}`}>{count}</span>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  )
}

function StatusBarSkeleton() {
  return (
    <div className="flex gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-[72px] w-[110px] rounded-lg border border-border bg-card animate-pulse" />
      ))}
    </div>
  )
}

// ── Stats cards ──────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  loading?: boolean
}

function StatCard({ icon, label, value, sub, loading }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <div className="h-7 w-24 rounded bg-muted animate-pulse" />
      ) : (
        <div>
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {sub && <span className="ml-2 text-xs text-muted-foreground">{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ── Monitor filter section ───────────────────────────────────────────────────

type MonitorFilter = 'down' | 'paused' | 'all'

const FILTER_OPTIONS: { label: string; value: MonitorFilter }[] = [
  { label: 'Down', value: 'down' },
  { label: 'Paused', value: 'paused' },
  { label: 'All', value: 'all' },
]

function MonitorFilterRow({ monitor }: { monitor: Monitor }) {
  const navigate = useNavigate()
  const target = monitor.url ?? monitor.host

  return (
    <tr
      className="hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/monitors/${monitor._id}`)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <MonitorTypeIcon type={monitor.type} className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">{monitor.name}</span>
        </div>
        {target && (
          <span className="ml-6 text-xs text-muted-foreground font-mono truncate max-w-[200px] block" title={target}>
            {target}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={monitor.status} />
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {monitor.lastCheckedAt ? formatRelativeTime(monitor.lastCheckedAt) : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
      </td>
    </tr>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const [range, setRange] = useState<DashboardRange>('30d')
  const [monitorFilter, setMonitorFilter] = useState<MonitorFilter>('down')

  const { data: org } = useOrg()

  const {
    data: monitors,
    isLoading: monitorsLoading,
    isRefetching,
    dataUpdatedAt,
    refetch: refetchMonitors,
  } = useMonitors()

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useDashboardSummary(range)
  const invalidateDashboard = useInvalidateDashboard()

  function handleRefresh() {
    refetchMonitors()
    refetchSummary()
    invalidateDashboard()
  }

  // Derive counts from monitor list (always fresh from 60s polling)
  const down = monitors?.filter((m) => m.status === 'down').length ?? 0
  const up = monitors?.filter((m) => m.status === 'up').length ?? 0
  const paused = monitors?.filter((m) => m.status === 'paused').length ?? 0
  const total = monitors?.length ?? 0

  // Filtered + top 10 by most-recently-changed status
  const filteredMonitors: Monitor[] = (monitors ?? [])
    .filter((m) => {
      if (monitorFilter === 'down') return m.status === 'down'
      if (monitorFilter === 'paused') return m.status === 'paused'
      return true
    })
    .sort((a, b) => {
      const aTime = a.lastStatusChangeAt ? new Date(a.lastStatusChangeAt).getTime() : 0
      const bTime = b.lastStatusChangeAt ? new Date(b.lastStatusChangeAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 10)

  // Stats values
  const uptimeVal =
    summary?.stats.uptimePercent != null ? `${summary.stats.uptimePercent.toFixed(2)}%` : 'N/A'
  const mtbfVal = summary?.stats.mtbf != null ? formatDuration(summary.stats.mtbf) : 'N/A'
  const streakVal = summary?.stats.longestStreak != null ? formatDuration(summary.stats.longestStreak) : 'N/A'
  const incidentsVal = summary?.stats.incidentCount != null ? String(summary.stats.incidentCount) : 'N/A'

  return (
    <AuthLayout>
      <PageHeader
        title="Dashboard"
        description="Overview of your monitoring infrastructure"
        action={
          <div className="flex items-center gap-2">
            {org?.slug && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={() => window.open(`/status/${org.slug}`, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Status page
              </Button>
            )}
            <RefreshButton
              onRefresh={handleRefresh}
              isRefetching={isRefetching}
              updatedAt={dataUpdatedAt || null}
            />
          </div>
        }
      />

      {/* Status bar */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Current status</h2>
        {monitorsLoading ? (
          <StatusBarSkeleton />
        ) : (
          <div className="flex gap-3 flex-wrap">
            <StatusPill label="Down" count={down} color={down > 0 ? 'text-red-500' : 'text-foreground'} />
            <StatusPill label="Up" count={up} color={up > 0 ? 'text-green-500' : 'text-foreground'} />
            <StatusPill label="Paused" count={paused} color="text-muted-foreground" />
            <StatusPill label="Total" count={total} color="text-foreground" />
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Analytics</h2>
          {/* Range tabs */}
          <div className="flex rounded-md border border-input overflow-hidden text-xs">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  range === r.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Uptime"
            value={uptimeVal}
            loading={summaryLoading}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="MTBF"
            value={mtbfVal}
            sub={summary?.stats.mtbf != null ? 'avg between failures' : undefined}
            loading={summaryLoading}
          />
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label="Longest streak"
            value={streakVal}
            sub={summary?.stats.longestStreak != null ? 'no incidents' : undefined}
            loading={summaryLoading}
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Incidents"
            value={incidentsVal}
            sub={summary?.stats.incidentCount != null ? `in last ${range}` : undefined}
            loading={summaryLoading}
          />
        </div>
      </div>

      {/* Monitor filter section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Monitors</h2>
          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <div className="flex rounded-md border border-input overflow-hidden text-xs">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setMonitorFilter(f.value)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    monitorFilter === f.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {f.label}
                  {f.value === 'down' && down > 0 && (
                    <span className="ml-1 text-red-400">{down}</span>
                  )}
                  {f.value === 'paused' && paused > 0 && (
                    <span className="ml-1">{paused}</span>
                  )}
                  {f.value === 'all' && (
                    <span className="ml-1">{total}</span>
                  )}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('/monitors')}
            >
              View all
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {monitorsLoading ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {[...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(4)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredMonitors.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
            {monitorFilter === 'down'
              ? 'No monitors are currently down.'
              : monitorFilter === 'paused'
              ? 'No monitors are paused.'
              : total === 0
              ? 'No monitors configured yet.'
              : 'No monitors to show.'}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Monitor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last checked</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMonitors.map((m) => (
                  <MonitorFilterRow key={m._id} monitor={m} />
                ))}
              </tbody>
            </table>
            {((monitorFilter === 'all' && total > 10) ||
              (monitorFilter === 'down' && down > 10) ||
              (monitorFilter === 'paused' && paused > 10)) && (
              <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground text-center">
                Showing top 10 —{' '}
                <button
                  onClick={() => navigate('/monitors')}
                  className="underline hover:text-foreground transition-colors"
                >
                  view all {total} monitors
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
