# Plan: Zustand 5 Major Migration

## Phase 1: Contract & Schema Definition

- [b] Task: Audit Zustand 5 breaking changes and current v4 usage in reading-advantage. — deferred:track-owner
- [b] Task: Identify store definitions and middleware that need updating. — deferred:track-owner

## Phase 2: Test

- [b] Task: Add focused tests for store creation under Zustand 5 API. — deferred:track-owner
- [b] Task: Confirm tests fail against the Zustand 4 baseline. — deferred:track-owner

## Phase 3: Implement

- [b] Task: Upgrade Zustand to 5.x in reading-advantage. — deferred:track-owner
- [b] Task: Update store definitions and middleware for Zustand 5 API. — deferred:track-owner
- [b] Task: Run `check-types`, `lint`, and `test` in reading-advantage. — deferred:track-owner

## Phase 4: Validate & Close

- [b] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate. — deferred:track-owner
- [b] Task: Re-run `pnpm outdated` and `pnpm audit`; document results. — deferred:track-owner
- [b] Task: Update `measure/tech-stack.md` with the selected Zustand version. — deferred:track-owner
