# Implementation Plan: Wave 2 — Restore Deployment/Test/Provider Confidence

> **Track ID:** `wave2_confidence_restoration_20260628`

## Phase 0: Baseline Gate Inventory

- [x] Task: Inventory current lint/check-types/test/build scripts for all apps and shared packages.
  - Evidence: Strategy inventory at baseline SHA `af631ec9f534250bec6ba39ac28a678bb9f2042b` counted 21 workspace packages (8 apps, 13 shared packages), 2 missing lint scripts, 4 missing check-types scripts, 0 missing test scripts, 2 missing build scripts, and 3 `passWithNoTests` scripts. See `test-strategy.md` Phase 0.
- [x] Task: Identify gates that pass vacuously, time out, hit production by default, or are excluded from CI.
  - Evidence refs: Cross-App CA-010; Shared Foundation F-SF-017/F-SF-019/F-SF-021; CodeCamp High theme 6; Marketing test-suite truthfulness debt.
  - Evidence: `passWithNoTests` script count is 3 (`codecamp-advantage`, `sales-advantage`, `@reading-advantage/scripts`); CodeCamp prod-smoke live-default count is 15 files; root `pnpm test` runs only 4 CodeCamp cold-start/local-image test files (27 tests); PR CI path-excluded app directory count is 7; historical timeout-prone gate classes are 2 and observed Phase 0 timeout count is 0. See `test-strategy.md` Phase 0.
- [x] Task: Record baseline status for migration doctor, provider guard, and package aggregate tests.
  - Evidence: DB migration/journal/ledger guard command passed with 3 passed files / 2 skipped files / 76 passed tests / 4 skipped tests; `@reading-advantage/ai` direct app import guard passed with direct app AI SDK import hit count 0, while `packages/ai/src/index.ts` still has raw AI barrel re-export count 7; `@reading-advantage/types` passed 4 files / 88 tests; shared aggregate package test is red from `@reading-advantage/ai` 19 failed tests across 3 failed files, and `@reading-advantage/webhooks` passes while logging DB `ECONNREFUSED`. See `test-strategy.md` Phase 0.

## Phase 1: Migration and Seed Governance

- [x] Task: Write Red sentinel tests for missing migrations 0022/0023 and any current journal/ledger drift.
  - Evidence refs: Shared Foundation F-SF-006; Cross-App CA-007; MR-H02.
  - Red evidence: `wave2-migration-seed-governance.test.ts` added. Sentinel parity for 0022/0023/0024 is already enforced by `journal-integrity.test.ts` (passes: latest migration tags 0022_flowery_black_tarantula, 0023_cultured_sunspot, 0024_futuristic_vulture all have probes in `sentinelProbes`). No new missing sentinel drift to Red-fabricate.
  - Green evidence: `pnpm --filter @reading-advantage/db exec vitest run src/__tests__/wave2-migration-seed-governance.test.ts` exits 0 (2 tests, 2 passed, 0 failed). Commit `029cc2fa` (the doctor work for required-migration also lives in this file). SHA `029cc2fa863ec21ec12979dfedb8cef8b5e78f1f` is also the Red-marker commit the test is anchored against.
- [x] Task: Add Drizzle version alignment or compatibility guard across db/domain/auth/api.
  - Evidence: `drizzle045-migration-format.test.ts` already guards 0.45-era format invariants; invariant already satisfied, no new Red fabricated.
  - Green evidence: `pnpm --filter @reading-advantage/db exec vitest run src/__tests__/drizzle045-migration-format.test.ts` exits 0 (25 tests, 25 passed, 0 failed) — no Phase 1 code change required, invariant already holds.
