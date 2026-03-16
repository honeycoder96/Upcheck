import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { User } from '../models/user.model'
import { config } from '../lib/config'
import { logger } from '../lib/logger'
import { AppError } from '../middleware/errorHandler'
import { USER_NOT_FOUND } from '@uptimemonitor/shared/strings'
import { UserCreated } from '../emails/UserCreated'
import type { CreateUserInput, UpdateUserRoleInput } from '@uptimemonitor/shared/schemas'

function assertObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(404, USER_NOT_FOUND, 'User not found')
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listUsers(orgId: string) {
  return User.find({ orgId }).sort({ createdAt: 1 }).lean()
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createUser(
  orgId: string,
  orgName: string,
  data: CreateUserInput
) {
  const existing = await User.findOne({ email: data.email.toLowerCase() })
  if (existing) {
    throw new AppError(409, 'USER_EXISTS', 'A user with this email already exists')
  }

  // Generate a secure random temporary password
  const temporaryPassword = crypto.randomBytes(10).toString('base64url').slice(0, 14)
  const passwordHash = await bcrypt.hash(temporaryPassword, 12)

  const user = await User.create({
    orgId,
    email: data.email.toLowerCase(),
    passwordHash,
    role: data.role,
    mustChangePassword: true,
  })

  // Send welcome email (graceful — don't fail if email is misconfigured)
  try {
    if (config.RESEND_API_KEY) {
      const resend = new Resend(config.RESEND_API_KEY)
      const html = await render(
        UserCreated({
          email: data.email,
          temporaryPassword,
          orgName,
          loginUrl: `${config.APP_URL}/login`,
        })
      )
      await resend.emails.send({
        from: config.RESEND_FROM_EMAIL,
        to: data.email,
        subject: `You've been invited to ${orgName} on Uptime Monitor`,
        html,
      })
    } else {
      logger.warn('RESEND_API_KEY not set — welcome email not sent', { email: data.email })
    }
  } catch (err) {
    logger.error('Failed to send welcome email', {
      email: data.email,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return user.toObject()
}

// ── Update role ───────────────────────────────────────────────────────────────

export async function updateUserRole(
  orgId: string,
  userId: string,
  data: UpdateUserRoleInput
) {
  assertObjectId(userId)

  const user = await User.findOneAndUpdate(
    { _id: userId, orgId },
    { role: data.role },
    { new: true }
  ).lean()

  if (!user) throw new AppError(404, USER_NOT_FOUND, 'User not found')
  return user
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteUser(orgId: string, userId: string, requesterId: string) {
  assertObjectId(userId)

  if (userId === requesterId) {
    throw new AppError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account')
  }

  const user = await User.findOneAndDelete({ _id: userId, orgId, role: { $ne: 'owner' } }).lean()
  if (!user) throw new AppError(404, USER_NOT_FOUND, 'User not found or cannot delete owner')
}
