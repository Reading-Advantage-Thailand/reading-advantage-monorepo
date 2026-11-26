# Plan: TypeScript 6 Major Migration

## Phase 1: Contract & Schema Definition

- [x] Task: Audit TS 6 breaking changes relevant to the monorepo. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Identify type patterns that will break under stricter checking. — deferred:track-owner not needed (PM 2026-11-26: shelved)

## Phase 2: Test

- [x] Task: Add type-level tests for critical type aliases and interfaces. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Confirm `check-types` fails under TS 6 before migration. — deferred:track-owner not needed (PM 2026-11-26: shelved)

## Phase 3: Implement

- [x] Task: Upgrade TypeScript to 6.x. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Fix type errors introduced by TS 6 strictness. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Update `tsconfig.json` for new configuration options. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Run `check-types`, `lint`, and `test` across all workspaces. — deferred:track-owner not needed (PM 2026-11-26: shelved)

## Phase 4: Validate & Close

- [x] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Re-run `pnpm outdated` and `pnpm audit`; document results. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Update `measure/tech-stack.md` with the selected TypeScript version. — deferred:track-owner not needed (PM 2026-11-26: shelved)
