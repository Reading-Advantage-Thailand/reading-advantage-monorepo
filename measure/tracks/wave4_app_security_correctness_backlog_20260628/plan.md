# Implementation Plan: Wave 4 — App Security & Correctness Backlog (Medium+)

> **Track ID:** `wave4_app_security_correctness_backlog_20260628`
> **Depends on:** Wave 0 tenant/auth/contract primitives; Wave 2 tenant-isolation + provider harnesses (local proof if absent).
> **Method:** Contract-first TDD. Red tests before implementation. One representative-then-propagate slice per finding cluster; remaining same-class sites enumerated and closed, not pattern-only.

## Phase 0: Baseline and Coverage Lock

- [x] Task: Read `medium-plus-coverage-matrix.md` and confirm this wave's owned track IDs are still accurate.
  - Evidence: `baseline-results.md` §1 — owned track IDs in `spec.md` match the matrix exactly (Science ST-1/ST-2/ST-4/SP-3; Reading SEC-6..10/PB-4..8; CodeCamp MT-8..11/13/14; Sales T5/T8/T9; Primary M7/M9; www T9). No drift; no Medium+ track double-owned or unowned. Low-severity deferrals remain explicitly deferred.
- [x] Task: Confirm Wave 0/Wave 2 primitives available (createTenantDB, assertCan, tenant-isolation test helper, provider guard); record which must be locally proven.
  - Evidence: `baseline-results.md` §2 — all four primitives present at baseline SHA. `createTenantDB` at `packages/domain/src/db-contract.ts:332` (re-exported from `@reading-advantage/domain`); `assertCan` at `packages/auth/src/assert.ts:18`; tenant-isolation harness `buildTenantIsolationHarness()` at `packages/domain/src/testing/tenant-isolation-harness.ts`; provider guard `createProviderGuard()` at `packages/ai/src/testing/provider-guard-utility.ts`. All locally proven by existing green tests; none require re-proof in Wave 4. Science `lib/` can import `createTenantDB` (domain is a `workspace:*` dep). Primary does NOT depend on `@reading-advantage/domain` (acceptable — M7/M9 need no domain migration).
- [x] Task: Record baseline pass/fail for the required verification commands per touched app.
  - Evidence: `baseline-results.md` §3 — lint PASS (exit 0, 16/16 tasks, 2235 pre-existing warnings); check-types FAIL (exit 2, pre-existing `packages/api/src/routers/progress.ts:54` TS2322 blocks all 5 app check-types); test FAIL (exit 2, same `@reading-advantage/api#build` blocker; `@reading-advantage/domain` green standalone — 524 passed, 5 skipped). Reproduction recipe in §4. The pre-existing `progress.ts:54` defect overlaps PB-4 and MUST be fixed in Phase 4 for the Phase 9 aggregate to go green.
- [x] Task: Create a site-closure checklist for each owned migration track, enumerating affected same-class sites from the source review artifacts before implementation begins.
  - Evidence: 26 checklists under `site-closures/` (ST-1, ST-2, ST-4, SP-3, M-RA-SEC-6..10, M-RA-PB-4..8, MT-8..11/13/14, T5/T8/T9, M7/M9, www-T9). Each enumerates affected same-class sites with a status column (🔴 open / 🟢 fixed / ⚪ NA / 🟡 deferred:<follow-up>) and a closeout requirement. No track is accepted on representative-slice evidence alone (spec §"Closure Model"). Strategy + anti-pattern defenses (A1–A13) recorded in `test-strategy.md`.

## Phase 1: Science Security and Tenant Scoping

- [x] Task: Write Red cross-tenant tests for `awardXp`/`updateStreakForProfile`/badge writes leaking across schools.
  - Evidence: `apps/science-advantage/lib/gamification/gamification-tenant-isolation.test.ts` added; 7 tests assert same-tenant success + `assertCan` call, cross-tenant rejection, and schoolB row non-mutation (A4 both-directions). Red run: `cd apps/science-advantage && CI=true pnpm exec vitest run lib/gamification/gamification-tenant-isolation.test.ts` → 7 failed (function never calls `assertCan`/`createTenantDB`).
- [~] Task: Route gamification writes through `createTenantDB` + `assertCan()`.
- [x] Task: Write Red tests for `lib/services/**` (`get-class-detail`, `get-student-classes`, `mastery-worker`, `getClassDetailWithCurriculum`) missing user context/tenant scope.
  - Evidence: `apps/science-advantage/lib/services/services-tenant-isolation.test.ts` added; 6 tests assert missing-user-context throw and foreign-tenant throw/empty for `getClassDetailWithCurriculum`, `getStudentEnrolledClasses`, and `processMasteryRun`. Red run: `cd apps/science-advantage && CI=true pnpm exec vitest run lib/services/services-tenant-isolation.test.ts` → 6 failed (services accept anonymous/foreign callers).
