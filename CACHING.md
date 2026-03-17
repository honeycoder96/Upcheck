# UptimeMonitor Caching Strategy

## 1. Current State Snapshot

| Layer | What exists today | Status |
|---|---|---|
| **nginx** | 1-year immutable cache on content-hashed assets (`Cache-Control: max-age=31536000, immutable`); `no-cache` on `index.html` | ✓ Done |
| **React Query** | Global `staleTime: 30s`; `refetchInterval: 60s` on live-data hooks | ✓ Partial |
| **Redis** | BullMQ job queues + token blocklist only — **no API response caching** | ✗ Unused |
| **API** | Zero `Cache-Control` response headers on any endpoint | ✗ Missing |
| **CDN** | None | ✗ Missing |

**Problem:** The two most expensive endpoints — `GET /status/:slug` and `GET /dashboard/summary` — run full MongoDB aggregation pipeline scans on every request while the React Query client polls them every 60 seconds. At any meaningful traffic level this generates unnecessary DB load that Redis could absorb for free.

---

## 2. Layer 1 — Redis API Response Cache

Redis is already deployed and underutilized. No new infrastructure is required.

### High-cost endpoints (cache these first)

| Endpoint | Cache Key | TTL | Reason |
|---|---|---|---|
| `GET /status/:slug` | `cache:status:{slug}` | 60s | Client polls every 60s — one DB hit per minute instead of per request |
| `GET /status/:slug/summary` | `cache:status-summary:{slug}` | 60s | Full `CheckLog` collection scan per org on every call |
| `GET /dashboard/summary?range=X` | `cache:dashboard:{orgId}:{range}` | 5 min | Shows trends, not real-time state; 5 min staleness is imperceptible |
| `GET /monitors/:id` | `cache:monitor:{monitorId}` | 30s | 3 parallel queries per request; 30s TTL means at most 1 stale poll per 60s cycle |

### Low-cost but frequently-hit endpoints

| Endpoint | Cache Key | TTL |
|---|---|---|
| `GET /monitors` | `cache:monitors:{orgId}` | 30s |
| `GET /users` | `cache:users:{orgId}` | 5 min |
| `GET /org` | `cache:org:{orgId}` | 10 min |
| `GET /alert-channels` | `cache:alert-channels:{orgId}` | 5 min |

### Implementation pattern

Add `apps/server/src/lib/cache.ts` as a thin wrapper around the existing Redis client:

```typescript
import { redis } from './redis' // existing client

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key)
  return raw ? (JSON.parse(raw) as T) : null
}

export async function cacheSet(key: string, ttlSeconds: number, value: unknown): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value))
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length > 0) await redis.del(...keys)
}
```

Usage pattern in each service:

```typescript
const KEY = `cache:status:${slug}`
const cached = await cacheGet<StatusResponse>(KEY)
if (cached) return cached

const result = await expensiveMongoQuery()
await cacheSet(KEY, 60, result)
return result
```

---

## 3. Layer 2 — HTTP Cache-Control Headers

Adding response headers allows CDN edges and browsers to participate in caching with no additional server work.

### Public status endpoints (`/status/*`)

```
Cache-Control: public, s-maxage=60, stale-while-revalidate=30
```

- `s-maxage=60`: CDN (Cloudflare, Varnish, etc.) caches the response for 60 seconds.
- `stale-while-revalidate=30`: The CDN serves a stale response for up to 30 additional seconds while revalidating in the background, eliminating cold-start latency spikes.
- `public`: Explicitly marks the response as safe to cache in shared caches.

### Authenticated endpoints (`/monitors`, `/dashboard/*`, `/users`, `/org`, `/alert-channels`)

```
Cache-Control: private, no-store
```

- `private`: Prevents CDN/proxy caching — per-user data.
- `no-store`: Belt-and-suspenders; browsers must not store the response.

### Write endpoints (POST / PUT / PATCH / DELETE)

No `Cache-Control` header needed. Browsers and CDNs do not cache non-GET responses by default.

---

## 4. Layer 3 — React Query Tuning

Current global `staleTime: 30_000` is too aggressive for slow-changing data and too lenient for fast-changing data. Align client-side staleness with server-side TTLs so React Query doesn't re-request data that Redis will serve stale anyway.

