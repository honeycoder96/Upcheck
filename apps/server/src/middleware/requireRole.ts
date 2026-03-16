import type { Request, Response, NextFunction } from 'express'
import { AppError } from './errorHandler'
import { FORBIDDEN } from '@uptimemonitor/shared/strings'
import type { Role } from '@uptimemonitor/shared/constants'

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  admin: 1,
  owner: 2,
}

/**
 * Middleware factory — requires the authenticated user to have at least `minRole`.
 * Must be placed after authMiddleware.
 */
export function requireRole(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as Role | undefined
    if (!userRole || (ROLE_RANK[userRole] ?? -1) < ROLE_RANK[minRole]) {
      return next(new AppError(403, FORBIDDEN, 'Insufficient permissions'))
    }
    next()
  }
}