- [~] Task: Add user context + `assertCan()` + `tenantDb` to those services.
- [x] Task: Add a TenantDB-adoption guard (SP-3) failing raw `@reading-advantage/db` imports in Science app code.
  - Evidence: `apps/science-advantage/lib/__tests__/tenant-db-adoption.test.ts` added; scans non-test `.ts` files under `{lib,app}` for raw `db` imports from `@reading-advantage/db` (A7 path exclusions, A12 guard exists). Red run: `cd apps/science-advantage && CI=true pnpm exec vitest run lib/__tests__/tenant-db-adoption.test.ts` → 1 failed with 11 violations (including `app/api/admin/dsar/export/route.ts`).
- [x] Task: Run Science + domain targeted tests.
  - Evidence: Combined targeted Red command `cd apps/science-advantage && CI=true pnpm exec vitest run lib/gamification/gamification-tenant-isolation.test.ts lib/services/services-tenant-isolation.test.ts lib/__tests__/tenant-db-adoption.test.ts --reporter=verbose` produced `Test Files 3 failed (3)` / `Tests 14 failed (14)`. Note: `pnpm test -- <filter>` dropped positional filters in this environment; `pnpm exec vitest run <paths>` was used to isolate the new Red tests.

## Phase 2: Science Route/Contract Correctness

- [~] Task: Write Red tests for JSON-401 auth helper, `"me"` alias, `limit` clamp, `update-mastery` error mapping, and lesson∈curriculum verification.
  - Evidence refs: Science ST-4 (CR-03/CR-05/CR-06, ME-01..04).
- [~] Task: Implement the auth helper and contract fixes; keep transport thin.
- [~] Task: Run Science targeted tests.

## Phase 3: Reading Authorization, Validation, and Endpoint Hardening

- [~] Task: Write Red tests for admin/SYSTEM license-scope escalation paths.
  - Evidence refs: Reading M-RA-SEC-6.
- [~] Task: Enforce license scope on reviewed admin/SYSTEM operations.
- [~] Task: Add Zod input validation to reviewed routes; harden metrics/health endpoints; remove Firebase storage usages.
  - Evidence refs: Reading M-RA-SEC-7/SEC-9/SEC-10.
- [~] Task: Migrate reviewed Reading controller business logic into `@reading-advantage/domain`.
  - Evidence refs: Reading M-RA-SEC-8.
- [~] Task: Run Reading + domain targeted tests.

## Phase 4: Reading Product-Behavior Correctness and Learning-Loop Tests

- [~] Task: Write Red tests for assignment status enum/lifecycle, reporting metrics correctness, activity target validation + license fallback, and typed request context for reports.
  - Evidence refs: Reading M-RA-PB-4/PB-5/PB-6/PB-7.
- [~] Task: Implement the correctness fixes behind domain functions.
- [~] Task: Build the product-level learning-loop test suite covering XP → level → assignment progression.
  - Evidence refs: Reading M-RA-PB-8.
- [~] Task: Run Reading targeted tests.

## Phase 5: CodeCamp Reliability and Least-Privilege

- [~] Task: Write Red tests for typed domain errors, tenant-scoped PR-review queries, and isolated test-harness state.
  - Evidence refs: CodeCamp MT-8/MT-9/MT-10.
- [~] Task: Implement typed errors, PR-review scoping, and per-case harness isolation.
- [~] Task: Add progression policy, least-privilege permission checks, and observability via shared adapter.
  - Evidence refs: CodeCamp MT-11/MT-13/MT-14.
- [~] Task: Run CodeCamp/domain/api targeted tests.

## Phase 6: Sales Reliability, Curriculum, and Observability

- [~] Task: Write Red tests for curriculum integrity/progression gating, transactional + rate-limited roleplay/reporting writes, and Sales audit events.
  - Evidence refs: Sales T5/T8/T9.
- [~] Task: Implement transaction wrappers, rate limits (reuse Wave 0 limiter), progression gates, and audit logging.
- [~] Task: Run Sales/domain targeted tests.

## Phase 7: Primary Prisma Removal and Secret Eradication

- [~] Task: Write Red tests/guards asserting no Prisma runtime import and no hardcoded secret/credential literals in committed Primary source.
  - Evidence refs: Primary M7; Primary M9 (~103 instances).
- [~] Task: Remove Prisma artifacts; replace hardcoded secrets with env reads + production guards for seed/test credentials.
- [~] Task: Run Primary targeted tests, type checks, and lint.

## Phase 8: Public Blog Security

- [~] Task: Write Red tests proving blog HTML is sanitized and frontmatter is Zod-validated.
  - Evidence refs: www T9 (LRF-028).
- [~] Task: Add sanitization + Zod frontmatter parsing to the blog rendering path.
- [~] Task: Run www targeted tests.

## Phase 9: Quality Gates and Closeout

- [~] Task: Run all required verification commands from `spec.md`.
- [~] Task: Update `medium-plus-coverage-matrix.md` marking owned tracks resolved only when behavior tests prove the fixes.
- [~] Task: Verify each site-closure checklist marks every affected same-class site fixed, not-applicable, or explicitly deferred to a named follow-up.
- [~] Task: Add lessons learned for any new tenant/secret/observability patterns.
- [~] Task: Run Measure phase acceptance and archive the track.
</content>
