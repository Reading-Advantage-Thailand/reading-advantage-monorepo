# Plan: Zod 4 Major Migration

> Coordinated with `zod_boundary_hardening_20260603` — that track owns
> the hardened validation surface (env.ts, parseBody/parseQuery/parsePath,
> 43 unit tests). This track migrates that surface to Zod 4.

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit current Zod 3 usage and identify Zod 4 breaking changes.
- [ ] Task: Map all schema files across apps and packages.
- [ ] Task: Coordinate with `zod_boundary_hardening_20260603` deliverables.

## Phase 2: Test

- [ ] Task: Add Zod 4 compatibility tests for existing schemas.
- [ ] Task: Confirm tests fail against Zod 3 baseline.

## Phase 3: Implement

- [ ] Task: Upgrade Zod from 3.x to 4.x.
- [ ] Task: Update all schemas for Zod 4 API changes.
- [ ] Task: Update error handling for Zod 4 error format.
- [ ] Task: Run `check-types`, `lint`, and `test` across all workspaces.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected Zod version.
