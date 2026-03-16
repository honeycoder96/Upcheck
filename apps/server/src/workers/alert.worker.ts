import crypto from 'crypto'
import type { Job } from 'bullmq'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { Monitor } from '../models/monitor.model'
import { Incident } from '../models/incident.model'
import { AlertChannel } from '../models/alertChannel.model'
import { MonitorDown } from '../emails/MonitorDown'
import { MonitorRecovered } from '../emails/MonitorRecovered'
import { SslExpiry } from '../emails/SslExpiry'
import { config } from '../lib/config'
import { logger } from '../lib/logger'

export interface AlertJobData {
  type: 'down' | 'up' | 'ssl_expiry'
  monitorId: string
  orgId: string
  monitorName: string
  // ssl_expiry only
  daysRemaining?: number
  threshold?: number
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

function formatDate(d: Date): string {
  return d.toUTCString()
}

export async function processAlertJob(job: Job<AlertJobData>): Promise<void> {
  const { type, monitorId, orgId, monitorName } = job.data

  // Find all alert channels for this org that include this monitor
  const channels = await AlertChannel.find({
    orgId,
    monitorIds: monitorId,
  }).lean()

  if (channels.length === 0) return

  // Fetch monitor for target info
  const monitor = await Monitor.findById(monitorId).select('url host type').lean()
  const target = monitor?.url ?? monitor?.host ?? monitorName

  // Build payload and HTML for each event type
  let emailSubject = ''
  let emailHtml = ''
  let webhookPayload: Record<string, unknown> = {}

  if (type === 'down') {
    const incident = await Incident.findOne({ monitorId, resolvedAt: null })
      .sort({ startedAt: -1 })
      .lean()
    const errorCause = incident?.cause ?? 'Unreachable'

    emailSubject = `🔴 DOWN: ${monitorName}`
    emailHtml = await render(
      MonitorDown({
        monitorName,
        target,
        error: errorCause,
        checkedAt: formatDate(new Date()),
      })
    )
    webhookPayload = {
      event: 'down',
      monitorId,
      monitorName,
      timestamp: new Date().toISOString(),
      details: { target, error: errorCause },
    }
  } else if (type === 'up') {
    const incident = await Incident.findOne({ monitorId, resolvedAt: { $ne: null } })
      .sort({ resolvedAt: -1 })
      .lean()
    const duration =
      incident?.resolvedAt && incident?.startedAt
        ? formatDuration(incident.resolvedAt.getTime() - incident.startedAt.getTime())
        : 'unknown'

    emailSubject = `🟢 RECOVERED: ${monitorName}`
    emailHtml = await render(
      MonitorRecovered({
        monitorName,
        target,
        downtimeDuration: duration,
        recoveredAt: formatDate(new Date()),
      })
    )
    webhookPayload = {
      event: 'up',
      monitorId,
      monitorName,
      timestamp: new Date().toISOString(),
      details: { target, downtimeDuration: duration },
    }
  } else if (type === 'ssl_expiry') {
    const { daysRemaining = 0 } = job.data
    const host = monitor?.host ?? target

    emailSubject = `⚠️ SSL Expiry: ${monitorName} expires in ${daysRemaining} days`
    emailHtml = await render(
      SslExpiry({
        monitorName,
        host,
        daysRemaining,
        expiresAt: formatDate(new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)),
      })
    )
    webhookPayload = {
      event: 'ssl_expiry',
      monitorId,
      monitorName,
      timestamp: new Date().toISOString(),
      details: { host, daysRemaining },
    }
  }

  // Dispatch to each channel
  for (const channel of channels) {
    try {
      if (channel.type === 'email') {
        await sendEmail(channel.config.email!, emailSubject, emailHtml)
      } else if (channel.type === 'webhook') {
        await sendWebhook(channel.config.url!, channel.config.secret, webhookPayload)
      } else if (channel.type === 'telegram') {
        await sendTelegram(channel.config.botToken!, channel.config.chatId!, emailSubject)
      } else if (channel.type === 'slack') {
        await sendSlack(channel.config.slackWebhookUrl!, emailSubject, webhookPayload)
      }
      logger.info('Alert dispatched', {
        channelId: channel._id,
        channelType: channel.type,
        monitorId,
        eventType: type,
      })
    } catch (err) {
      logger.error('Alert dispatch failed', {
        channelId: channel._id,
        channelType: channel.type,
        monitorId,
        error: (err as Error).message,
      })
      throw err // Re-throw so BullMQ retries
    }
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!config.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured — skipping email alert', { to, subject })
    return
  }
  const resend = new Resend(config.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: config.RESEND_FROM_EMAIL,
    replyTo: config.RESEND_REPLY_TO,
    to,
    subject,
    html,
  })
  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}

async function sendSlack(
  webhookUrl: string,
  title: string,
  payload: Record<string, unknown>
): Promise<void> {
  const details = payload.details as Record<string, unknown> | undefined
  const detailLines = details
    ? Object.entries(details).map(([k, v]) => `• *${k}:* ${v}`).join('\n')
    : ''
  const text = detailLines ? `${title}\n${detailLines}` : title

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const body = await res.text()
  if (!res.ok || body !== 'ok') {
    throw new Error(`Slack webhook error: ${body || res.status}`)
  }
}

async function sendTelegram(botToken: string, chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  const json = (await res.json()) as { ok: boolean; description?: string }
  if (!json.ok) {
    throw new Error(`Telegram API error: ${json.description ?? 'unknown'}`)
  }
}

async function sendWebhook(
  url: string,
  secret: string | undefined,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'UptimeMonitor/1.0',
  }

  if (secret) {
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex')
    headers['X-Signature-256'] = `sha256=${signature}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      throw new Error(`Webhook responded with ${res.status}`)
    }
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}
