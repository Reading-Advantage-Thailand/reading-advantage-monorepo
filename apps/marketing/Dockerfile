# syntax=docker/dockerfile:1
#
# Multi-stage Dockerfile for the vinext-based marketing app.
#
# vinext ≠ Next.js standalone — it builds to dist/{client,server} and
# serves via `vinext start`. The runner stage ships dist/ + node_modules
# (including vinext itself) because vinext does not emit a standalone
# server.js. This is a pragmatic choice; see tech-debt for slim-container
# follow-up.

# ── Base ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

WORKDIR /app

# ── Deps (cached unless lockfile changes) ──────────────────────────────
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json .pnpmfile.cjs ./
COPY apps/marketing/package.json apps/marketing/
COPY packages/ ./packages

RUN pnpm install --filter marketing... --frozen-lockfile

# ── Builder ────────────────────────────────────────────────────────────
FROM deps AS builder

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN pnpm turbo run build --filter=marketing

# ── Runner ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

# Copy the built vinext output
COPY --from=builder --chown=appuser:appgroup /app/apps/marketing/dist ./dist

# Copy the minimal monorepo structure needed for pnpm's symlinked
# node_modules to resolve correctly at runtime
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=appuser:appgroup /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=appuser:appgroup /app/apps/marketing/package.json ./apps/marketing/package.json
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

USER appuser

EXPOSE 8080

# vinext start reads PORT/HOSTNAME from env and boots the production server
CMD ["node", "./node_modules/vinext/dist/cli.js", "start"]
