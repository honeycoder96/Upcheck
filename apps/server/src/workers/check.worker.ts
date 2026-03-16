import { exec } from 'child_process'
import { promisify } from 'util'
import net from 'net'
import tls from 'tls'
import type { Job } from 'bullmq'
import { Monitor, type IMonitorData } from '../models/monitor.model'
import { CheckLog } from '../models/checkLog.model'
import { Incident } from '../models/incident.model'
import { SslState } from '../models/sslState.model'
import { alertDispatchQueue } from '../lib/queue'
import { logger } from '../lib/logger'

const execAsync = promisify(exec)

interface CheckJobData {
  monitorId: string
}

export async function processCheckJob(job: Job<CheckJobData>): Promise<void> {
  const { monitorId } = job.data

  const monitor = await Monitor.findById(monitorId).lean()
  if (!monitor || monitor.visibility === 'deleted' || monitor.status === 'paused') {
    return
  }

  const inMaintenance = isInMaintenanceWindow(monitor)
  const { result, responseTime, statusCode, error } = await runCheck(monitor)

  await CheckLog.create({
    monitorId: monitor._id,
    orgId: monitor.orgId,
    timestamp: new Date(),
    result,
    responseTime,
    statusCode,
    error,
  })

  const prevStatus = monitor.status
  const isFirstCheck = prevStatus === 'pending'
  const isTransition = !isFirstCheck && prevStatus !== result

  await Monitor.updateOne(
    { _id: monitor._id },
    {
      status: result,
      lastCheckedAt: new Date(),
      lastResponseTime: responseTime,
      ...(isFirstCheck || isTransition ? { lastStatusChangeAt: new Date() } : {}),
    }
  )

  if (!inMaintenance) {
    if ((isFirstCheck || isTransition) && result === 'down') {
      await Incident.create({
        monitorId: monitor._id,
        orgId: monitor.orgId,
        startedAt: new Date(),
        cause: error ?? (statusCode ? `HTTP ${statusCode}` : 'Unreachable'),
      })
      await alertDispatchQueue.add('alert', {
        type: 'down',
        monitorId,
        orgId: monitor.orgId.toString(),
        monitorName: monitor.name,
      })
      logger.info('Monitor went down', { monitorId, name: monitor.name })
    } else if (isTransition && result === 'up' && prevStatus === 'down') {
      await Incident.findOneAndUpdate(
        { monitorId: monitor._id, resolvedAt: null },
        { resolvedAt: new Date() },
        { sort: { startedAt: -1 } }
      )
      await alertDispatchQueue.add('alert', {
        type: 'up',
        monitorId,
        orgId: monitor.orgId.toString(),
        monitorName: monitor.name,
      })
      logger.info('Monitor recovered', { monitorId, name: monitor.name })
    }
  }

  // Opportunistic maintenance window cleanup — remove expired windows
  if (
    monitor.maintenanceWindow &&
    new Date(monitor.maintenanceWindow.end) < new Date()
  ) {
    await Monitor.updateOne({ _id: monitor._id }, { maintenanceWindow: null })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isInMaintenanceWindow(monitor: IMonitorData): boolean {
  if (!monitor.maintenanceWindow) return false
  const now = Date.now()
  return (
    now >= new Date(monitor.maintenanceWindow.start).getTime() &&
    now <= new Date(monitor.maintenanceWindow.end).getTime()
  )
}

interface CheckResult {
  result: 'up' | 'down'
  responseTime?: number
  statusCode?: number
  error?: string
}

async function runCheck(monitor: IMonitorData): Promise<CheckResult> {
  switch (monitor.type) {
    case 'http':
    case 'keyword':
      return runHttpCheck(monitor)
    case 'ping':
      return runPingCheck(monitor.host!, monitor.timeout ?? 10000)
    case 'port':
      return runPortCheck(monitor.host!, monitor.port!, monitor.timeout ?? 10000)
    case 'ssl':
      return runSslCheck(monitor)
    default:
      logger.warn('Check type not implemented', { type: monitor.type })
      return { result: 'up' }
  }
}

// ── HTTP / Keyword ────────────────────────────────────────────────────────────

async function runHttpCheck(monitor: IMonitorData): Promise<CheckResult> {
  const url = monitor.url!
  const timeout = monitor.timeout ?? 30000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const start = Date.now()

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'UptimeMonitor/1.0',
      ...monitor.customHeaders,
    }

    const response = await fetch(url, {
      method: monitor.httpMethod ?? 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timer)
    const responseTime = Date.now() - start
    const statusCode = response.status
    const expectedCodes = monitor.expectedStatusCodes ?? []

    const statusOk =
      expectedCodes.length === 0
        ? statusCode >= 200 && statusCode < 400
        : expectedCodes.includes(statusCode)

    if (!statusOk) {
      return { result: 'down', responseTime, statusCode }
    }

    if (monitor.type === 'keyword' && monitor.keyword) {
      const body = await response.text()
      const found = body.includes(monitor.keyword)
      const keywordUp = monitor.keywordPresent ? found : !found
      return {
        result: keywordUp ? 'up' : 'down',
        responseTime,
        statusCode,
        ...(keywordUp
          ? {}
          : {
              error: `Keyword "${monitor.keyword}" ${
                monitor.keywordPresent ? 'not found' : 'found'
              } in response`,
            }),
      }
    }

    return { result: 'up', responseTime, statusCode }
  } catch (err) {
    clearTimeout(timer)
    const responseTime = Date.now() - start
    const msg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `Timed out after ${timeout}ms`
          : err.message
        : 'Unknown error'
    return { result: 'down', responseTime, error: msg }
  }
}

// ── Ping ──────────────────────────────────────────────────────────────────────

async function runPingCheck(host: string, timeout: number): Promise<CheckResult> {
  // Sanitise host to prevent command injection
  if (!/^[a-zA-Z0-9.\-_]+$/.test(host)) {
    return { result: 'down', error: 'Invalid host' }
  }

  const timeoutSec = Math.max(1, Math.ceil(timeout / 1000))
  const isLinux = process.platform === 'linux'
  // Linux: -W <secs>, macOS: -t <secs>
  const cmd = isLinux
    ? `ping -c 1 -W ${timeoutSec} ${host}`
    : `ping -c 1 -t ${timeoutSec} ${host}`

  const start = Date.now()
  try {
    const { stdout } = await execAsync(cmd, { timeout: timeout + 2000 })
    const match = stdout.match(/time[=<](\d+(?:\.\d+)?)\s*ms/)
    const pingMs = match ? Math.round(parseFloat(match[1])) : Date.now() - start
    return { result: 'up', responseTime: pingMs }
  } catch {
    return { result: 'down', responseTime: Date.now() - start, error: 'Host unreachable' }
  }
}

// ── Port ──────────────────────────────────────────────────────────────────────

async function runPortCheck(
  host: string,
  port: number,
  timeout: number
): Promise<CheckResult> {
  return new Promise((resolve) => {
    const start = Date.now()
    const socket = net.createConnection({ host, port })

    const timer = setTimeout(() => {
      socket.destroy()
      resolve({
        result: 'down',
        responseTime: Date.now() - start,
        error: `Timed out after ${timeout}ms`,
      })
    }, timeout)

    socket.on('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve({ result: 'up', responseTime: Date.now() - start })
    })

    socket.on('error', (err) => {
      clearTimeout(timer)
      resolve({ result: 'down', responseTime: Date.now() - start, error: err.message })
    })
  })
}

