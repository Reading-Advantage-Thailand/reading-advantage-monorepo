# Plan: Drizzle 0.45 Major Migration

> **Prisma 7 is explicitly rejected.** primary-advantage will migrate
> off Prisma to Drizzle, not to Prisma 7. This track upgrades Drizzle
> only; the Prisma removal is owned by a separate track.

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit Drizzle 0.45 breaking changes and current schema usage.
- [ ] Task: Map all Drizzle schema files and migration scripts.
- [ ] Task: Confirm Prisma 7 rejection and document rationale.

## Phase 2: Test

- [ ] Task: Add schema compatibility tests for Drizzle 0.45 API.
- [ ] Task: Add migration smoke tests against a fresh database.
- [ ] Task: Confirm tests fail against the current Drizzle baseline.

## Phase 3: Implement

- [ ] Task: Upgrade Drizzle to 0.45 across all workspaces.
- [ ] Task: Update schema definitions for the new API.
- [ ] Task: Update migration scripts for the new format.
- [ ] Task: Update `drizzle-zod` integration.
- [ ] Task: Run `check-types`, `lint`, `test`, and migration gates.

## Phase 4: Validate & Close

- [ ] Task: Run full `pnpm turbo run lint|test|check-types|build` aggregate gate.
- [ ] Task: Re-run `pnpm outdated` and `pnpm audit`; document results.
- [ ] Task: Update `measure/tech-stack.md` with the selected Drizzle version.
