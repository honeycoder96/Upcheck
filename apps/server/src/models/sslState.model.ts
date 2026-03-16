import mongoose, { Document, Schema } from 'mongoose'

export interface ISslState extends Document {
  monitorId: mongoose.Types.ObjectId
  orgId: mongoose.Types.ObjectId
  expiresAt: Date
  lastCheckedAt: Date
  alertsSent: number[]
}

const sslStateSchema = new Schema<ISslState>(
  {
    monitorId: { type: Schema.Types.ObjectId, ref: 'Monitor', required: true, unique: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true },
    expiresAt: { type: Date, required: true },
    lastCheckedAt: { type: Date, required: true },
    alertsSent: { type: [Number], default: [] },
  },
  { timestamps: false }
)

sslStateSchema.index({ orgId: 1 })

export const SslState = mongoose.model<ISslState>('SslState', sslStateSchema)
