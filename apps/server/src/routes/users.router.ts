import { Router } from 'express'
import { requireRole } from '../middleware/requireRole'
import { Organisation } from '../models/organisation.model'
import {
  listUsers,
  createUser,
  updateUserRole,
  deleteUser,
} from '../services/users.service'
import { CreateUserSchema, UpdateUserRoleSchema } from '@uptimemonitor/shared/schemas'
import { AppError } from '../middleware/errorHandler'

const router = Router()

// All user-management endpoints require at least admin role
router.use(requireRole('admin'))

// GET /api/v1/users
router.get('/', async (req, res, next) => {
  try {
    const users = await listUsers(req.user!.orgId)
    res.json({ data: users, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/users
router.post('/', requireRole('owner'), async (req, res, next) => {
  try {
    const parsed = CreateUserSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(
        Object.assign(new Error('Validation failed'), {
          statusCode: 422,
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues.map((i) => ({ field: i.path[0], message: i.message })),
        })
      )
    }

    const org = await Organisation.findById(req.user!.orgId).lean()
    if (!org) throw new AppError(404, 'ORG_NOT_FOUND', 'Organisation not found')

    const user = await createUser(req.user!.orgId, org.name, parsed.data)
    res.status(201).json({ data: user, error: null, message: 'User created' })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/users/:id/role
router.put('/:id/role', requireRole('owner'), async (req, res, next) => {
  try {
    const parsed = UpdateUserRoleSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(
        Object.assign(new Error('Validation failed'), {
          statusCode: 422,
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues.map((i) => ({ field: i.path[0], message: i.message })),
        })
      )
    }

    const user = await updateUserRole(req.user!.orgId, req.params.id, parsed.data)
    res.json({ data: user, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/users/:id
router.delete('/:id', requireRole('owner'), async (req, res, next) => {
  try {
    await deleteUser(req.user!.orgId, req.params.id, req.user!.userId)
    res.json({ data: null, error: null, message: 'User deleted' })
  } catch (err) {
    next(err)
  }
})

export { router as usersRouter }
