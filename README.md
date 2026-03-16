# UptimeMonitor

A self-hosted uptime monitoring platform. Track the availability of your HTTP endpoints, TCP ports, DNS records, and SSL certificates — then alert your team via Email, Webhook, Telegram, or Slack when something goes wrong.

---

## Features

- **Monitor types** — HTTP/HTTPS, Keyword match, TCP port, Ping, SSL certificate expiry
- **Flexible check intervals** — 1, 5, 15, 30, or 60 minutes per monitor
- **Alert channels** — Email (Resend), Webhook, Telegram bot, Slack incoming webhook
- **Test connection** — Verify Telegram and Slack channels before saving
- **Public status page** — Shareable `/status/:slug` page with 90-day uptime history bars per monitor (Statuspage.io-style)
- **Incident tracking** — Automatic incident creation and resolution with duration
- **SSL expiry alerts** — Configurable advance warning threshold
- **Dashboard** — Org-wide uptime %, incident count, monitor health overview
- **Multi-user** — Role-based access (admin / viewer) per organisation
- **Dark mode** — Full light/dark theme support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui, React Query, React Router |
| Backend | Node.js 20, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Queue | BullMQ + Redis |
| Email | Resend |
| Validation | Zod (shared between client and server) |
| Monorepo | npm workspaces |
| Containers | Docker + Docker Compose |

---

## Architecture

```
uptimemonitor/
├── apps/
│   ├── client/          # React + Vite SPA
│   └── server/          # Express API + BullMQ worker
│       ├── src/
│       │   ├── routes/      # REST API endpoints
│       │   ├── services/    # Business logic
│       │   ├── models/      # Mongoose models
│       │   ├── workers/     # Alert dispatch worker
│       │   ├── emails/      # React Email templates
│       │   └── lib/         # Config, DB, Redis, queue
└── packages/
    └── shared/          # Zod schemas + constants shared by client & server
```

The server runs two processes:
- **API server** (`src/index.ts`) — handles all REST requests
- **Worker** (`src/worker.ts`) — processes alert jobs from the BullMQ queue

---

## Prerequisites

- Node.js 20+
- MongoDB 6+
- Redis 7+

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/uptimemonitor.git
cd uptimemonitor
npm install
```

### 2. Configure environment

```bash
cp apps/server/.env.example apps/server/.env
```

Edit `apps/server/.env` and fill in the required values (see [Environment Variables](#environment-variables) below).

The client has no required env vars for local development — it proxies API calls through Vite.

### 3. Seed the database

Creates your first organisation and admin user:

```bash
npm run seed --workspace=apps/server
```

### 4. Start development servers

```bash
# Start both client and server in watch mode
npm run dev

# Or individually
npm run dev:server
npm run dev:client
```

The API runs at `http://localhost:3000` and the client at `http://localhost:5173`.

---

## Docker

### Development

```bash
docker compose -f docker-compose.dev.yml up
```

### Production

Copy and fill in the production env file:

```bash
cp apps/server/.env.example .env.prod
# edit .env.prod with production values
```

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

The production stack serves the frontend on port `3011` (configurable) via nginx, which also reverse-proxies `/api/*` to the API container.

---

## Environment Variables

All variables are defined in `apps/server/.env.example`.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `REDIS_URI` | Yes | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | Secret for signing access tokens (use a long random string) |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens (use a different long random string) |
| `JWT_ACCESS_EXPIRY` | No | Access token lifetime, default `15m` |
| `JWT_REFRESH_EXPIRY` | No | Refresh token lifetime, default `7d` |
| `RESEND_API_KEY` | No | [Resend](https://resend.com) API key — required for email alerts |
| `RESEND_FROM_EMAIL` | No | Sender address for alert emails |
| `RESEND_REPLY_TO` | No | Reply-to address for alert emails |
| `CORS_ORIGIN` | No | Allowed CORS origin, default `http://localhost:5173` |
| `APP_URL` | No | Public URL of the frontend, used in email links |
| `SEED_ORG_NAME` | No | Organisation name created by the seed script |
| `SEED_ORG_SLUG` | No | URL slug for the organisation's public status page |
| `SEED_USER_EMAIL` | No | Admin user email created by the seed script |
| `SEED_USER_PASSWORD` | No | Admin user password created by the seed script |

> **Security note:** Use strong random strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production. You can generate them with `openssl rand -hex 64`.

---

## Alert Channels

### Email
Requires a [Resend](https://resend.com) account and API key. Free tier supports 3,000 emails/month.

### Webhook
POST requests to any URL. Optionally sign payloads with an HMAC-SHA256 secret (sent as `X-Signature-256` header).

### Telegram
1. Message [@BotFather](https://t.me/BotFather) on Telegram and create a bot — copy the bot token
2. Start a conversation with your bot (press **Start**)
3. Get your Chat ID by messaging [@userinfobot](https://t.me/userinfobot)
4. Enter the token and Chat ID in the app, then click **Test Connection**

### Slack
1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create an app
2. Enable **Incoming Webhooks** and add it to a channel
3. Copy the webhook URL and paste it in the app, then click **Test Connection**

---

## Public Status Page

Each organisation has a public status page at `/status/:slug` (no login required). It shows:
- Overall system status banner
- 90-day uptime history bar per monitor (green = up, red = down, grey = no data)
- Per-monitor uptime percentage (30-day)
- Live status indicator
- Recent incidents

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a pull request

---

## License

MIT
