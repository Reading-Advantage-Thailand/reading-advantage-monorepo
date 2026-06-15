# Code Review — drizzle045_major_migration — 2026-06-16

## Summary of Changes

In the last 24 hours the track progressed through Phases 1–3 and started Phase 4:

- **Phase 1 — Audit / Contract:** Added the Red contract test
  `drizzle045-phase1-contracts.test.ts` and an adversarial complement, then authored
  the three required audit artifacts:
  `phase1-breaking-changes.md`, `phase1-schema-map.md`,
  `phase1-prisma-7-rejection.md`. Phase 1 tests are green.
- **Phase 2 — Schema & Migration Format:** Added
  `drizzle045-schema-compile.test.ts`, `drizzle045-migration-format.test.ts`, and
  the intentionally-red `drizzle045-zod-contract.test.ts`. Bumped `drizzle-orm` to
  `0.45.2` (root `pnpm.overrides` + `packages/db` dep), re-exported
  `./marketing.js` from `packages/db/src/schema/index.ts`, and updated the 0.44.7-era
  migrations with `--> statement-breakpoint` separators, leading headers, and
  double-quoted identifiers. Added Phase 2 adversarial hardening. Phase 2 tests are
  green.
- **Phase 3 — Integration:** Added `drizzle045-phase3-integration-gates.test.ts`,
  bumped `drizzle-kit` to `^0.31.7`, installed `drizzle-zod@^0.7.0`, and added
  adversarial zod coverage. Phase 3 tests are green.
- **Phase 4 — Validate & Close:** Added the Red closure-gate contract
  `drizzle045-phase4-closure-gates.test.ts` pinning `measure/tech-stack.md` update
  and two closure records. Phase 4 implementation has **not** been done yet; the
  test is intentionally red (10 fail / 2 pass).

## Spec Alignment

| Spec AC | Status | Notes |
|---|---|---|
| 1. Drizzle 0.45 across all workspaces | **Met** | Root `pnpm.overrides` pins `0.45.2`; `packages/db` declares `^0.45.0`. `pnpm outdated -r` evidence is still pending in Phase 4. |
| 2. All schema definitions compile under the new API | **Met at runtime** | Phase 2 schema-compile tests pass. `check-types` still reports pre-existing TypeScript errors in test files only (stricter `PgTableWithColumns` typing), not in production schema. |
| 3. All migrations run cleanly against a fresh database | **Partial / Risk** | Migration-format tests pass, but running `drizzle-kit generate` against the current schema produced a new migration (`0021`) for the `marketing` tables, so the migration set is not in sync with the schema. Real `drizzle-kit migrate` against a fresh DB has not been run. |
| 4. All existing tests pass | **Met at runtime** | Full `packages/db` suite: 28 passed, 2 skipped, 1 failed file (Phase 4 closure gate, expected red). Root `npm test`: 27/27 passed. |
| 5. `drizzle-zod` integration updated | **Met** | `drizzle-zod@^0.7.0` installed; `createInsertSchema` / `createSelectSchema` exports and users-table round-trip tests pass. |
| 6. Prisma 7 is not adopted | **Met** | Explicit rejection documented in `phase1-prisma-7-rejection.md` and spec. |
| 7. `pnpm outdated -r` shows Drizzle at target | **Pending** | Owned by Phase 4; no closure record yet. |
| 8. Documentation updated in `measure/tech-stack.md` | **Pending** | No Drizzle row in the "Selected Shared Versions" table yet. |

## Code Quality Observations

- **Strengths:** Strong Red/Green/adversarial test discipline; clear plan notes with
  commit SHAs and verification results; lockfile-consistency regression tests;
  migration format brought into 0.45 generator style; schema barrel fixed;
  `drizzle-zod` integration validated with happy-path and negative-path parsing.
- **Marketing schema migration gap:** `packages/db/src/schema/marketing.ts` is now
  exported from the schema barrel, but no migration captures its tables, enums,
  indexes, or foreign keys. This is the most significant quality gap.
- **Test-only TypeScript errors:** `drizzle045-schema-compile.test.ts` and
  `drizzle045-phase2-contracts-adversarial.test.ts` have `TS2345`/`TS2352` errors
  caused by Drizzle 0.45's stricter table types. They pass at runtime, but they
  will fail `check-types` in the aggregate gate.
- **Vite warning:** The dynamic import `import(\`../schema/${sourceFile}\`)` in
  `drizzle045-schema-compile.test.ts` triggers an SSR dynamic-import-vars warning.
  A comment explains why the alternative pattern fails, but the warning remains.
- **Minor version-expectation drift:** `test-strategy.md` §7 expects
  `drizzle-kit 0.32+`, while the Phase 3 test asserts `>=0.31.7` because no stable
  0.32 release exists. The plan notes this should be reconciled in Phase 4.
- **Unrelated worktree noise:** There are uncommitted changes outside this track
  (e.g., `apps/reading-advantage/lib/enums.ts`, `apps/science-advantage/*`,
  deleted `prisma_drizzle_slice_cleanup_20260505` track). They do not affect the
  drizzle045 changes but add context clutter.

## Risks / Blockers

1. **Missing marketing migration** blocks AC 3. A fresh `drizzle-kit migrate` will
   not create the marketing tables, and `drizzle-kit generate` is not zero-diff.
2. **Phase 4 is incomplete.** The closure-gate test is red by design until
   `phase4-aggregate-gate.md`, `phase4-outdated-audit.md`, and the
   `measure/tech-stack.md` Drizzle row are added.
3. **`check-types` failures in test files** will likely fail the aggregate
   `pnpm turbo run check-types` gate unless fixed or excluded from type-checking.
4. **Real DB smoke test not performed.** Neither `drizzle-kit generate` zero-diff
   nor `drizzle-kit migrate` against a fresh Docker DB has been demonstrated.
5. **`pnpm outdated -r` / `pnpm audit`** have not been run yet.

## Recommended Next Actions

1. **Resolve the marketing migration gap:** either generate and commit a migration
   for the `marketing` schema, or remove the `marketing.js` barrel export if the
   schema is not yet ready for production. Re-verify `drizzle-kit generate` shows
   no diff.
2. **Run and record the Phase 4 aggregate gate:** execute
   `pnpm turbo run lint test check-types build`, fix the test-only TypeScript
   errors (or exclude `__tests__` from `check-types`), and write
   `phase4-aggregate-gate.md`.
3. **Run `pnpm outdated -r` and `pnpm audit`** and record the results in
   `phase4-outdated-audit.md`.
4. **Update `measure/tech-stack.md`** by adding a Drizzle 0.45 row to the
   "Selected Shared Versions" table with a `drizzle045_major_migration` cross-reference.
5. **Re-run the Phase 4 Red contract** to confirm 12/12 pass, then run
   `drizzle-kit migrate` against a fresh Docker DB to fully validate AC 3.
