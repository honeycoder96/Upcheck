# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/client/package*.json ./apps/client/
COPY packages/shared/package*.json ./packages/shared/
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Stage 2: Development
FROM base AS development
COPY . .
CMD ["npm", "run", "dev", "--workspace=apps/client", "--", "--host", "0.0.0.0"]

# Stage 3: Builder — Vite resolves @uptimemonitor/shared via vite.config.ts alias
FROM base AS builder
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY . .
RUN npm run build --workspace=apps/client

# Stage 4: Production — nginx serving static SPA + API proxy
FROM nginx:alpine AS production
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
