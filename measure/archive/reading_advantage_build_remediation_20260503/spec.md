# Spec: Reading-Advantage Build Remediation

## Problem

reading-advantage has `ignoreBuildErrors: true` / `ignoreDuringBuilds: true` as a temporary workaround. The app has 128 lint warnings, 26 failed test suites (37 tests), and pre-existing TypeScript errors that must be fixed incrementally.

## Goals

- Remove `ignoreBuildErrors` and `ignoreDuringBuilds` from next.config.ts
- Fix all TypeScript compilation errors
- Reduce lint warnings from 128 to 0
- Restore failing test suites to passing

## Non-Goals

- Migrating from Prisma to Drizzle (separate track)
- ESLint v8 to v9 migration (separate track)
- Zustand v4 to v5 upgrade (separate track)

## Acceptance Criteria

- [ ] `next.config.ts` has `ignoreBuildErrors: false` and `ignoreDuringBuilds: false`
- [ ] `pnpm turbo run build --filter=reading-advantage` exits 0
- [ ] `pnpm turbo run lint --filter=reading-advantage` has 0 errors and 0 warnings
- [ ] `pnpm turbo run test --filter=reading-advantage` passes all suites
- [ ] Unit tests cover any new utility functions added during remediation
