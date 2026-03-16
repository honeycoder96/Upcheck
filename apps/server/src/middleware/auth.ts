import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/tokens'
import { isBlocklisted } from '../lib/tokenBlocklist'
import { UNAUTHORIZED, TOKEN_EXPIRED } from '@uptimemonitor/shared/strings'

function isPublicRoute(req: Request): boolean {
  const path = req.path
  return (
    path === '/api/v1/auth/login' ||
    path === '/api/v1/auth/refresh' ||
    path.startsWith('/api/v1/status/') ||
    path.startsWith('/api/v1/heartbeat/') ||
    path === '/api/v1/health'
  )
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (isPublicRoute(req)) {
    next()
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    next(Object.assign(new Error('Missing or invalid Authorization header'), { statusCode: 401, code: UNAUTHORIZED }))
    return
  }

  const token = authHeader.slice(7)

  try {
    const blocklisted = await isBlocklisted(token)
    if (blocklisted) {
      next(Object.assign(new Error('Token has been revoked'), { statusCode: 401, code: TOKEN_EXPIRED }))
      return
    }

    const payload = verifyAccessToken(token)
    req.user = { userId: payload.userId, orgId: payload.orgId, role: payload.role }
    next()
  } catch (err) {
    next(err)
  }
}
