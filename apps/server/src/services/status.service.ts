import { Organisation } from '../models/organisation.model'
import { Monitor } from '../models/monitor.model'
import { CheckLog } from '../models/checkLog.model'
import { Incident } from '../models/incident.model'
import { AppError } from '../middleware/errorHandler'
import { ORG_NOT_FOUND } from '@uptimemonitor/shared/strings'

const STATUS_ORDER: Record<string, number> = { down: 0, up: 1, pending: 2, paused: 3 }

// ── Monitors list ─────────────────────────────────────────────────────────────

export async function getPublicStatus(slug: string) {
  const org = await Organisation.findOne({ slug: slug.toLowerCase() }).lean()
  if (!org) throw new AppError(404, ORG_NOT_FOUND, 'Organisation not found')

  const monitors = await Monitor.find({
    orgId: org._id,
    visibility: 'visible',
  })
    .select('_id name type status lastCheckedAt createdAt')
    .lean()

  if (monitors.length === 0) {
    return {
      org: { name: org.name, slug: org.slug },
      monitors: [],
    }
  }

  // Compute per-monitor uptime % for the last 30 days and 90-day daily history in parallel
  const since30d = new Date(Date.now() - 30 * 86_400_000)
  const since90d = new Date(Date.now() - 90 * 86_400_000)
  const monitorIds = monitors.map((m) => m._id)

  const [uptimeAgg, dailyAgg] = await Promise.all([
    CheckLog.aggregate<{ _id: string; total: number; up: number }>([
      {
        $match: {
          monitorId: { $in: monitorIds },
          timestamp: { $gte: since30d },
        },
      },
      {
        $group: {
          _id: { $toString: '$monitorId' },
          total: { $sum: 1 },
          up: {
            $sum: { $cond: [{ $eq: ['$result', 'up'] }, 1, 0] },
          },
        },
      },
    ]),
    CheckLog.aggregate<{ _id: { monitorId: string; date: string }; hasUp: number; hasDown: number }>([
      { $match: { monitorId: { $in: monitorIds }, timestamp: { $gte: since90d } } },
      {
        $group: {
          _id: {
            monitorId: { $toString: '$monitorId' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          },
          hasUp:   { $max: { $cond: [{ $eq: ['$result', 'up'] },   1, 0] } },
          hasDown: { $max: { $cond: [{ $eq: ['$result', 'down'] }, 1, 0] } },
        },
      },
    ]),
  ])

  const uptimeByMonitorId = new Map(
    uptimeAgg.map((row) => [
      row._id,
      row.total > 0 ? Math.round((row.up / row.total) * 100_000) / 1_000 : null,
    ])
  )

  // Build Map<monitorId, Map<dateStr, 'up'|'down'>>
  const dailyByMonitorId = new Map<string, Map<string, 'up' | 'down'>>()
  for (const row of dailyAgg) {
    const { monitorId, date } = row._id
    if (!dailyByMonitorId.has(monitorId)) dailyByMonitorId.set(monitorId, new Map())
    const dayStatus: 'up' | 'down' = row.hasUp === 1 ? 'up' : 'down'
    dailyByMonitorId.get(monitorId)!.set(date, dayStatus)
  }

  // Sort: status priority then createdAt asc
  const sorted = [...monitors].sort((a, b) => {
    const rankA = STATUS_ORDER[a.status] ?? 99
    const rankB = STATUS_ORDER[b.status] ?? 99
    if (rankA !== rankB) return rankA - rankB
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return {
    org: { name: org.name, slug: org.slug },
    monitors: sorted.map((m) => {
      const midStr = m._id.toString()
      const dayMap = dailyByMonitorId.get(midStr)

      const dailyHistory: Array<{ date: string; status: 'up' | 'down' | null }> = []
      for (let i = 89; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000)
        const dateStr = d.toISOString().slice(0, 10)
        dailyHistory.push({ date: dateStr, status: dayMap?.get(dateStr) ?? null })
      }

      return {
        _id: m._id,
        name: m.name,
        type: m.type,
        status: m.status,
        lastCheckedAt: m.lastCheckedAt ?? null,
        uptimeLast30d: uptimeByMonitorId.get(midStr) ?? null,
        dailyHistory,
      }
    }),
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

export async function getPublicSummary(slug: string) {
  const org = await Organisation.findOne({ slug: slug.toLowerCase() }).lean()
  if (!org) throw new AppError(404, ORG_NOT_FOUND, 'Organisation not found')

  const monitors = await Monitor.find({
    orgId: org._id,
    visibility: 'visible',
  })
    .select('_id status')
    .lean()

  const total = monitors.length
  const downCount = monitors.filter((m) => m.status === 'down').length

  const overallStatus =
    downCount === 0
      ? 'operational'
      : downCount / total < 0.5
      ? 'partial_outage'
      : 'major_outage'

  const since30d = new Date(Date.now() - 30 * 86_400_000)

  // Org-level uptime % (visible monitors only, last 30d)
  const monitorIds = monitors.map((m) => m._id)

  const [logs, incidentCount, recentIncidentsRaw] = await Promise.all([
    monitorIds.length > 0
      ? CheckLog.find({
          monitorId: { $in: monitorIds },
          timestamp: { $gte: since30d },
        })
          .select('result')
          .lean()
      : Promise.resolve([]),

    Incident.countDocuments({
      orgId: org._id,
      monitorId: { $in: monitorIds },
      startedAt: { $gte: since30d },
    }),

    Incident.find({
      orgId: org._id,
      monitorId: { $in: monitorIds },
    })
      .sort({ startedAt: -1 })
      .limit(10)
      .populate<{ monitorId: { _id: string; name: string } }>('monitorId', 'name')
      .lean(),
  ])

  const uptimePercent =
    logs.length > 0
      ? Math.round((logs.filter((l) => l.result === 'up').length / logs.length) * 10_000) / 100
      : null

  const recentIncidents = recentIncidentsRaw.map((inc) => {
    const monitorName =
      inc.monitorId && typeof inc.monitorId === 'object' && 'name' in inc.monitorId
        ? (inc.monitorId as unknown as { name: string }).name
        : 'Unknown'

    const durationSecs =
      inc.resolvedAt
        ? Math.floor((inc.resolvedAt.getTime() - inc.startedAt.getTime()) / 1000)
        : null

    return {
      _id: inc._id,
      monitorName,
      cause: inc.cause ?? null,
      startedAt: inc.startedAt,
      resolvedAt: inc.resolvedAt ?? null,
      durationSecs,
    }
  })

  return {
    overallStatus,
    stats: {
      uptimePercent,
      incidentCount,
      downCount,
      upCount: monitors.filter((m) => m.status === 'up').length,
      pausedCount: monitors.filter((m) => m.status === 'paused').length,
      totalCount: total,
    },
    recentIncidents,
  }
}
