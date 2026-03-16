import bcrypt from 'bcryptjs'
import { User, IUser } from '../models/user.model'
import { Organisation } from '../models/organisation.model'
import { signAccessToken, signRefreshToken, verifyRefreshToken, getTokenRemainingTtlMs } from '../lib/tokens'
import { addToBlocklist, isBlocklisted } from '../lib/tokenBlocklist'
import { INVALID_CREDENTIALS, INVALID_TOKEN } from '@uptimemonitor/shared/strings'

function createError(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code })
}

function pruneExpiredTokens(user: IUser): void {
  const now = new Date()
  user.refreshTokens = user.refreshTokens.filter(t => t.expiresAt > now)
}

export type SafeUser = {
  userId: string
  orgId: string
  role: string
  email: string
  mustChangePassword: boolean
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')
  if (!user) throw createError(401, INVALID_CREDENTIALS, 'Invalid email or password')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw createError(401, INVALID_CREDENTIALS, 'Invalid email or password')

  const safeUser: SafeUser = {
    userId: (user._id as any).toString(),
    orgId: user.orgId.toString(),
    role: user.role,
    email: user.email,
    mustChangePassword: user.mustChangePassword ?? false,
  }

  const accessToken = signAccessToken(safeUser)
  const refreshToken = signRefreshToken({ userId: safeUser.userId })

  pruneExpiredTokens(user)
  const tokenHash = await bcrypt.hash(refreshToken, 10)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  user.refreshTokens.push({ tokenHash, expiresAt })
  await user.save()

  return { accessToken, refreshToken, user: safeUser }
}

export async function rotateRefreshToken(
  incomingRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string; user: SafeUser }> {
  const payload = verifyRefreshToken(incomingRefreshToken)

  const user = await User.findById(payload.userId).select('+passwordHash +refreshTokens')
  if (!user) throw createError(401, INVALID_TOKEN, 'User not found')

  pruneExpiredTokens(user)

  // Find matching token hash
  let matchedIndex = -1
  for (let i = 0; i < user.refreshTokens.length; i++) {
    const match = await bcrypt.compare(incomingRefreshToken, user.refreshTokens[i].tokenHash)
    if (match) { matchedIndex = i; break }
  }
  if (matchedIndex === -1) throw createError(401, INVALID_TOKEN, 'Refresh token not recognised')

  // Token rotation: remove old, add new
  user.refreshTokens.splice(matchedIndex, 1)

  const safeUser: SafeUser = {
    userId: (user._id as any).toString(),
    orgId: user.orgId.toString(),
    role: user.role,
    email: user.email,
    mustChangePassword: user.mustChangePassword ?? false,
  }

  const newAccessToken = signAccessToken(safeUser)
  const newRefreshToken = signRefreshToken({ userId: safeUser.userId })

  const tokenHash = await bcrypt.hash(newRefreshToken, 10)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  user.refreshTokens.push({ tokenHash, expiresAt })
  await user.save()

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user: safeUser }
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await User.findByIdAndUpdate(userId, {
    $set: { passwordHash, mustChangePassword: false, refreshTokens: [] },
  })
}

export async function logoutUser(userId: string, accessToken: string): Promise<void> {
  const ttlMs = getTokenRemainingTtlMs(accessToken)
  if (ttlMs > 0) await addToBlocklist(accessToken, ttlMs)

  await User.findByIdAndUpdate(userId, {
    $set: { refreshTokens: [] },
  })
}
