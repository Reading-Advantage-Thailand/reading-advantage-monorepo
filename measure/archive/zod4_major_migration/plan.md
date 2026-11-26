# Plan: Zod 4 Major Migration

> Coordinated with `zod_boundary_hardening_20260603` — that track owns
> the hardened validation surface (env.ts, parseBody/parseQuery/parsePath,
> 43 unit tests). This track migrates that surface to Zod 4.

## Phase 1: Contract & Schema Definition

- [x] Task: Audit current Zod 3 usage and identify Zod 4 breaking changes. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Map all schema files across apps and packages. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Coordinate with `zod_boundary_hardening_20260603` deliverables. — deferred:track-owner not needed (PM 2026-11-26: shelved)

## Phase 2: Test

- [x] Task: Add Zod 4 compatibility tests for existing schemas. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Confirm tests fail against Zod 3 baseline. — deferred:track-owner not needed (PM 2026-11-26: shelved)

## Phase 3: Implement

- [x] Task: Upgrade Zod from 3.x to 4.x. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Update all schemas for Zod 4 API changes. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Update error handling for Zod 4 error format. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Run `check-types`, `lint`, and `test` across all workspaces. — deferred:track-owner not needed (PM 2026-11-26: shelved)

## Phase 4: Validate & Close

- [x] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Re-run `pnpm outdated` and `pnpm audit`; document results. — deferred:track-owner not needed (PM 2026-11-26: shelved)
- [x] Task: Update `measure/tech-stack.md` with the selected Zod version. — deferred:track-owner not needed (PM 2026-11-26: shelved)
