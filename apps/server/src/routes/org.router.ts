import { Router } from 'express'
import { requireRole } from '../middleware/requireRole'
import { getOrg, updateOrg } from '../services/org.service'
import { UpdateOrgSchema } from '@uptimemonitor/shared/schemas'

const router = Router()

// GET /api/v1/org
router.get('/', async (req, res, next) => {
  try {
    const org = await getOrg(req.user!.orgId)
    res.json({ data: org, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/org — owner only
router.patch('/', requireRole('owner'), async (req, res, next) => {
  try {
    const parsed = UpdateOrgSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(
        Object.assign(new Error('Validation failed'), {
          statusCode: 422,
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues.map((i) => ({ field: i.path[0], message: i.message })),
        })
      )
    }

    const org = await updateOrg(req.user!.orgId, parsed.data)
    res.json({ data: org, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

export { router as orgRouter }
