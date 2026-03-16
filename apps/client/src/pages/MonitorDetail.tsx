import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Copy, Check, ShieldCheck } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { toast } from 'sonner'
import {
  useMonitorDetail,
  useMonitorChartLogs,
  useMonitorLogs,
  useMonitorIncidents,
  type CheckLog,
  type Incident,
} from '../hooks/useMonitorDetail'
import AuthLayout from '../components/layout/AuthLayout'
import PageHeader from '../components/shared/PageHeader'
import StatusBadge from '../components/shared/StatusBadge'
import MonitorTypeIcon from '../components/shared/MonitorTypeIcon'
import RefreshButton from '../components/shared/RefreshButton'
import { Button } from '../components/ui/button'

// ── Util ──────────────────────────────────────────────────────────────────────

function fmt(dateStr?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', opts ?? { dateStyle: 'medium', timeStyle: 'short' })
}

function relTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function durationMs(from: string, to?: string | null): string {
  const ms = (to ? new Date(to) : new Date()).getTime() - new Date(from).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function ResponseTimeChart({ monitorId }: { monitorId: string }) {
  const { data: logs, isLoading } = useMonitorChartLogs(monitorId)

  if (isLoading) {
    return <div className="h-48 bg-muted rounded animate-pulse" />
  }
  if (!logs || logs.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-border rounded-lg">
        No data yet
      </div>
    )
  }

  const chartData = logs.map((l) => ({
    time: new Date(l.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    ms: l.responseTime ?? null,
    result: l.result,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} unit="ms" />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(v) => [`${v}ms`, 'Response time']}
        />
        <Line
          type="monotone" dataKey="ms" stroke="hsl(var(--foreground))" strokeWidth={1.5}
          dot={(props) => {
            const { cx, cy, payload } = props as { cx: number; cy: number; payload: { result: string } }
            return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={payload.result === 'up' ? '#22c55e' : '#ef4444'} stroke="none" />
          }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Log table ─────────────────────────────────────────────────────────────────

function LogTable({ monitorId }: { monitorId: string }) {
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [appliedFrom, setAppliedFrom] = useState('')
  const [appliedTo, setAppliedTo] = useState('')

  const { data, isLoading, dataUpdatedAt, refetch, isRefetching } = useMonitorLogs(monitorId, {
    page,
    limit: 50,
    from: appliedFrom || undefined,
    to: appliedTo || undefined,
  })

  function applyFilter() {
    setPage(1)
    setAppliedFrom(from)
    setAppliedTo(to)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">Check Logs</h2>
        <RefreshButton onRefresh={() => refetch()} isRefetching={isRefetching} updatedAt={dataUpdatedAt || null} />
      </div>

      {/* Date filters */}
      <div className="flex gap-3 items-end mb-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Button variant="outline" size="sm" onClick={applyFilter}>Apply</Button>
        {(appliedFrom || appliedTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); setAppliedFrom(''); setAppliedTo('') }}>Clear</Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Timestamp</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Result</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Response time</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(5)].map((__, j) => (
                    <td key={j} className="px-4 py-2.5"><div className="h-4 bg-muted rounded w-3/4" /></td>
                  ))}
                </tr>
              ))
            ) : (data?.logs ?? []).map((log: CheckLog) => (
              <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground text-xs font-mono">{fmt(log.timestamp)}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${log.result === 'up' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${log.result === 'up' ? 'bg-green-500' : 'bg-red-500'}`} />
                    {log.result}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{log.statusCode ?? '—'}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">{log.responseTime != null ? `${log.responseTime}ms` : '—'}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]" title={log.error}>{log.error ?? '—'}</td>
              </tr>
            ))}
            {!isLoading && (!data?.logs || data.logs.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No logs in this range</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
          <span>Page {data.page} of {data.pages} ({data.total} total)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Incidents list ────────────────────────────────────────────────────────────

function IncidentsList({ monitorId }: { monitorId: string }) {
  const { data: incidents, isLoading } = useMonitorIncidents(monitorId)

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-3">Incidents</h2>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Started</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Resolved</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Duration</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Cause</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(4)].map((__, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 bg-muted rounded w-3/4" /></td>)}
                </tr>
              ))
            ) : (incidents ?? []).map((inc: Incident) => (
              <tr key={inc._id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{fmt(inc.startedAt)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{inc.resolvedAt ? fmt(inc.resolvedAt) : <span className="text-red-500">Ongoing</span>}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{durationMs(inc.startedAt, inc.resolvedAt)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">{inc.cause ?? '—'}</td>
              </tr>
            ))}
            {!isLoading && (!incidents || incidents.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No incidents recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MonitorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: monitor, isLoading, dataUpdatedAt, refetch, isRefetching } = useMonitorDetail(id!)

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api/v1'
  const heartbeatUrl = monitor?.type === 'heartbeat' && monitor.heartbeatToken
    ? `${apiBase}/heartbeat/${monitor.heartbeatToken}`
    : null

  return (
    <AuthLayout>
      <PageHeader
        title={isLoading ? 'Loading…' : (monitor?.name ?? 'Monitor')}
        action={
          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={() => refetch()} isRefetching={isRefetching} updatedAt={dataUpdatedAt || null} />
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {monitor && (
              <Button size="sm" onClick={() => navigate(`/monitors/${id}/edit`)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-6">
          <div className="h-20 bg-muted rounded-lg animate-pulse" />
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
        </div>
      ) : !monitor ? (
        <p className="text-muted-foreground">Monitor not found.</p>
      ) : (
        <div className="space-y-8">
          {/* ── Status header ────────────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-start gap-4 justify-between">
              <div className="flex items-center gap-3">
                <MonitorTypeIcon type={monitor.type} className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={monitor.status} />
                    {monitor.lastStatusChangeAt && (
                      <span className="text-xs text-muted-foreground">since {relTime(monitor.lastStatusChangeAt)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {monitor.url ?? monitor.host ?? (monitor.type === 'heartbeat' ? 'Heartbeat monitor' : '')}
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <Stat label="Uptime (24h)" value={monitor.uptimeLast24h != null ? `${monitor.uptimeLast24h}%` : 'N/A'} />
                <Stat label="Last checked" value={relTime(monitor.lastCheckedAt)} />
                <Stat label="Last response" value={monitor.lastResponseTime != null ? `${monitor.lastResponseTime}ms` : '—'} />
                {monitor.lastIncident && !monitor.lastIncident.resolvedAt && (
                  <Stat label="Incident duration" value={durationMs(monitor.lastIncident.startedAt)} highlight />
                )}
              </div>
            </div>
          </div>

          {/* ── Response time chart ──────────────────────────────────────── */}
          {monitor.type !== 'heartbeat' && (
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Response Time</h2>
              <div className="rounded-lg border border-border bg-card p-4">
                <ResponseTimeChart monitorId={id!} />
              </div>
            </section>
          )}

          {/* ── SSL expiry card ───────────────────────────────────────────── */}
          {monitor.type === 'ssl' && monitor.sslState && (
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">SSL Certificate</h2>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Expires {fmt(monitor.sslState.expiresAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const d = daysUntil(monitor.sslState!.expiresAt)
                        if (d <= 0) return <span className="text-red-500">Expired</span>
                        if (d <= 7) return <span className="text-red-500">{d} day{d !== 1 ? 's' : ''} remaining</span>
                        if (d <= 30) return <span className="text-yellow-500">{d} days remaining</span>
                        return <span>{d} days remaining</span>
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last checked: {relTime(monitor.sslState.lastCheckedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Heartbeat inbound URL ──────────────────────────────────── */}
          {heartbeatUrl && (
            <section>
              <h2 className="text-base font-semibold text-foreground mb-3">Ping URL</h2>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  POST or GET this URL to reset the grace-period timer.
                </p>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={heartbeatUrl}
                    className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs font-mono text-muted-foreground focus:outline-none" />
                  <CopyButton text={heartbeatUrl} />
                </div>
              </div>
            </section>
          )}

          {/* ── Log table ─────────────────────────────────────────────────── */}
          <LogTable monitorId={id!} />

          {/* ── Incidents ─────────────────────────────────────────────────── */}
          <IncidentsList monitorId={id!} />
        </div>
      )}
    </AuthLayout>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-red-500' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}
