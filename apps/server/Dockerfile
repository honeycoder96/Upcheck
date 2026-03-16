# Stage 1: Base — install all workspace deps
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
COPY packages/shared/package*.json ./packages/shared/
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage 2: Development
FROM base AS development
COPY . .
CMD ["npm", "run", "dev", "--workspace=apps/server"]

# Stage 3: Builder — tsup bundles server + shared inline
FROM base AS builder
COPY . .
RUN npm run build --workspace=apps/server

# Stage 4: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Copy package manifests for npm ci (creates node_modules for runtime deps)
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
COPY packages/shared/package*.json ./packages/shared/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev
# Copy tsup bundled output (index.js, worker.js, scripts/seed.js)
COPY --from=builder /app/apps/server/dist ./apps/server/dist
EXPOSE 3000
CMD ["node", "apps/server/dist/index.js"]
