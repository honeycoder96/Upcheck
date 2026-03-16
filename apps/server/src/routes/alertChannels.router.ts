import { Router, type Request, type Response, type NextFunction } from 'express'
import { CreateAlertChannelSchema, UpdateAlertChannelSchema, TestAlertChannelSchema } from '@uptimemonitor/shared/schemas'
import {
  listAlertChannels,
  createAlertChannel,
  updateAlertChannel,
  deleteAlertChannel,
  testTelegramChannel,
  testSlackChannel,
} from '../services/alertChannel.service'
import { requireRole } from '../middleware/requireRole'

const router = Router()

// POST /api/v1/alert-channels/test
router.post('/test', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = TestAlertChannelSchema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues
      return res.status(422).json({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          field: issues[0]?.path.join('.'),
          details: issues.map((i) => ({ code: i.code, message: i.message, field: i.path.join('.') })),
        },
        message: null,
      })
    }
    const result =
      parsed.data.type === 'telegram'
        ? await testTelegramChannel(parsed.data.config.botToken, parsed.data.config.chatId)
        : await testSlackChannel(parsed.data.config.slackWebhookUrl)

    if (!result.ok) {
      return res.status(400).json({
        data: null,
        error: { code: 'TEST_FAILED', message: result.error ?? 'Connection test failed' },
        message: null,
      })
    }
    res.json({ data: { ok: true }, error: null, message: 'Test message sent successfully' })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/alert-channels
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channels = await listAlertChannels(req.user!.orgId)
    // Mask secret from response
    const masked = channels.map((ch) => ({
      ...ch,
      config: {
        ...ch.config,
        secret: ch.config.secret ? '••••••••' : undefined,
      },
    }))
    res.json({ data: masked, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/alert-channels
router.post('/', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateAlertChannelSchema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues
      return res.status(422).json({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          field: issues[0]?.path.join('.'),
          details: issues.map((i) => ({ code: i.code, message: i.message, field: i.path.join('.') })),
        },
        message: null,
      })
    }
    const channel = await createAlertChannel(req.user!.orgId, parsed.data)
    res.status(201).json({ data: channel, error: null, message: 'Alert channel created' })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/alert-channels/:id
router.put('/:id', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = UpdateAlertChannelSchema.safeParse(req.body)
    if (!parsed.success) {
      const issues = parsed.error.issues
      return res.status(422).json({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          field: issues[0]?.path.join('.'),
          details: issues.map((i) => ({ code: i.code, message: i.message, field: i.path.join('.') })),
        },
        message: null,
      })
    }
    const channel = await updateAlertChannel(req.user!.orgId, req.params.id, parsed.data)
    if (!channel) {
      return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Alert channel not found' }, message: null })
    }
    res.json({ data: channel, error: null, message: 'Alert channel updated' })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/alert-channels/:id
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await deleteAlertChannel(req.user!.orgId, req.params.id)
    if (!deleted) {
      return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Alert channel not found' }, message: null })
    }
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export { router as alertChannelsRouter }
