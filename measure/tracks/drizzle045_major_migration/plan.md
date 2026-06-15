# Plan: Drizzle 0.45 Major Migration

> **Prisma 7 is explicitly rejected.** primary-advantage will migrate
> off Prisma to Drizzle, not to Prisma 7. This track upgrades Drizzle
> only; the Prisma removal is owned by a separate track.

## Phase 1: Contract & Schema Definition

> **Red-phase plan note (MID):** Phase 1 is an audit-only phase. Its
> deliverables are three Markdown artifacts under
> `measure/tracks/drizzle045_major_migration/`:
>
> - `phase1-breaking-changes.md` — Drizzle 0.45 breaking-change list vs
>   the 0.44.7 baseline, cross-referenced with current schema usage.
> - `phase1-schema-map.md` — Map of every Drizzle schema file
>   (`packages/db/src/schema/*.ts`) and migration script
>   (`packages/db/drizzle/0000_*.sql` … `0020_*.sql`).
> - `phase1-prisma-7-rejection.md` — Prisma 7 rejection rationale.
>
> No live-behavior proof is required for these audit deliverables;
> the Phase 1 acceptance gate is the supervisor review of the artifacts
> against the Red contract test
> `packages/db/src/__tests__/drizzle045-phase1-contracts.test.ts`.
> The Green phase (next role) writes the three Markdown files to make
> the contract test pass.
>
> **Red command (executed by MID):**
>
> ```
> pnpm --filter @reading-advantage/db exec vitest run \
>   src/__tests__/drizzle045-phase1-contracts.test.ts
> ```
>
> **Red result:** 17 tests — **15 failed, 2 passed**.
> Failures: every contract assertion for the three missing Markdown
> artifacts (5 each). Passes: the two live-surface guardrail probes
> that confirm `packages/db/src/schema/` contains all 15 expected
> schema files (including the dirty-worktree `marketing.ts`) and
> `packages/db/drizzle/` contains all 21 expected migration SQL
> files (0000–0020). These probes prove the filesystem surface the
> audit must cover; the artifact-content assertions fail because the
> Markdown deliverables have not been written yet.
>
> **Dirty worktree classification at Red start:**
>
> - RELEVANT (folded into Red contract): `packages/db/src/schema/index.ts`
>   (adds `export * from "./marketing.js"`); the schema-map contract
>   asserts the 15-file surface that includes `marketing.ts`. The
>   marketing.ts dirty commit itself is owned by its originating role
>   and is NOT included in this Red-phase commit.
> - IGNORABLE: `apps/marketing/next-env.d.ts` (auto-generated Next.js).
> - UNRELATED user work (preserved untouched in this commit):
>   `apps/marketing/package.json`, `apps/marketing/vite.config.ts`
>   (Next.js 16 / vinext migration); `measure/automation-supervisor.py`
>   (supervisor model defaults); `pnpm-lock.yaml` (derived from
>   apps/marketing edits).
> - OUR prior setup work (already committed by setup role, NOT in this
>   Red-phase commit): `measure/tracks/drizzle045_major_migration/test-strategy.md`.

- [~] Task: Audit Drizzle 0.45 breaking changes and current schema usage.
- [~] Task: Map all Drizzle schema files and migration scripts.
- [~] Task: Confirm Prisma 7 rejection and document rationale.

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
