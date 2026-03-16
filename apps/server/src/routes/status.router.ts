import { Router } from 'express'
import { getPublicStatus, getPublicSummary } from '../services/status.service'

const router = Router()

// GET /api/v1/status/:orgSlug
router.get('/:orgSlug', async (req, res, next) => {
  try {
    const data = await getPublicStatus(req.params.orgSlug)
    res.json({ data, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/status/:orgSlug/summary
router.get('/:orgSlug/summary', async (req, res, next) => {
  try {
    const data = await getPublicSummary(req.params.orgSlug)
    res.json({ data, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

export { router as statusRouter }
