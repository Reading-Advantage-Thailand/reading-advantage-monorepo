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

# Owner rule: no ElvGames asset in the image. The standalone trace also copies ElvGames files of other apps
# (spec E-7, asset-copy.md). Delete them here, in the builder stage, so no runner layer holds the bytes.
# The guard test lib/__tests__/removed-surfaces.test.ts reads this line.
RUN rm -rf /app/apps/primary-advantage/.next/standalone/apps/advantage-games/public/assets/apk/standard-pack-qc /app/apps/primary-advantage/.next/standalone/apps/reading-advantage/public/assets/apk/standard-pack-qc /app/apps/primary-advantage/.next/standalone/apps/advantage-games/scripts/generate-standard-pack-qc-preview.mjs /app/apps/primary-advantage/.next/standalone/apps/advantage-games/src/lib/apk/standard-pack-qc-preview.json

FROM node:22-alpine AS runner
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/primary-advantage/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/primary-advantage/.next/static ./apps/primary-advantage/.next/static
# Standalone output traces only the public files the code references; the packs, the 2D sprite
# pack, the RPG skin, and the fonts are served by URL and must be copied in full.
COPY --from=builder --chown=nextjs:nodejs /app/apps/primary-advantage/public ./apps/primary-advantage/public
USER nextjs
EXPOSE 8080
CMD ["node", "apps/primary-advantage/server.js"]
