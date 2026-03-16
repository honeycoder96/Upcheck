import crypto from 'crypto'
import mongoose from 'mongoose'
import { Monitor } from '../models/monitor.model'
import { CheckLog } from '../models/checkLog.model'
import { Incident } from '../models/incident.model'
import { SslState } from '../models/sslState.model'
import { Organisation } from '../models/organisation.model'
import {
  addMonitorJob,
  removeMonitorJob,
  addHeartbeatWatchdog,
  removeHeartbeatWatchdog,
} from '../lib/queue'
import { AppError } from '../middleware/errorHandler'
import { PLAN_LIMIT_REACHED, MONITOR_NOT_FOUND } from '@uptimemonitor/shared/strings'
import type { CreateMonitorInput, UpdateMonitorInput } from '@uptimemonitor/shared/schemas'

// ── Job dispatch helpers ──────────────────────────────────────────────────────

async function scheduleMonitorJob(
  monitorId: string,
  type: string,
  interval: number,
  immediate = false
): Promise<void> {
  if (type === 'heartbeat') {
    await addHeartbeatWatchdog(monitorId, interval)
  } else {
    await addMonitorJob(monitorId, interval, { immediate })
  }
}

async function cancelMonitorJob(monitorId: string, type: string): Promise<void> {
  if (type === 'heartbeat') {
    await removeHeartbeatWatchdog(monitorId)
  } else {
    await removeMonitorJob(monitorId)
  }
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function listMonitors(orgId: string) {
  return Monitor.find({ orgId, visibility: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .lean()
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createMonitor(orgId: string, data: CreateMonitorInput) {
  const [count, org] = await Promise.all([
    Monitor.countDocuments({ orgId, visibility: { $ne: 'deleted' } }),
    Organisation.findById(orgId).lean(),
  ])

  const limit = org?.planLimits?.maxMonitors ?? 20
  if (count >= limit) {
    throw new AppError(
      403,
      PLAN_LIMIT_REACHED,
      `Your plan allows a maximum of ${limit} monitors.`
    )
  }

  const extra: Record<string, unknown> = {}
  if (data.type === 'heartbeat') {
    extra.heartbeatToken = crypto.randomUUID()
  }

  const monitor = await Monitor.create({ ...data, ...extra, orgId, status: 'pending' })
  await scheduleMonitorJob(monitor._id.toString(), monitor.type, monitor.interval, true)

  return monitor.toObject()
}

// ── Get single ───────────────────────────────────────────────────────────────

export async function getMonitor(orgId: string, monitorId: string): Promise<Record<string, unknown>> {
  assertObjectId(monitorId)

  const monitor = await Monitor.findOne({
    _id: monitorId,
    orgId,
    visibility: { $ne: 'deleted' },
  }).lean()

  if (!monitor) throw new AppError(404, MONITOR_NOT_FOUND, 'Monitor not found')

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [lastIncident, logs24h, sslState] = await Promise.all([
    Incident.findOne({ monitorId }).sort({ startedAt: -1 }).lean(),
    CheckLog.find({ monitorId, timestamp: { $gte: since24h } })
      .select('result')
      .lean(),
    monitor.type === 'ssl'
      ? SslState.findOne({ monitorId }).lean()
      : Promise.resolve(null),
  ])

  const uptimeLast24h =
    logs24h.length > 0
      ? Math.round(
          (logs24h.filter((l) => l.result === 'up').length / logs24h.length) * 1000
        ) / 10
      : null

  return {
    ...monitor,
    lastIncident: lastIncident ?? null,
    uptimeLast24h,
    ...(monitor.type === 'ssl' ? { sslState: sslState ?? null } : {}),
  }
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updateMonitor(
  orgId: string,
  monitorId: string,
  data: UpdateMonitorInput
) {
  assertObjectId(monitorId)

  const monitor = await Monitor.findOneAndUpdate(
    { _id: monitorId, orgId, visibility: { $ne: 'deleted' } },
    { $set: data },
    { new: true }
  ).lean()

  if (!monitor) throw new AppError(404, MONITOR_NOT_FOUND, 'Monitor not found')

  if (monitor.status !== 'paused') {
    await scheduleMonitorJob(monitor._id.toString(), monitor.type, monitor.interval)
  }

  return monitor
}

// ── Soft delete ──────────────────────────────────────────────────────────────

export async function deleteMonitor(orgId: string, monitorId: string) {
  assertObjectId(monitorId)

  const monitor = await Monitor.findOneAndUpdate(
    { _id: monitorId, orgId, visibility: { $ne: 'deleted' } },
    { visibility: 'deleted', status: 'paused' },
    { new: true }
  ).lean()

  if (!monitor) throw new AppError(404, MONITOR_NOT_FOUND, 'Monitor not found')

  await cancelMonitorJob(monitorId, monitor.type)
}

// ── Pause ────────────────────────────────────────────────────────────────────

export async function pauseMonitor(orgId: string, monitorId: string) {
  assertObjectId(monitorId)

  const monitor = await Monitor.findOneAndUpdate(
    { _id: monitorId, orgId, visibility: { $ne: 'deleted' }, status: { $ne: 'paused' } },
    { status: 'paused' },
    { new: true }
  ).lean()

  if (!monitor) throw new AppError(404, MONITOR_NOT_FOUND, 'Monitor not found or already paused')

  await cancelMonitorJob(monitorId, monitor.type)

  return monitor
}

// ── Resume ───────────────────────────────────────────────────────────────────

export async function resumeMonitor(orgId: string, monitorId: string) {
  assertObjectId(monitorId)

  const monitor = await Monitor.findOneAndUpdate(
    { _id: monitorId, orgId, visibility: { $ne: 'deleted' }, status: 'paused' },
    { status: 'pending' },
    { new: true }
  ).lean()

  if (!monitor) throw new AppError(404, MONITOR_NOT_FOUND, 'Monitor not found or not paused')

  await scheduleMonitorJob(monitor._id.toString(), monitor.type, monitor.interval, true)

  return monitor
}

// ── Check logs ───────────────────────────────────────────────────────────────

export async function getMonitorLogs(
  orgId: string,
  monitorId: string,
  query: { from?: string; to?: string; limit?: number; page?: number }
) {
  assertObjectId(monitorId)

  const exists = await Monitor.exists({ _id: monitorId, orgId, visibility: { $ne: 'deleted' } })
  if (!exists) throw new AppError(404, MONITOR_NOT_FOUND, 'Monitor not found')

  const limit = Math.min(query.limit ?? 500, 1000)
  const page = Math.max(query.page ?? 1, 1)
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = { monitorId }
  if (query.from || query.to) {
    filter.timestamp = {}
    if (query.from) (filter.timestamp as Record<string, Date>).$gte = new Date(query.from)
    if (query.to) (filter.timestamp as Record<string, Date>).$lte = new Date(query.to)
  }

  const [total, logs] = await Promise.all([
    CheckLog.countDocuments(filter),
    CheckLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
  ])

  return { logs, total, page, limit, pages: Math.ceil(total / limit) }
}

// ── Incidents ────────────────────────────────────────────────────────────────

export async function getMonitorIncidents(orgId: string, monitorId: string) {
  assertObjectId(monitorId)

  const exists = await Monitor.exists({ _id: monitorId, orgId, visibility: { $ne: 'deleted' } })
  if (!exists) throw new AppError(404, MONITOR_NOT_FOUND, 'Monitor not found')

  return Incident.find({ monitorId }).sort({ startedAt: -1 }).lean()
}

// ── Util ─────────────────────────────────────────────────────────────────────

function assertObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(404, MONITOR_NOT_FOUND, 'Monitor not found')
  }
}