// ── SSL ───────────────────────────────────────────────────────────────────────

async function runSslCheck(monitor: IMonitorData): Promise<CheckResult> {
  const url = monitor.url!
  const timeout = monitor.timeout ?? 10000

  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return { result: 'down', error: 'Invalid URL for SSL check' }
  }

  return new Promise((resolve) => {
    const start = Date.now()
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        socket.destroy()
        resolve({ result: 'down', responseTime: Date.now() - start, error: `TLS timed out after ${timeout}ms` })
      }
    }, timeout)

    const socket = tls.connect({ host, port: 443, servername: host }, () => {
      if (settled) return
      clearTimeout(timer)
      settled = true

      try {
        const cert = socket.getPeerCertificate()
        socket.destroy()
        const responseTime = Date.now() - start

        if (!cert || !cert.valid_to) {
          resolve({ result: 'down', responseTime, error: 'Could not read certificate' })
          return
        }

        const expiresAt = new Date(cert.valid_to)
        const now = new Date()

        if (expiresAt <= now) {
          resolve({ result: 'down', responseTime, error: 'Certificate expired' })
        } else {
          // Update ssl_states asynchronously (fire-and-forget errors)
          SslState.findOneAndUpdate(
            { monitorId: monitor._id },
            {
              monitorId: monitor._id,
              orgId: monitor.orgId,
              expiresAt,
              lastCheckedAt: now,
            },
            { upsert: true, new: true }
          ).catch((e) => logger.error('Failed to update ssl_states', { error: e }))

          resolve({ result: 'up', responseTime })
        }
      } catch (e) {
        socket.destroy()
        resolve({ result: 'down', responseTime: Date.now() - start, error: 'Certificate parse error' })
      }
    })

    socket.on('error', (err) => {
      if (settled) return
      clearTimeout(timer)
      settled = true
      resolve({ result: 'down', responseTime: Date.now() - start, error: err.message })
    })
  })
}
