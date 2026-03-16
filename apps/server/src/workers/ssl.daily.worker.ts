import type { Job } from 'bullmq'
import { SslState } from '../models/sslState.model'
import { Monitor } from '../models/monitor.model'
import { alertDispatchQueue } from '../lib/queue'
import { SSL_ALERT_THRESHOLDS } from '@uptimemonitor/shared/constants'
import { logger } from '../lib/logger'

export async function processSslDailyJob(_job: Job): Promise<void> {
  const now = new Date()

  // Load all ssl_states for active SSL monitors
  const sslStates = await SslState.find().lean()

  for (const state of sslStates) {
    const monitor = await Monitor.findOne({
      _id: state.monitorId,
      type: 'ssl',
      visibility: { $ne: 'deleted' },
      status: { $ne: 'paused' },
    })
      .select('name orgId')
      .lean()

    if (!monitor) continue

    const daysUntilExpiry =
      (state.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    const newAlerts: number[] = []

    for (const threshold of SSL_ALERT_THRESHOLDS) {
      if (daysUntilExpiry <= threshold && !state.alertsSent.includes(threshold)) {
        newAlerts.push(threshold)
      }
    }

    if (newAlerts.length === 0) continue

    // Enqueue one alert job per new threshold
    for (const threshold of newAlerts) {
      await alertDispatchQueue.add('alert', {
        type: 'ssl_expiry',
        monitorId: state.monitorId.toString(),
        orgId: monitor.orgId.toString(),
        monitorName: monitor.name,
        daysRemaining: Math.ceil(daysUntilExpiry),
        threshold,
      })
    }

    // Record that these thresholds have been alerted
    await SslState.updateOne(
      { _id: state._id },
      { $addToSet: { alertsSent: { $each: newAlerts } } }
    )

    logger.info('SSL expiry alerts enqueued', {
      monitorId: state.monitorId,
      thresholds: newAlerts,
      daysRemaining: Math.ceil(daysUntilExpiry),
    })
  }
}
