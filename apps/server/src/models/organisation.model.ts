import mongoose, { Document, Schema } from 'mongoose'

export interface IOrganisation extends Document {
  name: string
  slug: string
  plan: 'free'
  planLimits: { maxMonitors: number }
  createdAt: Date
  updatedAt: Date
}

const organisationSchema = new Schema<IOrganisation>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: { type: String, enum: ['free'], default: 'free' },
    planLimits: { type: Object, default: { maxMonitors: 20 } },
  },
  { timestamps: true }
)

export const Organisation = mongoose.model<IOrganisation>('Organisation', organisationSchema)
