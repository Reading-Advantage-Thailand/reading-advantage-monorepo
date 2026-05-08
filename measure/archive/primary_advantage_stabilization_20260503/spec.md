# Spec: Primary-Advantage Stabilization

## Problem

primary-advantage has `ignoreBuildErrors: true` / `ignoreDuringBuilds: true`, 49 lint errors, 74 warnings, zero tests, and a separate Prisma schema. The app is the least stable in the monorepo.

## Goals

- Remove `ignoreBuildErrors` and `ignoreDuringBuilds` from next.config.ts
- Fix all 49 lint errors and reduce warnings
- Add Vitest test suite for new backend code
- Document Prisma schema boundary with reading-advantage

## Non-Goals

- Migrating Prisma to Drizzle (deferred — Prisma schema is separate domain)
- NextAuth removal (handled by unified_auth track)
- Visual redesign

## Acceptance Criteria

- [ ] `next.config.ts` has `ignoreBuildErrors: false` and `ignoreDuringBuilds: false`
- [ ] `pnpm turbo run build --filter=primary-advantage` exits 0
- [ ] `pnpm turbo run lint --filter=primary-advantage` has 0 errors
- [ ] Vitest test suite added with ≥5 passing tests for core functionality
- [ ] Prisma schema boundary documented in schema README
