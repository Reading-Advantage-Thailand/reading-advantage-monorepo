# syntax=docker/dockerfile:1
#
# Multi-stage Dockerfile for apps/workbooks (Next.js output: "standalone").
# Mirrors apps/codecamp-advantage/Dockerfile — the closest sibling with the
# same Company-SSO standalone shape. next.config.ts sets outputFileTracingRoot
# to the monorepo root, so the standalone trace lands at
# .next/standalone/apps/workbooks/server.js and the runner must serve it from
# that monorepo-relative path.
#
# No secrets are passed as build args or baked into any layer. All COMPANY_AUTH_*
# values and the DATABASE_URL reach the process at runtime via Cloud Run's
# --set-env-vars/--set-secrets (see cloudbuild.yaml). This deliberately departs
# from apps/reading-advantage/Dockerfile, which bakes secrets via ARG/ENV
# (NFR-1).

FROM node:22-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

WORKDIR /app

# ── Deps (cached unless the lockfile or manifest changes) ────────────────────
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .pnpmfile.cjs ./
COPY apps/workbooks ./apps/workbooks
COPY packages ./packages

RUN pnpm install --frozen-lockfile

# ── Builder ──────────────────────────────────────────────────────────────────
FROM deps AS builder

ENV NODE_ENV=production

RUN pnpm turbo run build --filter=workbooks

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Copy the traced standalone server (rooted at the monorepo root, so
# server.js lives at apps/workbooks/server.js) and the static assets.
COPY --from=builder --chown=nextjs:nodejs /app/apps/workbooks/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/workbooks/.next/static ./apps/workbooks/.next/static

USER nextjs

EXPOSE 8080

# Cloud Run injects PORT at runtime (default 8080); the standalone server.js
# honors it, falling back to the ENV default for plain `docker run`.
CMD ["node", "apps/workbooks/server.js"]
