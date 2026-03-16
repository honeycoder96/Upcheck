import { Types } from 'mongoose'
import { AlertChannel } from '../models/alertChannel.model'
import type { CreateAlertChannelInput } from '@uptimemonitor/shared/schemas'

export async function listAlertChannels(orgId: string) {
  return AlertChannel.find({ orgId: new Types.ObjectId(orgId) }).lean()
}

export async function createAlertChannel(orgId: string, input: CreateAlertChannelInput) {
  const channel = await AlertChannel.create({
    orgId: new Types.ObjectId(orgId),
    type: input.type,
    config: input.config,
    monitorIds: input.monitorIds.map((id) => new Types.ObjectId(id)),
  })
  return channel
}

export async function updateAlertChannel(
  orgId: string,
  channelId: string,
  input: {
    config?: { email?: string; url?: string; botToken?: string; chatId?: string; slackWebhookUrl?: string }
    monitorIds?: string[]
    newSecret?: string
  }
) {
  const channel = await AlertChannel.findOne({
    _id: new Types.ObjectId(channelId),
    orgId: new Types.ObjectId(orgId),
  })
  if (!channel) return null

  if (input.config) {
    if (input.config.email !== undefined) channel.config.email = input.config.email
    if (input.config.url !== undefined) channel.config.url = input.config.url
    if (input.config.botToken !== undefined) channel.config.botToken = input.config.botToken
    if (input.config.chatId !== undefined) channel.config.chatId = input.config.chatId
    if (input.config.slackWebhookUrl !== undefined) channel.config.slackWebhookUrl = input.config.slackWebhookUrl
  }
  if (input.newSecret !== undefined) {
    channel.config.secret = input.newSecret || undefined
  }
  if (input.monitorIds !== undefined) {
    channel.monitorIds = input.monitorIds.map((id) => new Types.ObjectId(id))
  }

  await channel.save()
  return channel
}

export async function testTelegramChannel(
  botToken: string,
  chatId: string
): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const body = JSON.stringify({
    chat_id: chatId,
    text: '✅ UptimeMonitor test message — your Telegram alert channel is working correctly.',
  })

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    })
    clearTimeout(timer)
    const json = (await res.json()) as { ok: boolean; description?: string }
    if (!json.ok) {
      return { ok: false, error: json.description ?? 'Telegram API error' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function testSlackChannel(
  slackWebhookUrl: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '✅ UptimeMonitor test message — your Slack alert channel is working correctly.' }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    // Slack returns plain text "ok" on success, or an error string like "invalid_payload"
    const text = await res.text()
    if (!res.ok || text !== 'ok') {
      return { ok: false, error: text || `Slack responded with status ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function deleteAlertChannel(orgId: string, channelId: string): Promise<boolean> {
  const result = await AlertChannel.deleteOne({
    _id: new Types.ObjectId(channelId),
    orgId: new Types.ObjectId(orgId),
  })
  return result.deletedCount === 1
}
