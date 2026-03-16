import mongoose, { Document, Schema } from 'mongoose'

export interface IIncident extends Document {
  monitorId: mongoose.Types.ObjectId
  orgId: mongoose.Types.ObjectId
  startedAt: Date
  resolvedAt?: Date
  cause?: string
}

const incidentSchema = new Schema<IIncident>(
  {
    monitorId: { type: Schema.Types.ObjectId, ref: 'Monitor', required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true },
    startedAt: { type: Date, required: true, default: () => new Date() },
    resolvedAt: { type: Date, default: null },
    cause: { type: String },
  },
  { timestamps: false }
)

// Find open incidents per monitor (resolvedAt: null = open)
incidentSchema.index({ monitorId: 1, resolvedAt: 1 })
// Org-level incident history
incidentSchema.index({ orgId: 1, resolvedAt: 1 })

export const Incident = mongoose.model<IIncident>('Incident', incidentSchema)
