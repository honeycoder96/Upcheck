export const MONITOR_TYPES = ['http', 'keyword', 'ping', 'port', 'ssl', 'heartbeat'] as const;
export type MonitorType = typeof MONITOR_TYPES[number];

export const MONITOR_INTERVALS = [1, 5, 15, 30, 60] as const;
export type MonitorInterval = typeof MONITOR_INTERVALS[number];

export const MONITOR_STATUSES = ['up', 'down', 'paused', 'pending'] as const;
export type MonitorStatus = typeof MONITOR_STATUSES[number];

export const VISIBILITY_STATES = ['visible', 'hidden', 'deleted'] as const;
export type VisibilityState = typeof VISIBILITY_STATES[number];

export const ROLES = ['owner', 'admin', 'viewer'] as const;
export type Role = typeof ROLES[number];

export const PLAN_LIMITS = {
  free: {
    maxMonitors: 20,
  },
} as const;

export const SSL_ALERT_THRESHOLDS = [30, 7, 1] as const;

export const CHECK_LOG_TTL_DAYS = 90;

export const STATUS_POLL_INTERVAL_MS = 60000;

export const DEFAULT_TIMEOUT_MS = {
  http: 30000,
  ping: 10000,
  port: 10000,
} as const;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = typeof HTTP_METHODS[number];