| Hook | Current staleTime | Recommended | Reason |
|---|---|---|---|
| `useMonitors` | 30s | 30s (keep) | Polled every 60s; keep aligned with server TTL |
| `useMonitorDetail` | 30s | 30s (keep) | Same reasoning |
| `useDashboardSummary` | 30s | **5 min** | Matches `cache:dashboard` TTL — no point fetching before server cache expires |
| `usePublicStatus` | 30s | **60s** | Matches `cache:status` TTL |
| `usePublicSummary` | 30s | **60s** | Matches `cache:status-summary` TTL |
| `useUsers` | 30s | **5 min** | Changes only on explicit admin action |
| `useOrg` | 30s | **10 min** | Changes rarely; org settings are not latency-sensitive |
| `useAlertChannels` | 30s | **5 min** | Changes only on explicit admin action |

Set per-hook (do not change the global default, which is used as a fallback):

```typescript
useQuery({
  queryKey: ['org'],
  queryFn: fetchOrg,
  staleTime: 10 * 60 * 1000,  // 10 min
})
```

---

## 5. Layer 4 — Static Asset CDN

### Option A: Cloudflare (free tier — recommended)

Put Cloudflare in front of the VPS. Zero application code change required.

- **Static assets** (`*.js`, `*.css`, images, fonts): Cloudflare caches automatically at 300+ edge nodes worldwide using the `Cache-Control: immutable` headers nginx already sets.
- **Public status pages**: Create a single Cache Rule:
  - Match: `uptime.honeyhimself.com/api/v1/status/*`
  - Setting: Edge Cache TTL → 60 seconds
- **Authenticated routes**: Cloudflare proxies through without caching because `Cache-Control: private, no-store` prevents shared-cache storage.
- **Free extras**: DDoS mitigation, automatic SSL termination, Bot Fight Mode, Web Analytics.

**Setup:** Change DNS A records to Cloudflare's proxy IPs. Cloudflare handles everything else.

### Option B: BunnyCDN (cheapest paid option — $0.01/GB)

Better for high-traffic static asset delivery when Cloudflare free limits are reached.

1. Create a Pull Zone pointing at the VPS origin.
2. Set `Cache-Control: public, max-age=31536000` on assets (already done by nginx).
3. Purge via BunnyCDN API on every deploy (see Section 6).

### Option C: Self-hosted Varnish (no external CDN)

Add a Varnish container in front of nginx. Cache `GET /api/v1/status/*` with a 60s TTL. Higher ops overhead than Cloudflare; only worthwhile if external CDN is not acceptable.

---

## 6. Cache Purge Scenarios

**Stale cache in a monitoring tool is worse than no cache.** A monitor that transitions `up → down` must appear in the status page within seconds, not after a TTL expires.

### Redis key invalidation

| Event | Keys to purge | Where to add purge call |
|---|---|---|
| Monitor transitions `down` or `up` (worker) | `cache:status:{slug}`, `cache:status-summary:{slug}`, `cache:monitor:{monitorId}`, `cache:monitors:{orgId}` | `check.worker.ts` — after status transition write |
| Monitor created | `cache:monitors:{orgId}`, `cache:dashboard:{orgId}:1d`, `cache:dashboard:{orgId}:7d`, `cache:dashboard:{orgId}:30d` | `monitor.service.ts → createMonitor()` |
| Monitor updated | `cache:monitor:{monitorId}`, `cache:monitors:{orgId}` | `monitor.service.ts → updateMonitor()` |
| Monitor deleted | `cache:monitor:{monitorId}`, `cache:monitors:{orgId}`, `cache:dashboard:{orgId}:*` | `monitor.service.ts → deleteMonitor()` |
| Monitor paused / resumed | `cache:monitor:{monitorId}`, `cache:monitors:{orgId}` | `monitor.service.ts → pauseMonitor()` |
| Monitor visibility toggled (`hidden` ↔ `visible`) | `cache:status:{slug}` | `monitor.service.ts → updateMonitor()` |
| Org slug changed | `cache:status:{oldSlug}`, `cache:status-summary:{oldSlug}`, `cache:org:{orgId}` | `org.service.ts → updateOrg()` |
| User added / deleted | `cache:users:{orgId}` | `users.service.ts` |
| Alert channel changed | `cache:alert-channels:{orgId}` | `alertChannel.service.ts` |
| Heartbeat ping received | `cache:monitor:{monitorId}`, `cache:status:{slug}` | `heartbeat.router.ts` |

