import { Worker, type ConnectionOptions } from 'bullmq'
import { connectDatabase } from './lib/database'
import { config } from './lib/config'
import { logger } from './lib/logger'
import { setupSslDailyCron } from './lib/queue'
import { processCheckJob } from './workers/check.worker'
import { processSslDailyJob } from './workers/ssl.daily.worker'
import { processHeartbeatWatchdog } from './workers/heartbeat.worker'
import { processAlertJob } from './workers/alert.worker'

function getConnection(): ConnectionOptions {
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

async function startWorkers(): Promise<void> {
  await connectDatabase()

  // Register the SSL daily cron job (idempotent — skipped if already present)
  await setupSslDailyCron()

  const checkWorker = new Worker('monitor-checks', processCheckJob, {
    connection: getConnection(),
    concurrency: 5,
  })

  const alertWorker = new Worker('alert-dispatch', processAlertJob, {
    connection: getConnection(),
    concurrency: 5,
  })

  const sslDailyWorker = new Worker('ssl-checks', processSslDailyJob, {
    connection: getConnection(),
    concurrency: 1,
  })

  const heartbeatWorker = new Worker('heartbeat-watchdog', processHeartbeatWatchdog, {
    connection: getConnection(),
    concurrency: 10,
  })

  // ── Event logging ──────────────────────────────────────────────────────────

  checkWorker.on('completed', (job) => {
    logger.debug('Check completed', { jobId: job.id, monitorId: job.data.monitorId })
  })
  checkWorker.on('failed', (job, err) => {
    logger.error('Check failed', { jobId: job?.id, monitorId: job?.data?.monitorId, error: err.message })
  })
  alertWorker.on('failed', (job, err) => {
    logger.error('Alert job failed', { jobId: job?.id, error: err.message })
  })
  sslDailyWorker.on('completed', () => {
    logger.info('SSL daily check completed')
  })
  heartbeatWorker.on('failed', (job, err) => {
    logger.error('Heartbeat watchdog failed', { jobId: job?.id, error: err.message })
  })

  // ── Graceful shutdown ──────────────────────────────────────────────────────

  process.on('SIGTERM', async () => {
    logger.info('Worker SIGTERM received, closing...')
    await Promise.all([
      checkWorker.close(),
      alertWorker.close(),
      sslDailyWorker.close(),
      heartbeatWorker.close(),
    ])
    process.exit(0)
  })

  logger.info('Workers started', {
    process: 'worker',
    queues: ['monitor-checks', 'alert-dispatch', 'ssl-checks', 'heartbeat-watchdog'],
  })
}

startWorkers().catch((err) => {
  logger.error('Failed to start workers', { error: err })
  process.exit(1)
})
