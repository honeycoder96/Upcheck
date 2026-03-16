import { redisClient } from './redis'

const BLOCKLIST_PREFIX = 'blocklist:'

export async function addToBlocklist(token: string, ttlMs: number): Promise<void> {
  if (ttlMs <= 0) return
  await redisClient.set(`${BLOCKLIST_PREFIX}${token}`, '1', 'PX', ttlMs)
}

export async function isBlocklisted(token: string): Promise<boolean> {
  const result = await redisClient.exists(`${BLOCKLIST_PREFIX}${token}`)
  return result === 1
}