### Purge helper utility

Add to `apps/server/src/lib/cache.ts`:

```typescript
export async function invalidateOrgCache(orgId: string, slug?: string): Promise<void> {
  const keys = [
    `cache:monitors:${orgId}`,
    `cache:dashboard:${orgId}:1d`,
    `cache:dashboard:${orgId}:7d`,
    `cache:dashboard:${orgId}:30d`,
    `cache:users:${orgId}`,
    `cache:org:${orgId}`,
    `cache:alert-channels:${orgId}`,
    ...(slug ? [`cache:status:${slug}`, `cache:status-summary:${slug}`] : []),
  ]
  await cacheDel(...keys)
}
```

### Cloudflare CDN purge on deploy

Bust the edge cache when new static assets are deployed. Add to the Dokploy post-deploy hook:

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'
```

Store `CF_ZONE_ID` and `CF_API_TOKEN` as Dokploy environment secrets.

---

## 7. Prioritized Implementation Roadmap

### Phase 1 — Immediate (zero new dependencies; Redis already deployed)

1. Add `apps/server/src/lib/cache.ts` — `cacheGet`, `cacheSet`, `cacheDel`, `invalidateOrgCache`
2. Cache `GET /status/:slug` and `GET /status/:slug/summary` in `status.service.ts` (highest traffic, most expensive DB queries)
3. Cache `GET /dashboard/summary` in `dashboard.service.ts` (full collection scan behind a polling UI)
4. Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=30` header in `status.router.ts`
5. Add purge calls in `check.worker.ts` on every `up`/`down` status transition

### Phase 2 — Client-side tuning (no backend changes)

6. Increase `staleTime` on slow-changing hooks: `useUsers`, `useOrg`, `useAlertChannels`, `useDashboardSummary`, `usePublicStatus`, `usePublicSummary`

### Phase 3 — CDN (external, one-time setup)

7. Enable Cloudflare free tier on `honeyhimself.com` (DNS change only)
8. Create Cloudflare Cache Rule for `/api/v1/status/*` → Edge TTL 60s
9. Add Cloudflare cache purge step to Dokploy post-deploy hook

### Phase 4 — Remaining endpoints

10. Cache `GET /monitors/:id` with 30s TTL + purge in `check.worker.ts` on status change
11. Cache `GET /monitors`, `GET /users`, `GET /org`, `GET /alert-channels` with respective TTLs
12. Add purge calls in all service mutation methods (create, update, delete)

---

## Files to Modify (Phase 1)

| File | Change |
|---|---|
| `apps/server/src/lib/cache.ts` | **New file** — Redis get/set/del helpers + `invalidateOrgCache` |
| `apps/server/src/services/status.service.ts` | Wrap `getPublicStatus()` and `getPublicSummary()` with Redis cache |
| `apps/server/src/services/dashboard.service.ts` | Wrap `getDashboardSummary()` with Redis cache |
| `apps/server/src/workers/check.worker.ts` | Call `cacheDel` on status transition |
| `apps/server/src/routes/status.router.ts` | Add `Cache-Control` response header on public endpoints |

---

## Verification Checklist (Phase 1)

After implementing Phase 1, verify each layer works:

1. **Redis keys appear:** `redis-cli KEYS "cache:*"` — confirm keys exist after the first request hits each cached endpoint.
2. **Cache hit is fast:** Make two rapid requests to `GET /api/v1/status/:slug` — the second response should be ~1ms (Redis) vs ~100ms+ (MongoDB).
3. **Status transition purges cache:** Manually set a monitor down → confirm `cache:status:{slug}` is deleted immediately from Redis before the next poll.
4. **Org slug purge:** Change an org slug → confirm the old slug's Redis keys no longer exist.
5. **Response header present:** `curl -I https://uptime.honeyhimself.com/api/v1/status/{slug}` → response must include `Cache-Control: public, s-maxage=60, stale-while-revalidate=30`.
6. **Authenticated routes not cached:** `curl -I` on `/api/v1/monitors` → must include `Cache-Control: private, no-store`.
