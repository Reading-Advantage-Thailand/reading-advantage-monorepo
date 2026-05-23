# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@8.15.8 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile

FROM deps AS builder

ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NODE_ENV=production

RUN pnpm turbo run build --filter=www-reading-advantage

FROM node:22-alpine AS runner

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/www-reading-advantage/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/www-reading-advantage/.next/static ./apps/www-reading-advantage/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/www-reading-advantage/public ./apps/www-reading-advantage/public

USER nextjs

EXPOSE 8080

CMD ["node", "apps/www-reading-advantage/server.js"]
