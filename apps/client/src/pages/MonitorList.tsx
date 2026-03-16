import { useNavigate } from 'react-router-dom'
import { Monitor, Plus, Pause, Play, Trash2, Pencil, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useMonitors, usePauseMonitor, useResumeMonitor, useDeleteMonitor } from '../hooks/useMonitors'
import type { Monitor as IMonitor } from '../hooks/useMonitors'
import { useOrg } from '../hooks/useOrg'
import AuthLayout from '../components/layout/AuthLayout'
import PageHeader from '../components/shared/PageHeader'
import StatusBadge from '../components/shared/StatusBadge'
import EmptyState from '../components/shared/EmptyState'
import RefreshButton from '../components/shared/RefreshButton'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import MonitorTypeIcon from '../components/shared/MonitorTypeIcon'
import { Button } from '../components/ui/button'

function MonitorRowSkeleton() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-muted rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  return `${minutes / 60}h`
}

function MonitorTarget({ monitor }: { monitor: IMonitor }) {
  const target = monitor.url ?? monitor.host
  if (!target) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] block" title={target}>
      {target}
    </span>
  )
}

export default function MonitorList() {
  const navigate = useNavigate()
  const { data: monitors, isLoading, isRefetching, dataUpdatedAt, refetch } = useMonitors()
  const { data: org } = useOrg()
  const pauseMutation = usePauseMonitor()
  const resumeMutation = useResumeMonitor()
  const deleteMutation = useDeleteMonitor()

  const monitorCount = monitors?.length ?? 0
  const maxMonitors = org?.planLimits.maxMonitors ?? 20
  const atLimit = monitorCount >= maxMonitors

  const handlePause = async (id: string) => {
    try {
      await pauseMutation.mutateAsync(id)
    } catch {
      toast.error('Failed to pause monitor')
    }
  }

  const handleResume = async (id: string) => {
    try {
      await resumeMutation.mutateAsync(id)
    } catch {
      toast.error('Failed to resume monitor')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Monitor deleted')
    } catch {
      toast.error('Failed to delete monitor')
    }
  }

  return (
    <AuthLayout>
      <PageHeader
        title="Monitors"
        description="View and manage all your uptime monitors"
        action={
          <div className="flex items-center gap-3">
            <RefreshButton
              onRefresh={() => refetch()}
              isRefetching={isRefetching}
              updatedAt={dataUpdatedAt || null}
            />
            <Button onClick={() => navigate('/monitors/new')} size="sm">
              <Plus className="h-4 w-4" />
              Add Monitor
            </Button>
          </div>
        }
      />

      {atLimit && !isLoading && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            You've reached the limit of <strong>{maxMonitors}</strong> monitors on your current plan. Remove an existing monitor to add a new one.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Monitor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Interval</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Checked</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...Array(4)].map((_, i) => <MonitorRowSkeleton key={i} />)}
            </tbody>
          </table>
        </div>
      ) : !monitors || monitors.length === 0 ? (
        <EmptyState
          icon={<Monitor className="h-10 w-10" />}
          title="No monitors yet"
          description="Add your first monitor to start tracking uptime."
          action={{ label: 'Add Monitor', onClick: () => navigate('/monitors/new') }}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Monitor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Interval</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Checked</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monitors.map((monitor) => (
                <MonitorRow
                  key={monitor._id}
                  monitor={monitor}
                  onView={() => navigate(`/monitors/${monitor._id}`)}
                  onEdit={() => navigate(`/monitors/${monitor._id}/edit`)}
                  onPause={() => handlePause(monitor._id)}
                  onResume={() => handleResume(monitor._id)}
                  onDelete={() => handleDelete(monitor._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AuthLayout>
  )
}

interface MonitorRowProps {
  monitor: IMonitor
  onView: () => void
  onEdit: () => void
  onPause: () => void
  onResume: () => void
  onDelete: () => void
}

function MonitorRow({ monitor, onView, onEdit, onPause, onResume, onDelete }: MonitorRowProps) {
  const isPaused = monitor.status === 'paused'

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <button
          onClick={onView}
          className="flex items-center gap-2 text-left hover:text-primary transition-colors"
        >
          <MonitorTypeIcon type={monitor.type} className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground">{monitor.name}</span>
        </button>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={monitor.status} />
      </td>
      <td className="px-4 py-3">
        <MonitorTarget monitor={monitor} />
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatInterval(monitor.interval)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatRelativeTime(monitor.lastCheckedAt)}
        {monitor.lastResponseTime != null && (
          <span className="ml-1 text-xs">({monitor.lastResponseTime}ms)</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onEdit} title="Edit"
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Pencil className="h-4 w-4" />
          </button>
          {isPaused ? (
            <button
              onClick={onResume}
              title="Resume"
              className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Play className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onPause}
              title="Pause"
              className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          <ConfirmDialog
            title="Delete monitor?"
            description={`"${monitor.name}" will be permanently removed. This cannot be undone.`}
            onConfirm={onDelete}
          >
            <button
              title="Delete"
              className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </ConfirmDialog>
        </div>
      </td>
    </tr>
  )
}
