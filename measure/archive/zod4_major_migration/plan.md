# Plan: Zod 4 Major Migration

> Coordinated with `zod_boundary_hardening_20260603` — that track owns
> the hardened validation surface (env.ts, parseBody/parseQuery/parsePath,
> 43 unit tests). This track migrates that surface to Zod 4.

## Phase 1: Contract & Schema Definition

- [b] Task: Audit current Zod 3 usage and identify Zod 4 breaking changes. — deferred:track-owner
- [b] Task: Map all schema files across apps and packages. — deferred:track-owner
- [b] Task: Coordinate with `zod_boundary_hardening_20260603` deliverables. — deferred:track-owner

## Phase 2: Test

- [b] Task: Add Zod 4 compatibility tests for existing schemas. — deferred:track-owner
- [b] Task: Confirm tests fail against Zod 3 baseline. — deferred:track-owner

## Phase 3: Implement

- [b] Task: Upgrade Zod from 3.x to 4.x. — deferred:track-owner
- [b] Task: Update all schemas for Zod 4 API changes. — deferred:track-owner
- [b] Task: Update error handling for Zod 4 error format. — deferred:track-owner
- [b] Task: Run `check-types`, `lint`, and `test` across all workspaces. — deferred:track-owner

## Phase 4: Validate & Close

- [b] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate. — deferred:track-owner
- [b] Task: Re-run `pnpm outdated` and `pnpm audit`; document results. — deferred:track-owner
- [b] Task: Update `measure/tech-stack.md` with the selected Zod version. — deferred:track-owner
