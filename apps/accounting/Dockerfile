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

RUN pnpm turbo run build --filter=accounting

FROM deps AS runner-bundle

RUN pnpm --filter accounting exec esbuild app/lib/intake-runner.ts \
    --bundle --platform=node --format=esm --target=node22 \
    --banner:js='import{createRequire as __cr}from"node:module";const require=__cr(import.meta.url);' \
    --outfile=/app/dist/intake-runner.mjs

FROM node:22-alpine AS runner

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/accounting/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/accounting/.next/static ./apps/accounting/.next/static
COPY --from=runner-bundle --chown=nextjs:nodejs /app/dist/intake-runner.mjs ./dist/intake-runner.mjs

USER nextjs

EXPOSE 8080

CMD ["node", "apps/accounting/server.js"]
