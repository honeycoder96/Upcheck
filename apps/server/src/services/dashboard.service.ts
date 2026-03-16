import { Monitor } from '../models/monitor.model'
import { CheckLog } from '../models/checkLog.model'
import { Incident } from '../models/incident.model'

type Range = '1d' | '7d' | '30d'

function windowStart(range: Range): Date {
  const ms = range === '1d' ? 86_400_000 : range === '7d' ? 7 * 86_400_000 : 30 * 86_400_000
  return new Date(Date.now() - ms)
}

export async function getDashboardSummary(orgId: string, range: Range) {
  const from = windowStart(range)
  const now = new Date()
  const windowSecs = Math.floor((now.getTime() - from.getTime()) / 1000)

  // ── currentStatus — live snapshot ────────────────────────────────────────

  const monitors = await Monitor.find({
    orgId,
    visibility: { $ne: 'deleted' },
  })
    .select('status')
    .lean()

  const currentStatus = {
    down: monitors.filter((m) => m.status === 'down').length,
    up: monitors.filter((m) => m.status === 'up').length,
    paused: monitors.filter((m) => m.status === 'paused').length,
  }

  // ── uptimePercent ─────────────────────────────────────────────────────────
  // Across all non-paused, non-deleted monitors in window

  const logs = await CheckLog.find({
    orgId,
    timestamp: { $gte: from },
  })
    .select('result')
    .lean()

  const uptimePercent =
    logs.length > 0
      ? Math.round((logs.filter((l) => l.result === 'up').length / logs.length) * 10_000) / 100
      : null

  // ── incidentCount ─────────────────────────────────────────────────────────

  const incidentCount = await Incident.countDocuments({
    orgId,
    startedAt: { $gte: from },
  })

  // ── mtbf ─────────────────────────────────────────────────────────────────
  // Window duration / number of incidents. null if 0 incidents.

  const mtbf = incidentCount > 0 ? Math.floor(windowSecs / incidentCount) : null

  // ── longestStreak ─────────────────────────────────────────────────────────
  // Longest continuous gap within the window where no incident was open.
  // null if no check data exists.

  const longestStreak = logs.length > 0 ? await computeLongestStreak(orgId, from, now) : null

  return {
    currentStatus,
    stats: {
      uptimePercent,
      mtbf,
      longestStreak,
      incidentCount,
    },
  }
}

async function computeLongestStreak(orgId: string, from: Date, now: Date): Promise<number> {
  // Fetch all incidents that overlap with the window
  const incidents = await Incident.find({
    orgId,
    startedAt: { $lte: now },
    $or: [{ resolvedAt: null }, { resolvedAt: { $gte: from } }],
  })
    .select('startedAt resolvedAt')
    .lean()

  if (incidents.length === 0) {
    // No incidents at all — streak = full window
    return Math.floor((now.getTime() - from.getTime()) / 1000)
  }

  // Clip each incident to the window and collect as [start, end] intervals in ms
  type Interval = [number, number]
  const intervals: Interval[] = incidents.map((inc) => {
    const start = Math.max(inc.startedAt.getTime(), from.getTime())
    const end = inc.resolvedAt ? Math.min(inc.resolvedAt.getTime(), now.getTime()) : now.getTime()
    return [start, end]
  })

  // Merge overlapping intervals
  intervals.sort((a, b) => a[0] - b[0])
  const merged: Interval[] = []
  for (const [s, e] of intervals) {
    if (merged.length === 0 || s > merged[merged.length - 1][1]) {
      merged.push([s, e])
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e)
    }
  }

  // Compute gaps: [from → first incident], [between incidents], [last incident → now]
  let longestGapMs = 0

  // Gap before first incident
  longestGapMs = Math.max(longestGapMs, merged[0][0] - from.getTime())

  // Gaps between incidents
  for (let i = 1; i < merged.length; i++) {
    longestGapMs = Math.max(longestGapMs, merged[i][0] - merged[i - 1][1])
  }

  // Gap after last incident
  longestGapMs = Math.max(longestGapMs, now.getTime() - merged[merged.length - 1][1])

  return Math.floor(longestGapMs / 1000)
}
