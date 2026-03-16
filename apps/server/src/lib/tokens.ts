import jwt, { SignOptions } from 'jsonwebtoken'
import { config } from './config'
import { TOKEN_EXPIRED, INVALID_TOKEN } from '@uptimemonitor/shared/strings'

export interface AccessTokenPayload {
  userId: string
  orgId: string
  role: string
}

export interface RefreshTokenPayload {
  userId: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = { expiresIn: config.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'] }
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, options)
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload
  } catch (err) {
    const error = err as { name?: string }
    if (error.name === 'TokenExpiredError') {
      throw Object.assign(new Error('Token expired'), { statusCode: 401, code: TOKEN_EXPIRED })
    }
    throw Object.assign(new Error('Invalid token'), { statusCode: 401, code: INVALID_TOKEN })
  }
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const options: SignOptions = { expiresIn: config.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'] }
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, options)
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as RefreshTokenPayload
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401, code: INVALID_TOKEN })
  }
}

export function getTokenRemainingTtlMs(token: string): number {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null
    if (!decoded?.exp) return 0
    return Math.max(0, decoded.exp * 1000 - Date.now())
  } catch {
    return 0
  }
}
