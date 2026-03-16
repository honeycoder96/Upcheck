import { Router, type Request, type Response, type NextFunction } from 'express'
import { getDashboardSummary } from '../services/dashboard.service'

const router = Router()

// GET /api/v1/dashboard/summary?range=1d|7d|30d
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.query.range
    const range = raw === '1d' || raw === '7d' || raw === '30d' ? raw : '30d'
    const summary = await getDashboardSummary(req.user!.orgId, range)
    res.json({ data: summary, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

export { router as dashboardRouter }
