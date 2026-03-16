import mongoose, { Document, Schema } from 'mongoose'
import { CHECK_LOG_TTL_DAYS } from '@uptimemonitor/shared/constants'

export interface ICheckLog extends Document {
  monitorId: mongoose.Types.ObjectId
  orgId: mongoose.Types.ObjectId
  timestamp: Date
  result: 'up' | 'down'
  responseTime?: number
  statusCode?: number
  error?: string
}

const checkLogSchema = new Schema<ICheckLog>(
  {
    monitorId: { type: Schema.Types.ObjectId, ref: 'Monitor', required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true },
    timestamp: { type: Date, required: true, default: () => new Date() },
    result: { type: String, enum: ['up', 'down'], required: true },
    responseTime: { type: Number },
    statusCode: { type: Number },
    error: { type: String },
  },
  { timestamps: false }
)

// Log history queries (paginated)
checkLogSchema.index({ monitorId: 1, timestamp: -1 })
// TTL: auto-expire after 90 days
checkLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: CHECK_LOG_TTL_DAYS * 24 * 60 * 60 }
)

export const CheckLog = mongoose.model<ICheckLog>('CheckLog', checkLogSchema)
