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

- [ ] Task: Write Red sentinel tests for missing migrations 0022/0023 and any current journal/ledger drift.
  - Evidence refs: Shared Foundation F-SF-006; Cross-App CA-007; MR-H02.
- [ ] Task: Add Drizzle version alignment or compatibility guard across db/domain/auth/api.
- [ ] Task: Add seed contract tests for Science grade-4 and any known CodeCamp/Sales seed drift.
  - Evidence refs: Science HI-05; CodeCamp F-CC-B07-034/038; Sales C13 nullability drift.
- [ ] Task: Add deploy doctor gate pattern that blocks app rollout when DB ledger is behind required migration.
- [ ] Task: Document direct vs pooled database URL requirements for migrations and seeds.

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
