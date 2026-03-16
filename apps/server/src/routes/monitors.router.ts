import { Router, type Request, type Response, type NextFunction } from 'express'
import { CreateMonitorSchema, UpdateMonitorSchema } from '@uptimemonitor/shared/schemas'
import {
  listMonitors,
  createMonitor,
  getMonitor,
  updateMonitor,
  deleteMonitor,
  pauseMonitor,
  resumeMonitor,
  getMonitorLogs,
  getMonitorIncidents,
} from '../services/monitor.service'
import { requireRole } from '../middleware/requireRole'

const router = Router()

// GET /api/v1/monitors
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitors = await listMonitors(req.user!.orgId)
    res.json({ data: monitors, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/monitors
router.post('/', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateMonitorSchema.safeParse(req.body)
    if (!parsed.success) return next(parsed.error)
    const monitor = await createMonitor(req.user!.orgId, parsed.data)
    res.status(201).json({ data: monitor, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/monitors/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitor = await getMonitor(req.user!.orgId, req.params.id)
    res.json({ data: monitor, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/monitors/:id
router.put('/:id', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = UpdateMonitorSchema.safeParse(req.body)
    if (!parsed.success) return next(parsed.error)
    const monitor = await updateMonitor(req.user!.orgId, req.params.id, parsed.data)
    res.json({ data: monitor, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/monitors/:id
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteMonitor(req.user!.orgId, req.params.id)
    res.json({ data: null, error: null, message: 'Monitor deleted' })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/monitors/:id/pause
router.post('/:id/pause', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitor = await pauseMonitor(req.user!.orgId, req.params.id)
    res.json({ data: monitor, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/monitors/:id/resume
router.post('/:id/resume', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitor = await resumeMonitor(req.user!.orgId, req.params.id)
    res.json({ data: monitor, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/monitors/:id/logs
router.get('/:id/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getMonitorLogs(req.user!.orgId, req.params.id, {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
    })
    res.json({ data: result, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/monitors/:id/incidents
router.get('/:id/incidents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incidents = await getMonitorIncidents(req.user!.orgId, req.params.id)
    res.json({ data: incidents, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

export { router as monitorsRouter }
