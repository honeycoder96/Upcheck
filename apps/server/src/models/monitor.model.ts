import mongoose, { Document, Schema } from 'mongoose'
import {
  MONITOR_TYPES,
  MONITOR_STATUSES,
  VISIBILITY_STATES,
  HTTP_METHODS,
  type MonitorType,
  type MonitorStatus,
  type VisibilityState,
  type HttpMethod,
  type MonitorInterval,
} from '@uptimemonitor/shared/constants'

// Plain (non-Document) type — used in worker functions that receive lean() results
export interface IMonitorData {
  _id: mongoose.Types.ObjectId
  orgId: mongoose.Types.ObjectId
  name: string
  type: MonitorType
  url?: string
  host?: string
  port?: number
  keyword?: string
  keywordPresent: boolean
  httpMethod: HttpMethod
  expectedStatusCodes: number[]
  customHeaders: Record<string, string>
  interval: MonitorInterval
  timeout: number
  maintenanceWindow: { start: Date; end: Date } | null
  status: MonitorStatus
  visibility: VisibilityState
  heartbeatToken?: string
  lastCheckedAt?: Date
  lastStatusChangeAt?: Date
  lastResponseTime?: number
  createdAt: Date
  updatedAt: Date
}

export interface IMonitor extends IMonitorData, Document {
  orgId: mongoose.Types.ObjectId
  name: string
  type: MonitorType
  url?: string
  host?: string
  port?: number
  keyword?: string
  keywordPresent: boolean
  httpMethod: HttpMethod
  expectedStatusCodes: number[]
  customHeaders: Record<string, string>
  interval: MonitorInterval
  timeout: number
  maintenanceWindow: { start: Date; end: Date } | null
  status: MonitorStatus
  visibility: VisibilityState
  heartbeatToken?: string
  lastCheckedAt?: Date
  lastStatusChangeAt?: Date
  lastResponseTime?: number
  createdAt: Date
  updatedAt: Date
}

const monitorSchema = new Schema<IMonitor>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organisation', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: MONITOR_TYPES, required: true },
    url: { type: String },
    host: { type: String },
    port: { type: Number },
    keyword: { type: String },
    keywordPresent: { type: Boolean, default: true },
    httpMethod: { type: String, enum: HTTP_METHODS, default: 'GET' },
    expectedStatusCodes: { type: [Number], default: [] },
    customHeaders: { type: Object, default: {} },
    interval: { type: Number, enum: [1, 5, 15, 30, 60], required: true },
    timeout: { type: Number, default: 30000 },
    maintenanceWindow: {
      type: new Schema(
        { start: { type: Date, required: true }, end: { type: Date, required: true } },
        { _id: false }
      ),
      default: null,
    },
    status: { type: String, enum: MONITOR_STATUSES, default: 'pending' },
    visibility: { type: String, enum: VISIBILITY_STATES, default: 'visible' },
    heartbeatToken: { type: String, sparse: true },
    lastCheckedAt: { type: Date },
    lastStatusChangeAt: { type: Date },
    lastResponseTime: { type: Number },
  },
  { timestamps: true }
)

// Query index: list monitors per org (excludes deleted)
monitorSchema.index({ orgId: 1, visibility: 1 })
// Dashboard summary counts
monitorSchema.index({ orgId: 1, status: 1, visibility: 1 })
// Heartbeat endpoint lookup
monitorSchema.index({ heartbeatToken: 1 }, { sparse: true })

export const Monitor = mongoose.model<IMonitor>('Monitor', monitorSchema)