- [~] Task: Add seed contract tests for Science grade-4 and any known CodeCamp/Sales seed drift.
  - Evidence refs: Science HI-05; CodeCamp F-CC-B07-034/038; Sales C13 nullability drift.
  - Red evidence:
    - `wave2-grade4-seed-contract.test.ts`: `Invalid grade-4 seed item count: 10` for lessons and `Invalid grade-4 seed item count: 10` for questions (grade-4 files violate `LessonsFile`/`QuizQuestionsFile` Zod contract).
    - `codecamp-stale-seed.test.ts` addition: `Duplicate lesson type count: 66` across 17 modules (the seed's skip-by-type logic is undefined when a module contains multiple theory lessons).
    - `wave2-sales-curriculum-seed-contract.test.ts`: `Orphan lesson count: 1` when re-seeding existing modules (`onConflictDoNothing` returns no row, script falls back to literal `fallback-id`).
  - Green evidence (partial — see follow-up below):
    - **Sales orphan-lesson fix**: `pnpm --filter sales-advantage exec vitest run scripts/__tests__/wave2-sales-curriculum-seed-contract.test.ts` exits 0 (3 tests, 3 passed). `sales-curriculum-seed.ts` now SELECTs the existing module by slug first (returns the existing id) and only INSERTs for new modules; lesson upserts key on `(moduleId, order)` so re-runs are idempotent and never produce orphan lessons. The Sales seed remains single-tenant/global — no `schoolId` is introduced. Commit `e52b9346` (`fix(sales): wave2 p1 seed orphan-lesson fix`).
    - **Science grade-4 Zod contract**: `pnpm --filter science-advantage exec vitest run --config vitest.unit.config.ts tests/lib/seed-validation.test.ts tests/wave2-grade4-seed-contract.test.ts` exits 0 (2 files, 21 tests, 0 failed). All 10 grade-4 lesson files and 10 grade-4 question files were converted from the bare `LessonContent` shape (`{ version: 1, blocks: [...] }`) to the schema-compliant `LessonsFile` / `QuizQuestionsFile` wrappers. Title / titleThai / standards are sourced from `standards-mapping.json`; `structuredContent` (version + blocks) is preserved verbatim so the rendering layer is unchanged. The seeder at `apps/science-advantage/scripts/seed/seed-lessons.ts` and `seed-questions.ts` now validates the converted files successfully (previously exited 1 before insert). Pre-existing `curriculum-identifiers.test.ts` regression tests that read `data.version` / `data.blocks` at the top level were updated to read through the new `lessons[0].structuredContent` path (test names + assertion intent unchanged). Commits `ee026c58` (`fix(science): wave2 p1 grade-4 seed Zod contract`) and `38063be6` (`fix(science): wave2 p1 grade-4 test paths`).
    - **CodeCamp duplicate lesson types** — see follow-up at end of file. Genuine self-contradiction between the new Red test and the existing curriculum contract; STOP-and-report per Wave 2 rule (no Red test is weakened).
- [x] Task: Add deploy doctor gate pattern that blocks app rollout when DB ledger is behind required migration.
  - Red evidence: `wave2-migration-seed-governance.test.ts` fails `Required migration behind count: 1` because `packages/db/scripts/migration-ledger-doctor.ts` does not expose a `--required-migration` / `REQUIRED_MIGRATION` deploy-gate contract.
  - Green evidence: `packages/db/scripts/migration-ledger-doctor.ts` now accepts `--required-migration <tag>` (argv) and `REQUIRED_MIGRATION` (env, for secret-manager pipelines). When the highest applied ledger `when` is less than the required tag's `when`, the doctor prints `Required migration behind count: N — required tag "<tag>" (idx K, when T) but highest applied ledger when is X (<behind entries> are not applied)` and exits 1 (fail closed). Existing divergence behavior preserved. `pnpm --filter @reading-advantage/db exec vitest run src/__tests__/wave2-migration-seed-governance.test.ts src/__tests__/deploy-gate-contract.test.ts` exits 0 (2 files, 15 tests, 0 failed). Commit `029cc2fa` (`fix(db): wave2 p1 doctor required-migration gate`).
- [x] Task: Document direct vs pooled database URL requirements for migrations and seeds.
  - Evidence: The `codecamp-seed.ts` file already documents and enforces the direct-connection requirement (uses `DIRECT_DATABASE_URL ?? DATABASE_URL` with a fallback warning). The migration-ledger-doctor (commit `029cc2fa`) also requires `DIRECT_DATABASE_URL` directly (not `DATABASE_URL`) and exits 2 with a labeled message when it is missing. The new gate (`--required-migration` / `REQUIRED_MIGRATION`) preserves the same connection contract. No additional documentation change required for this task; this is a non-test task and Phase 1 closeout does not require live-DB proof to claim Green.

### Phase 1 follow-up — CodeCamp seed idempotency test (corrected Red layer)

**Status:** Red test `codecamp-stale-seed.test.ts > Wave 2 — codecamp seed idempotency for existing modules > re-seeding an existing module inserts every canonical lesson, not one-per-type` is RED with the correct contract.

**Correction applied:** The original Red test asserted that the canonical curriculum data has no duplicate lesson `type` within a module (`Duplicate lesson type count: 66`). That was the **wrong layer**: the codecamp curriculum intentionally has multiple theory lessons per module, and the pre-existing regression guards in `codecamp-curriculum-fidelity.test.ts` and `codecamp-curriculum-data*.test.ts` PIN those titles and counts (Phase A=29, B=23, C=14, D=19, grand total=85). Forcing type-uniqueness would delete 49 real lessons and break 31+ assertions.

The test was rewritten to assert the **seed's idempotency/completeness contract** instead: when re-seeding an existing module, the seed must insert every still-missing canonical lesson, not stop at "one per type". The test simulates a re-seed where only the first lesson of each type is already present, mirrors the current type-keyed `existingTypes.has(lesson.type)` skip logic, and reports the number of canonical lessons that are wrongly skipped.

**Red evidence:** `Wrongly-skipped canonical lesson count: 49` (the 5 `findStaleModuleSlugs` tests still pass; 1 of 7 tests fails for the expected reason).

**Jr-Green handoff:** Extract a pure helper `selectLessonsToInsert(existingLessons, canonicalLessons)` from `packages/db/src/seed/codecamp-seed.ts` (currently inline in the transaction at lines ~108-119), export it, and have the test import it in place of the local mirror. Change the key from `type` to `(moduleId, order)` or a unique lesson slug so re-runs are idempotent and complete. After the fix the expected count is `0` and the test passes without touching curriculum data or the fidelity regression guards.

## Phase 2: Provider Adapter Enforcement

- [ ] Task: Write architecture-guard Red tests for direct AI/storage/observability provider SDK imports in production code.
  - Evidence refs: Cross-App CA-005/CA-006/CA-011; Shared Foundation F-SF-021/F-SF-022; Sales F-SALES-B03-010.
- [ ] Task: Remove raw AI SDK re-exports from `@reading-advantage/ai` or explicitly quarantine them behind test-only exports.
  - Evidence refs: Sales C6; F-SALES-B03-010/F-SALES-B03-005; MR-H01.
- [ ] Task: Add adapter contract tests for AI text/object/media, storage put/get/delete/signed URL semantics, and observability logging/capture boundary.
- [ ] Task: Migrate or file explicit follow-up rows for any direct SDK imports found in Reading, Primary, Marketing, Sales, Science, or legacy scripts.

## Phase 3: Test Signal Restoration

- [ ] Task: Replace source-text/string-existence assertions with behavior tests in the highest-risk shared packages.
  - Evidence refs: `measure/lessons-learned.md` review_findings_remediation_20260624; Cross-App CA-010.
- [ ] Task: Remove or quarantine `jest --passWithNoTests` surfaces from quality claims.
- [ ] Task: Convert live-production smoke tests to opt-in with explicit `RUN_LIVE_SMOKE=true` or equivalent.
  - Evidence refs: CodeCamp C-H-5/prod-smoke suites hit live production by default.
- [ ] Task: Fix stale RED docblocks and tautological tests in Marketing/test-strategy examples.
- [ ] Task: Add `@reading-advantage/types` tests and ensure package aggregate test runs them.

## Phase 4: Reusable Harnesses

- [ ] Task: Create shared tenant isolation test helper with mandatory two-school fixtures.
- [ ] Task: Create API contract test kit for response envelopes and auth/role cases.
- [ ] Task: Create provider architecture guard utility and document approved exceptions.
- [ ] Task: Create migration doctor test helper for fresh DB, existing DB, and ledger drift.
- [ ] Task: Create product-claim test helper for app existence, stale launch dates, and placeholder claims.

## Phase 5: Aggregate Verification and Closeout

- [ ] Task: Run targeted gates for db/domain/types/auth/api/ai/storage/webhooks plus affected app tests.
- [ ] Task: Update `test-strategy-roadmap.md` with completed harnesses and remaining app-specific gaps.
- [ ] Task: Add lessons learned for false-green prevention.
- [ ] Task: Run Measure phase acceptance and archive the track.
