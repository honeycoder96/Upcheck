import { Router, type Request, type Response, type NextFunction } from 'express'
import { Monitor } from '../models/monitor.model'
import { Incident } from '../models/incident.model'
import { CheckLog } from '../models/checkLog.model'
import { addHeartbeatWatchdog, removeHeartbeatWatchdog, alertDispatchQueue } from '../lib/queue'
import { NOT_FOUND } from '@uptimemonitor/shared/strings'

const router = Router()

// POST /api/v1/heartbeat/:token  (public — no auth required)
router.post('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitor = await Monitor.findOne({
      heartbeatToken: req.params.token,
      visibility: { $ne: 'deleted' },
    }).lean()

    if (!monitor) {
      res.status(404).json({
        data: null,
        error: { code: NOT_FOUND, message: 'Heartbeat token not found' },
        message: null,
      })
      return
    }

    if (monitor.status === 'paused') {
      res.status(200).json({ data: null, error: null, message: 'Monitor is paused' })
      return
    }

    const wasDown = monitor.status === 'down'
    const prevStatus = monitor.status

    await Monitor.updateOne(
      { _id: monitor._id },
      {
        status: 'up',
        lastCheckedAt: new Date(),
        ...(prevStatus !== 'up' ? { lastStatusChangeAt: new Date() } : {}),
      }
    )

    if (wasDown) {
      await Incident.findOneAndUpdate(
        { monitorId: monitor._id, resolvedAt: null },
        { resolvedAt: new Date() },
        { sort: { startedAt: -1 } }
      )
      await alertDispatchQueue.add('alert', {
        type: 'up',
        monitorId: monitor._id.toString(),
        orgId: monitor.orgId.toString(),
        monitorName: monitor.name,
      })
    }

    // Reset watchdog timer
    await removeHeartbeatWatchdog(monitor._id.toString())
    await addHeartbeatWatchdog(monitor._id.toString(), monitor.interval)

    // Write check log
    await CheckLog.create({
      monitorId: monitor._id,
      orgId: monitor.orgId,
      timestamp: new Date(),
      result: 'up',
    })

    res.status(200).json({ data: null, error: null, message: 'OK' })
  } catch (err) {
    next(err)
  }
})

export { router as heartbeatRouter }
