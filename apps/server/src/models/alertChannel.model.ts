import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IAlertChannel extends Document {
  orgId: Types.ObjectId
  type: 'email' | 'webhook' | 'telegram' | 'slack'
  config: {
    email?: string
    url?: string
    secret?: string
    botToken?: string
    chatId?: string
    slackWebhookUrl?: string
  }
  monitorIds: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const AlertChannelSchema = new Schema<IAlertChannel>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    type: { type: String, enum: ['email', 'webhook', 'telegram', 'slack'], required: true },
    config: {
      email: { type: String },
      url: { type: String },
      secret: { type: String },
      botToken: { type: String },
      chatId: { type: String },
      slackWebhookUrl: { type: String },
    },
    monitorIds: [{ type: Schema.Types.ObjectId, ref: 'Monitor' }],
  },
  { timestamps: true }
)

export const AlertChannel = mongoose.model<IAlertChannel>('AlertChannel', AlertChannelSchema)
