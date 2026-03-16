import type { Job } from 'bullmq'
import { Monitor } from '../models/monitor.model'
import { Incident } from '../models/incident.model'
import { alertDispatchQueue } from '../lib/queue'
import { logger } from '../lib/logger'

interface WatchdogJobData {
  monitorId: string
}

export async function processHeartbeatWatchdog(job: Job<WatchdogJobData>): Promise<void> {
  const { monitorId } = job.data

  const monitor = await Monitor.findById(monitorId).lean()

  if (!monitor || monitor.visibility === 'deleted' || monitor.status === 'paused') {
    return
  }

  // Already down — do nothing. The heartbeat endpoint handles recovery.
  if (monitor.status === 'down') return

  // Mark as down
  await Monitor.updateOne(
    { _id: monitor._id },
    { status: 'down', lastStatusChangeAt: new Date() }
  )

  // Open incident
  await Incident.create({
    monitorId: monitor._id,
    orgId: monitor.orgId,
    startedAt: new Date(),
    cause: 'No heartbeat received within grace period',
  })

  // Enqueue alert
  await alertDispatchQueue.add('alert', {
    type: 'down',
    monitorId,
    orgId: monitor.orgId.toString(),
    monitorName: monitor.name,
  })

  logger.info('Heartbeat monitor timed out', { monitorId, name: monitor.name })
}
