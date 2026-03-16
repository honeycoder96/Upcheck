import { useParams } from 'react-router-dom'
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import {
  usePublicStatus,
  usePublicSummary,
  type PublicMonitor,
  type PublicIncident,
} from '../hooks/usePublicStatus'
import PublicStatusLayout from '../components/layout/PublicStatusLayout'
import MonitorTypeIcon from '../components/shared/MonitorTypeIcon'

// ── Overall status banner ─────────────────────────────────────────────────────

type OverallStatus = 'operational' | 'partial_outage' | 'major_outage'

const OVERALL_CONFIG: Record<
  OverallStatus,
  { bg: string; border: string; icon: React.ReactNode; text: string; textColor: string }
> = {
  operational: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />,
    text: 'All systems operational',
    textColor: 'text-green-800 dark:text-green-300',
  },
  partial_outage: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    text: 'Partial outage',
    textColor: 'text-amber-800 dark:text-amber-300',
  },
  major_outage: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    text: 'Major outage',
    textColor: 'text-red-800 dark:text-red-300',
  },
}

function OverallStatusBanner({ status }: { status: OverallStatus }) {
  const cfg = OVERALL_CONFIG[status]
  return (
    <div className={`flex items-center gap-3 rounded-lg border ${cfg.border} ${cfg.bg} px-5 py-4 mb-6`}>
      {cfg.icon}
      <span className={`text-base font-semibold ${cfg.textColor}`}>{cfg.text}</span>
    </div>
  )
}

// ── Stats row ─────────────────────────────────────────────────────────────────

function StatsRow({
  uptime,
  incidents,
}: {
  uptime: number | null
  incidents: number
}) {
  return (
    <div className="flex gap-3 mb-6 flex-wrap">
      <div className="rounded-lg border border-border bg-card px-5 py-3 min-w-[130px]">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          30d uptime
        </p>
        <p className="text-xl font-bold text-foreground">
          {uptime != null ? `${uptime.toFixed(2)}%` : 'N/A'}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card px-5 py-3 min-w-[130px]">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Incidents (30d)
        </p>
        <p className="text-xl font-bold text-foreground">{incidents}</p>
      </div>
    </div>
  )
}

// ── UptimeBar ─────────────────────────────────────────────────────────────────

function UptimeBar({ history }: { history: PublicMonitor['dailyHistory'] }) {
  return (
    <div className="flex items-end gap-px overflow-hidden h-7">
      {history.map((entry) => {
        const color =
          entry.status === 'up'
            ? 'bg-green-500'
            : entry.status === 'down'
            ? 'bg-red-500'
            : 'bg-border'
        const label =
          entry.status === 'up'
            ? 'Up'
            : entry.status === 'down'
            ? 'Down'
            : 'No data'
        return (
          <span
            key={entry.date}
            className={`${color} shrink-0 rounded-sm`}
            style={{ width: 3, height: 28 }}
            title={`${entry.date}: ${label}`}
          />
        )
      })}
    </div>
  )
}

// ── StatusDot ─────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: PublicMonitor['status'] }) {
  const cfg = {
    up:      { dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400', label: 'Up' },
    down:    { dot: 'bg-red-500',   text: 'text-red-600 dark:text-red-400',     label: 'Down' },
    paused:  { dot: 'bg-border',    text: 'text-muted-foreground',               label: 'Paused' },
    pending: { dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', label: 'Pending' },
  }[status] ?? { dot: 'bg-border', text: 'text-muted-foreground', label: status }

  return (
    <div className="flex items-center gap-1.5 shrink-0 w-20 justify-end">
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
    </div>
  )
}

// ── Monitor row ───────────────────────────────────────────────────────────────

function MonitorRow({ monitor }: { monitor: PublicMonitor }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
      <div className="w-44 shrink-0 flex items-center gap-1.5 min-w-0">
        <MonitorTypeIcon type={monitor.type} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground truncate">{monitor.name}</span>
        <span className="text-muted-foreground text-xs shrink-0">→</span>
      </div>
      <span className="w-20 shrink-0 text-sm font-medium text-green-500 tabular-nums">
        {monitor.uptimeLast30d != null ? `${monitor.uptimeLast30d.toFixed(3)}%` : '—'}
      </span>
      <div className="flex-1 min-w-0">
        <UptimeBar history={monitor.dailyHistory} />
      </div>
      <StatusDot status={monitor.status} />
    </div>
  )
}

// ── Incident row ──────────────────────────────────────────────────────────────

function IncidentRow({ incident }: { incident: PublicIncident }) {
  const duration = incident.durationSecs != null
    ? formatDuration(incident.durationSecs)
    : 'Ongoing'
  const isOngoing = incident.resolvedAt == null

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 text-sm font-medium text-foreground">{incident.monitorName}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{formatAbsoluteTime(incident.startedAt)}</td>
      <td className="px-4 py-3">
        {isOngoing ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Ongoing
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Resolved
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{duration}</td>
      {incident.cause && (
        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]" title={incident.cause}>
          {incident.cause}
        </td>
      )}
    </tr>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-14 rounded-lg bg-muted" />
      <div className="flex gap-3">
        <div className="h-16 w-32 rounded-lg bg-muted" />
        <div className="h-16 w-32 rounded-lg bg-muted" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="h-4 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatusPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const slug = orgSlug ?? ''

  const {
    data: statusData,
    isLoading: statusLoading,
    dataUpdatedAt,
    refetch: refetchStatus,
  } = usePublicStatus(slug)
  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = usePublicSummary(slug)

  const isLoading = statusLoading || summaryLoading

  function handleRefresh() {
    refetchStatus()
    refetchSummary()
  }

  return (
    <PublicStatusLayout orgName={statusData?.org.name}>
      {isLoading ? (
        <Skeleton />
      ) : !statusData || !summaryData ? (
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Status page not found.</p>
        </div>
      ) : (
        <>
          {/* Overall status banner */}
          <OverallStatusBanner status={summaryData.overallStatus} />

          {/* Stats row */}
          <StatsRow
            uptime={summaryData.stats.uptimePercent}
            incidents={summaryData.stats.incidentCount}
          />

          {/* Monitor list */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Services
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {dataUpdatedAt ? (
                  <span>Updated {formatRelativeTime(new Date(dataUpdatedAt).toISOString())}</span>
                ) : null}
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
              </div>
            </div>

            {statusData.monitors.length === 0 ? (
              <div className="rounded-lg border border-border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
                No monitors are publicly visible.
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {statusData.monitors.map((m) => (
                  <MonitorRow key={m._id} monitor={m} />
                ))}
              </div>
            )}
          </section>

          {/* Recent incidents */}
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Recent incidents
            </h2>
            {summaryData.recentIncidents.length === 0 ? (
              <div className="rounded-lg border border-border bg-card px-6 py-6 text-center text-sm text-muted-foreground">
                No incidents in the last 30 days.
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Monitor</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Started</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.recentIncidents.map((inc) => (
                      <IncidentRow key={inc._id as string} incident={inc} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </PublicStatusLayout>
  )
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatAbsoluteTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
