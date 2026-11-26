# Plan: Zustand 5 Major Migration

## Phase 1: Contract & Schema Definition

- [x] Task: Audit Zustand 5 breaking changes and current v4 usage in reading-advantage. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Identify store definitions and middleware that need updating. — deferred:track-owner not needed (PM 2026-11-26: shelved)

## Phase 2: Test

- [x] Task: Add focused tests for store creation under Zustand 5 API. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Confirm tests fail against the Zustand 4 baseline. — deferred:track-owner not needed (PM 2026-11-26: shelved)

## Phase 3: Implement

- [x] Task: Upgrade Zustand to 5.x in reading-advantage. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Update store definitions and middleware for Zustand 5 API. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Run `check-types`, `lint`, and `test` in reading-advantage. — deferred:track-owner not needed (PM 2026-11-26: shelved)

## Phase 4: Validate & Close

- [x] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Re-run `pnpm outdated` and `pnpm audit`; document results. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Update `measure/tech-stack.md` with the selected Zustand version. — deferred:track-owner not needed (PM 2026-11-26: shelved)
