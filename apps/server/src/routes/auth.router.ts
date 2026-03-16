import { Router, Request, Response, NextFunction } from 'express'
import { LoginSchema, ChangePasswordSchema } from '@uptimemonitor/shared/schemas'
import { loginUser, rotateRefreshToken, logoutUser, changePassword } from '../services/auth.service'
import { logger } from '../lib/logger'

const router = Router()

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth/refresh',
}

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LoginSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), {
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map(i => ({ field: i.path[0], message: i.message }))
      }))
    }
    const { email, password } = parsed.data
    const result = await loginUser(email, password)
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)
    res.status(200).json({ data: { accessToken: result.accessToken, user: result.user }, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) {
      return next(Object.assign(new Error('No refresh token'), { statusCode: 401, code: 'INVALID_TOKEN' }))
    }
    const result = await rotateRefreshToken(token)
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS)
    res.status(200).json({ data: { accessToken: result.accessToken, user: result.user }, error: null, message: null })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/auth/logout  (requires auth middleware upstream)
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization ?? ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (req.user && accessToken) {
      await logoutUser(req.user.userId, accessToken)
    }
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' })
    res.status(200).json({ data: null, error: null, message: 'Logged out' })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/auth/change-password  (requires auth middleware upstream)
router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(Object.assign(new Error('Unauthorized'), { statusCode: 401, code: 'UNAUTHORIZED' }))
    }
    const parsed = ChangePasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      return next(Object.assign(new Error('Validation failed'), {
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues.map(i => ({ field: i.path[0], message: i.message }))
      }))
    }
    await changePassword(req.user.userId, parsed.data.newPassword)
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' })
    res.status(200).json({ data: null, error: null, message: 'Password changed. Please log in again.' })
  } catch (err) {
    next(err)
  }
})

export { router as authRouter }
