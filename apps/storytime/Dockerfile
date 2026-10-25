# syntax=docker/dockerfile:1

# The Storytime app image (spec FR-1, plan task 1.2). The build context is the monorepo root,
# so the standalone trace can follow shared workspace packages, as the Primary image does.
FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# The image install fetches the whole workspace fresh; tolerate a slow registry response.
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_timeout=300000
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .pnpmfile.cjs ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM deps AS builder
ENV NODE_ENV=production
RUN pnpm turbo run build --filter=storytime

FROM node:22-alpine AS runner
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run serves the container on 8080 (task 1.2).
ENV PORT=8080
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/storytime/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/storytime/.next/static ./apps/storytime/.next/static
USER nextjs
EXPOSE 8080
CMD ["node", "apps/storytime/server.js"]
