# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .pnpmfile.cjs ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM deps AS builder
ENV NODE_ENV=production
# NEXT_PUBLIC_* vars are inlined at build time; the bucket name must be present.
ARG NEXT_PUBLIC_STORAGE_BUCKET_NAME
ENV NEXT_PUBLIC_STORAGE_BUCKET_NAME=${NEXT_PUBLIC_STORAGE_BUCKET_NAME}
RUN pnpm turbo run build --filter=primary-advantage

FROM node:22-alpine AS runner
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/primary-advantage/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/primary-advantage/.next/static ./apps/primary-advantage/.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "apps/primary-advantage/server.js"]
