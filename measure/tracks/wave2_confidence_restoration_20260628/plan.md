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
- [x] Task: Add seed contract tests for Science grade-4 and any known CodeCamp/Sales seed drift.
  - Evidence refs: Science HI-05; CodeCamp F-CC-B07-034/038; Sales C13 nullability drift.
  - Red evidence:
    - `wave2-grade4-seed-contract.test.ts`: `Invalid grade-4 seed item count: 10` for lessons and `Invalid grade-4 seed item count: 10` for questions (grade-4 files violate `LessonsFile`/`QuizQuestionsFile` Zod contract).
    - `codecamp-stale-seed.test.ts` addition: `Duplicate lesson type count: 66` across 17 modules (the seed's skip-by-type logic is undefined when a module contains multiple theory lessons).
    - `wave2-sales-curriculum-seed-contract.test.ts`: `Orphan lesson count: 1` when re-seeding existing modules (`onConflictDoNothing` returns no row, script falls back to literal `fallback-id`).
  - Green evidence (all three sub-fixes complete):
    - **Sales orphan-lesson fix**: `pnpm --filter sales-advantage exec vitest run scripts/__tests__/wave2-sales-curriculum-seed-contract.test.ts` exits 0 (3 tests, 3 passed). `sales-curriculum-seed.ts` now SELECTs the existing module by slug first (returns the existing id) and only INSERTs for new modules; lesson upserts key on `(moduleId, order)` so re-runs are idempotent and never produce orphan lessons. The Sales seed remains single-tenant/global — no `schoolId` is introduced. Commit `e52b9346` (`fix(sales): wave2 p1 seed orphan-lesson fix`).
    - **Science grade-4 Zod contract**: `pnpm --filter science-advantage exec vitest run --config vitest.unit.config.ts tests/lib/seed-validation.test.ts tests/wave2-grade4-seed-contract.test.ts` exits 0 (2 files, 21 tests, 0 failed). All 10 grade-4 lesson files and 10 grade-4 question files were converted from the bare `LessonContent` shape (`{ version: 1, blocks: [...] }`) to the schema-compliant `LessonsFile` / `QuizQuestionsFile` wrappers. Title / titleThai / standards are sourced from `standards-mapping.json`; `structuredContent` (version + blocks) is preserved verbatim so the rendering layer is unchanged. The seeder at `apps/science-advantage/scripts/seed/seed-lessons.ts` and `seed-questions.ts` now validates the converted files successfully (previously exited 1 before insert). Pre-existing `curriculum-identifiers.test.ts` regression tests that read `data.version` / `data.blocks` at the top level were updated to read through the new `lessons[0].structuredContent` path (test names + assertion intent unchanged). Commits `ee026c58` (`fix(science): wave2 p1 grade-4 seed Zod contract`) and `38063be6` (`fix(science): wave2 p1 grade-4 test paths`).
    - **CodeCamp seed idempotency** (see follow-up at end of file for full Jr-Green handoff): `pnpm --filter @reading-advantage/db exec vitest run src/__tests__/codecamp-stale-seed.test.ts` exits 0 (7 tests, 7 passed; includes the 5 `findStaleModuleSlugs` tests). Full `pnpm --filter @reading-advantage/db exec vitest run` exits 0 with 34 passed | 2 skipped files / 641 passed | 6 skipped tests (one env-guards test timed out in the first run but passed on re-run in isolation and on a re-run of the full suite — pre-existing test-isolation flake, owner: db-platform). `packages/db/src/seed/codecamp-seed.ts` now exports a pure helper `selectLessonsToInsert(existingLessons, canonicalLessons)` (with `ExistingLessonSnapshot` type) that keys dedup on `order` (not `type`) — the canonical lesson `(moduleId, order)` pair is stable and unique within a module, so re-seeding inserts every still-missing canonical lesson while leaving existing rows untouched (preserves the "don't disrupt student progress" intent). The test's local mirror of the helper was replaced with an import of the production helper; the labeled assertion `Wrongly-skipped canonical lesson count: 0` and the A4 vacuity guards (`Fixture module count must be > 0`, `At least one module must have multiple lessons of the same type for this test to be meaningful`) are unchanged. `build-graph update ./graph.db packages/db/src/seed/codecamp-seed.ts` ran (5→10 nodes, 18→22 edges). Commit `9934153a` (`fix(db): codecamp seed idempotency by order (track_id: wave2_confidence_restoration_20260628)`).
- [x] Task: Add deploy doctor gate pattern that blocks app rollout when DB ledger is behind required migration.
  - Red evidence: `wave2-migration-seed-governance.test.ts` fails `Required migration behind count: 1` because `packages/db/scripts/migration-ledger-doctor.ts` does not expose a `--required-migration` / `REQUIRED_MIGRATION` deploy-gate contract.
  - Green evidence: `packages/db/scripts/migration-ledger-doctor.ts` now accepts `--required-migration <tag>` (argv) and `REQUIRED_MIGRATION` (env, for secret-manager pipelines). When the highest applied ledger `when` is less than the required tag's `when`, the doctor prints `Required migration behind count: N — required tag "<tag>" (idx K, when T) but highest applied ledger when is X (<behind entries> are not applied)` and exits 1 (fail closed). Existing divergence behavior preserved. `pnpm --filter @reading-advantage/db exec vitest run src/__tests__/wave2-migration-seed-governance.test.ts src/__tests__/deploy-gate-contract.test.ts` exits 0 (2 files, 15 tests, 0 failed). Commit `029cc2fa` (`fix(db): wave2 p1 doctor required-migration gate`).
- [x] Task: Document direct vs pooled database URL requirements for migrations and seeds.
  - Evidence: The `codecamp-seed.ts` file already documents and enforces the direct-connection requirement (uses `DIRECT_DATABASE_URL ?? DATABASE_URL` with a fallback warning). The migration-ledger-doctor (commit `029cc2fa`) also requires `DIRECT_DATABASE_URL` directly (not `DATABASE_URL`) and exits 2 with a labeled message when it is missing. The new gate (`--required-migration` / `REQUIRED_MIGRATION`) preserves the same connection contract. No additional documentation change required for this task; this is a non-test task and Phase 1 closeout does not require live-DB proof to claim Green.

### Phase 1 follow-up — CodeCamp seed idempotency test (corrected Red layer)

**Status:** Red test `codecamp-stale-seed.test.ts > Wave 2 — codecamp seed idempotency for existing modules > re-seeding an existing module inserts every canonical lesson, not one-per-type` was RED with the correct contract. **Resolved (Green).**

**Correction applied:** The original Red test asserted that the canonical curriculum data has no duplicate lesson `type` within a module (`Duplicate lesson type count: 66`). That was the **wrong layer**: the codecamp curriculum intentionally has multiple theory lessons per module, and the pre-existing regression guards in `codecamp-curriculum-fidelity.test.ts` and `codecamp-curriculum-data*.test.ts` PIN those titles and counts (Phase A=29, B=23, C=14, D=19, grand total=85). Forcing type-uniqueness would delete 49 real lessons and break 31+ assertions.

The test was rewritten to assert the **seed's idempotency/completeness contract** instead: when re-seeding an existing module, the seed must insert every still-missing canonical lesson, not stop at "one per type". The test simulates a re-seed where only the first lesson of each type is already present, mirrors the current type-keyed `existingTypes.has(lesson.type)` skip logic, and reports the number of canonical lessons that are wrongly skipped.

**Red evidence (pre-fix):** `Wrongly-skipped canonical lesson count: 49` (the 5 `findStaleModuleSlugs` tests still pass; 1 of 7 tests fails for the expected reason). Full db suite: 33 passed | 1 failed | 2 skipped files / 640 passed | 1 failed | 6 skipped tests.

**Green evidence (post-fix):** `pnpm --filter @reading-advantage/db exec vitest run src/__tests__/codecamp-stale-seed.test.ts` exits 0 (7 tests, 7 passed; 5 `findStaleModuleSlugs` + 2 idempotency contract tests). Full `pnpm --filter @reading-advantage/db exec vitest run` exits 0: 34 passed | 2 skipped files / 641 passed | 6 skipped tests. The ONLY newly-green test is the codecamp idempotency one; no regression tests flipped to red (the env-guards test hit a 5s timeout in the first full-suite run, passed in isolation (4/4), and passed on full-suite re-run — pre-existing test-isolation flake, owner: db-platform; not introduced by this change). `pnpm --filter @reading-advantage/db exec tsc --noEmit` exits 0; `bash measure/doctor.sh` passes (2/2). The labeled assertion `Wrongly-skipped canonical lesson count: 0` and the A4 vacuity guards (`Fixture module count must be > 0`, `At least one module must have multiple lessons of the same type for this test to be meaningful`) are unchanged.

**Jr-Green handoff (executed):** Pure helper `selectLessonsToInsert(existingLessons, canonicalLessons)` extracted from `packages/db/src/seed/codecamp-seed.ts` and exported alongside an `ExistingLessonSnapshot` interface. The helper keys dedup on `order` (not `type`) because the canonical lesson `(moduleId, order)` pair is stable and unique within a module. Production code at the former lines ~108-119 now: (1) selects `{ type, order, title }` from `codecamp_lessons` for the module, and (2) delegates the "what to insert" decision to `selectLessonsToInsert`. The test's local mirror of the helper was replaced with an import of the production helper (test now shares the same code path as the seed, eliminating drift risk). `build-graph update ./graph.db packages/db/src/seed/codecamp-seed.ts` ran (5→10 nodes, 18→22 edges) per A10. Curriculum data (`getPhase{A,B,C,D}CurriculumData`) and the pre-existing `codecamp-curriculum-data*` / `codecamp-curriculum-fidelity` regression guards (PIN at 85 lessons) were not modified.

**Green commit SHA:** `9934153abc7be09c6973a909abd6608fe2abb4a7` (`fix(db): codecamp seed idempotency by order (track_id: wave2_confidence_restoration_20260628)`).

## Phase 2: Provider Adapter Enforcement

- [~] Task: Write architecture-guard Red tests for direct AI/storage/observability provider SDK imports in production code.
  - Evidence refs: Cross-App CA-005/CA-006/CA-011; Shared Foundation F-SF-021/F-SF-022; Sales F-SALES-B03-010.
  - Red evidence:
    - `packages/ai/src/__tests__/wave2-provider-architecture-guard.test.ts` added.
    - `packages/config/src/__tests__/wave2-observability-provider-guard.test.ts` added.
    - RED command: `CI=true pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/wave2-provider-architecture-guard.test.ts` fails with `Scanned production file count: 2365`, `Unapproved provider import/capture hit count: 12` (module imports: 11, raw capture calls: 1). Hits include `apps/primary-advantage/utils/storage.ts`, `apps/reading-advantage/server/controllers/generator-controller.ts`, `apps/reading-advantage/utils/storage.ts`, `apps/science-advantage/app/api/ai/recommendations/route.ts`, `apps/science-advantage/lib/ai/image-generator.ts`, `apps/science-advantage/lib/ai/recommendation-service.ts`, and `packages/reading-advantage-scripts/*`.
    - RED command: `CI=true pnpm --filter @reading-advantage/config exec vitest run src/__tests__/wave2-observability-provider-guard.test.ts` fails with `Scanned production file count: 794`, `Unapproved console.error hit count: 621`, `Unapproved Sentry capture hit count: 1` (route.ts direct `Sentry.captureException`).
- [ ] Task: Remove raw AI SDK re-exports from `@reading-advantage/ai` or explicitly quarantine them behind test-only exports.
  - Evidence refs: Sales C6; F-SALES-B03-010/F-SALES-B03-005; MR-H01.
- [~] Task: Add adapter contract tests for AI text/object/media, storage put/get/delete/signed URL semantics, and observability logging/capture boundary.
  - Red evidence:
    - `packages/ai/src/__tests__/wave2-ai-barrel-no-raw-sdk.test.ts` added; fails `Raw AI barrel export count: 7` (createOpenAI, createGoogleGenerativeAI, createVertex, generateObject, generateText, streamText, experimental_generateImage).
    - `packages/storage/src/__tests__/wave2-storage-contract.test.ts` added; fails `Provider-specific error leakage count: 1` on put/delete/getSignedUrl rejected operations (StorageClient method semantics pass).
    - Pre-existing `phase-stream-text-contract.test.ts` and `phase-multimodal-contract.test.ts` pass at HEAD (13 tests); they are not new Red but cover AI text/object/media contract semantics.
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
