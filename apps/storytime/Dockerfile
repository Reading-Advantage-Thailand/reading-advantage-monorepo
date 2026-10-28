# syntax=docker/dockerfile:1

# The Storytime app image (spec FR-1, plan task 1.2). The build context is the monorepo root,
# so the standalone trace can follow shared workspace packages, as the Primary image does.
FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# pnpm 11 reads only pnpm_config_* env (npm_config_* is ignored). The local link resets under the default 64 parallel downloads, so the install uses 16 and more retries. The cache mount keeps downloaded packages between builds, so a retry continues; the lockfile check does not change. The metadata cache mount keeps the release-age metadata between builds.
ENV pnpm_config_fetch_retries=5
ENV pnpm_config_fetch_timeout=300000
ENV pnpm_config_network_concurrency=16
ENV pnpm_config_store_dir=/pnpm/store
ENV pnpm_config_cache_dir=/pnpm/cache
# Storytime does not use a browser; the puppeteer postinstall downloads Chrome during the install.
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
WORKDIR /app

# The workspace holds 46 projects. A full-workspace install wrote 2075 packages, and the local
# build hit its 20-minute limit four times (plan Phase 1 Green evidence, attempts 5 to 12).
# This stage copies only the Storytime closure. Turbo then writes a pruned lockfile of 663
# entries, so the install writes 532 packages and the supply-chain check reads 663 entries.
FROM base AS pruner
# Turbo reads the root manifests and the directories of the workspace projects that it walks.
# Add one COPY line when the Storytime app gains a workspace dependency (Phase 2 adds read-along).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .pnpmfile.cjs ./
COPY apps/storytime ./apps/storytime
COPY packages/config ./packages/config
COPY packages/read-along ./packages/read-along
# The turbo version is the version resolved in pnpm-lock.yaml. The two cache mounts hold the
# turbo tarball and its metadata between builds, as the install below does.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store --mount=type=cache,id=pnpm-cache,target=/pnpm/cache pnpm dlx turbo@2.9.18 prune storytime --docker

FROM base AS deps
# out/json holds the root and the closure manifests, the pruned lockfile, and the workspace file.
# Turbo writes no .pnpmfile.cjs, so the install copies it from the pruner stage.
COPY --from=pruner /app/out/json/ ./
COPY --from=pruner /app/.pnpmfile.cjs ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store --mount=type=cache,id=pnpm-cache,target=/pnpm/cache pnpm install --frozen-lockfile

FROM deps AS builder
ENV NODE_ENV=production
# out/full holds the source of the closure, so the trace needs no other app or package.
COPY --from=pruner /app/out/full/ ./
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
