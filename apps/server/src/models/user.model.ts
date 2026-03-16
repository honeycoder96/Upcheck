import mongoose, { Document, Schema } from 'mongoose'
import { ROLES } from '@uptimemonitor/shared/constants'

export interface IUser extends Document {
  orgId: mongoose.Types.ObjectId
  email: string
  passwordHash: string
  role: 'owner' | 'admin' | 'viewer'
  mustChangePassword: boolean
  totpSecret: string | null
  totpEnabled: boolean
  refreshTokens: Array<{ tokenHash: string; expiresAt: Date }>
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'viewer' },
    mustChangePassword: { type: Boolean, default: false },
    totpSecret: { type: String, default: null },
    totpEnabled: { type: Boolean, default: false },
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash
        delete ret.refreshTokens
        delete ret.totpSecret
        return ret
      },
    },
  }
)

userSchema.index({ orgId: 1 })

export const User = mongoose.model<IUser>('User', userSchema)
