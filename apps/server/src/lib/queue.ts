import { Queue, type ConnectionOptions } from 'bullmq'
import { config } from './config'
import { logger } from './logger'
import { Monitor } from '../models/monitor.model'

function getBullMQConnection(): ConnectionOptions {
  const url = new URL(config.REDIS_URI)
  const opts: ConnectionOptions = {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
  if (url.password) (opts as Record<string, unknown>).password = decodeURIComponent(url.password)
  const db = url.pathname.replace(/^\//, '')
  if (db) (opts as Record<string, unknown>).db = parseInt(db, 10)
  return opts
}

export const monitorChecksQueue = new Queue('monitor-checks', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 100 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
})

export const alertDispatchQueue = new Queue('alert-dispatch', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
})

export const sslChecksQueue = new Queue('ssl-checks', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 50 },
  },
})

export const heartbeatWatchdogQueue = new Queue('heartbeat-watchdog', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 50 },
  },
})

// ── monitor-checks helpers ────────────────────────────────────────────────────

export async function addMonitorJob(
  monitorId: string,
  intervalMinutes: number,
  opts: { immediate?: boolean } = {}
): Promise<void> {
  await removeMonitorJob(monitorId)
  // Repeatable job fires every N minutes
  await monitorChecksQueue.add(
    `check:${monitorId}`,
    { monitorId },
    { repeat: { every: intervalMinutes * 60 * 1000 } }
  )
  // Immediate one-shot so the monitor doesn't wait a full interval before its first check
  if (opts.immediate) {
    await monitorChecksQueue.add(`check:${monitorId}:immediate`, { monitorId })
  }
}

export async function removeMonitorJob(monitorId: string): Promise<void> {
  const jobs = await monitorChecksQueue.getRepeatableJobs()
  const target = `check:${monitorId}`
  for (const job of jobs) {
    if (job.name === target) {
      await monitorChecksQueue.removeRepeatableByKey(job.key)
    }
  }
}

// ── heartbeat-watchdog helpers ────────────────────────────────────────────────

/**
 * Add a delayed watchdog job for a heartbeat monitor.
 * If a job with the same jobId already exists (e.g. after server restart),
 * BullMQ will not create a duplicate — the existing timer keeps running.
 */
export async function addHeartbeatWatchdog(
  monitorId: string,
  intervalMinutes: number
): Promise<void> {
  await heartbeatWatchdogQueue.add(
    'watchdog',
    { monitorId },
    {
      jobId: `watchdog:${monitorId}`,
      delay: intervalMinutes * 60 * 1000,
    }
  )
}

/**
 * Remove the watchdog job for a heartbeat monitor.
 * Called when a ping arrives (to reset the timer) or when pausing/deleting.
 */
export async function removeHeartbeatWatchdog(monitorId: string): Promise<void> {
  const job = await heartbeatWatchdogQueue.getJob(`watchdog:${monitorId}`)
  if (job) await job.remove()
}

// ── SSL daily cron ────────────────────────────────────────────────────────────

export async function setupSslDailyCron(): Promise<void> {
  // Cron: 2 AM UTC every day
  await sslChecksQueue.add(
    'ssl-daily',
    {},
    {
      jobId: 'ssl-daily-cron',
      repeat: { pattern: '0 2 * * *' },
    }
  )
}

// ── Startup reconciliation ────────────────────────────────────────────────────

export async function reconcileMonitorJobs(): Promise<void> {
  const monitors = await Monitor.find({
    visibility: { $ne: 'deleted' },
    status: { $ne: 'paused' },
  })
    .select('_id interval type')
    .lean()

  const nonHeartbeat = monitors.filter((m) => m.type !== 'heartbeat')
  const heartbeats = monitors.filter((m) => m.type === 'heartbeat')

  // ── monitor-checks: repeatable jobs ──────────────────────────────────────
  const activeCheckIds = new Set(nonHeartbeat.map((m) => m._id.toString()))

  for (const m of nonHeartbeat) {
    await addMonitorJob(m._id.toString(), m.interval)
  }

  const existingRepeatJobs = await monitorChecksQueue.getRepeatableJobs()
  for (const job of existingRepeatJobs) {
    const monitorId = job.name.startsWith('check:') ? job.name.slice(6) : null
    if (monitorId && !activeCheckIds.has(monitorId)) {
      await monitorChecksQueue.removeRepeatableByKey(job.key)
      logger.info('Removed stale monitor-checks job', { monitorId })
    }
  }

  // ── heartbeat-watchdog: delayed jobs (only add if not already present) ────
  for (const m of heartbeats) {
    await addHeartbeatWatchdog(m._id.toString(), m.interval)
  }

  // ── SSL daily cron ────────────────────────────────────────────────────────
  await setupSslDailyCron()

  logger.info('Monitor job reconciliation complete', {
    activeChecks: activeCheckIds.size,
    heartbeats: heartbeats.length,
  })
}
