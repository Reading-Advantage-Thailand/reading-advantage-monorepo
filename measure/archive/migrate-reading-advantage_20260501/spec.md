# Specification: Migrate reading-advantage into Monorepo

## Context

reading-advantage is the core Reading Advantage platform — a reading comprehension web app built with Next.js 15, Prisma, and Firebase Auth. It currently lives at `/Desktop/reading-advantage/web/` as a standalone repo with `package-lock.json`, Tailwind v3, Jest, and legacy Firebase Auth integration.

The `functions/` directory contains server-side data processing scripts (article/question/audio generation) — NOT Firebase Cloud Functions. These need to be audited and preserved as a workspace package if still relevant.

## Goals

1. Copy web app source into `apps/reading-advantage/`
2. Convert from `package-lock.json` to pnpm workspace deps
3. Deconflict shared dependencies with existing monorepo packages (`@reading-advantage/ui`, `@reading-advantage/utils`, `@reading-advantage/config`)
4. Audit Firebase usage — separate Auth (still needed) from Firestore (legacy, migrating to Postgres)
5. Preserve `functions/` as `packages/reading-advantage-scripts/` (audited, relevant scripts only)
6. Ensure the app builds, lints, and tests pass in the monorepo context

## Acceptance Criteria

- [ ] `apps/reading-advantage/` exists with full web app source
- [ ] `package.json` uses `workspace:*` for shared packages where applicable
- [ ] `pnpm install` succeeds from monorepo root
- [ ] `turbo run build --filter=reading-advantage` succeeds
- [ ] `turbo run lint --filter=reading-advantage` passes (or known warnings documented)
- [ ] `turbo run test --filter=reading-advantage` runs (baseline failures documented)
- [ ] Firebase Auth integration preserved and working
- [ ] Firestore data types audited — Prisma equivalents identified where applicable
- [ ] Relevant `functions/` scripts preserved in `packages/reading-advantage-scripts/`
- [ ] Tech debt items added for any deferred work

## Out of Scope

- Migrating Firebase Auth to a different provider (future track)
- Upgrading Tailwind v3 → v4 (future track, or part of shared config unification)
- Prisma schema migration/deconfliction with other apps (future track)
- Removing all Firestore references (audit + plan only, implementation deferred)
