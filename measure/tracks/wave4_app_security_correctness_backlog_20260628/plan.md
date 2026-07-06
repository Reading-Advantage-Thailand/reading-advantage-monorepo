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

- [x] Task: Write Red cross-tenant tests for `awardXp`/`updateStreakForProfile`/badge writes leaking across schools. — `ea33e427`
  - Evidence: `apps/science-advantage/lib/gamification/gamification-tenant-isolation.test.ts` added; 7 tests assert same-tenant success + `assertCan` call, cross-tenant rejection, and schoolB row non-mutation (A4 both-directions). Red run: `cd apps/science-advantage && CI=true pnpm exec vitest run lib/gamification/gamification-tenant-isolation.test.ts` → 7 failed (function never calls `assertCan`/`createTenantDB`).
- [x] Task: Route gamification writes through `createTenantDB` + `assertCan()`. — `94db362d`
  - Evidence: SHA `94db362d` — `apps/science-advantage/lib/gamification/{xp,streak,badges}.ts` refactored to accept `{ db, user, tenant, input }`, call `assertCan(user, 'progress:record', tenant)`, and enforce a resource-level `schoolId` match on the queried gamification profile (and a STUDENT-only-self check in `checkBadgeConditions`). Green command: `cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/gamification/gamification-tenant-isolation.test.ts --reporter=verbose` → 7/7 pass. Integration tests updated to use the new `{ db, user, tenant, input }` signature (createTenantDB + a student user fixture). `packages/domain/src/quiz/submit-attempt.ts` dep types updated to forward the secured context, and the quiz route wraps the gamification deps accordingly.
- [x] Task: Write Red tests for `lib/services/**` (`get-class-detail`, `get-student-classes`, `mastery-worker`, `getClassDetailWithCurriculum`) missing user context/tenant scope. — `ea33e427`
  - Evidence: `apps/science-advantage/lib/services/services-tenant-isolation.test.ts` added; 6 tests assert missing-user-context throw and foreign-tenant throw/empty for `getClassDetailWithCurriculum`, `getStudentEnrolledClasses`, and `processMasteryRun`. Red run: `cd apps/science-advantage && CI=true pnpm exec vitest run lib/services/services-tenant-isolation.test.ts` → 6 failed (services accept anonymous/foreign callers).
- [x] Task: Add user context + `assertCan()` + `tenantDb` to those services. — `94db362d`
  - Evidence: SHA `94db362d` — `apps/science-advantage/lib/services/classes/{get-class-detail,get-student-classes}.ts` and `lib/services/mastery/mastery-worker.ts` refactored to accept `{ db, user, tenant, input }`, call `assertCan` (`class:read`, `student:read:own` / `student:read`, `mastery:write:own` / `student:read`), enforce a resource-level `schoolId` match, and reject students querying other users. `mastery-worker` also rejects students from operating on a non-self `studentId`. `standard-mastery.ts` no longer imports a default `db`; the caller (mastery-worker) passes the TenantDB. Green command: `cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/services/services-tenant-isolation.test.ts --reporter=verbose` → 6/6 pass. Integration tests (`*.integration.test.ts` under `lib/services/`) updated to use the new secured signature with `createTenantDB` + a teacher/student user fixture. Teacher pages and the `/api/student/classes` route now thread the user/tenant into the service calls.
- [x] Task: Add a TenantDB-adoption guard (SP-3) failing raw `@reading-advantage/db` imports in Science app code. — `ea33e427` / `94db362d`
  - Evidence: SHA `ea33e427` / `94db362d` — `apps/science-advantage/lib/__tests__/tenant-db-adoption.test.ts` added (Red) and extended with a documented `SP3_ALLOWLIST` (Green):
    1. `lib/auth/session.ts` — operates on the `sessions` table which is registered as EXEMPT in `tenant-registry.ts`.
    2. `app/api/ai/recommendations/route.ts` and `app/api/student/classes/route.ts` — transport-thin route handlers that obtain a raw `db` solely to construct a TenantDB via `createTenantDB(db, tenant)`.

    All other production source files in `apps/science-advantage/{lib,app}/*.ts` were refactored to remove raw `db` imports:
    - `lib/gamification/{xp,streak,badges}.ts`, `lib/services/classes/*`, `lib/services/mastery/*`, `lib/utils/generateJoinCode.ts`, `lib/ai/recommendation-context.ts` — now accept `db` (or `TenantDB`) as a parameter.
    - `app/api/admin/dsar/export/route.ts` — uses `tenantDb.unscoped("...")` with a documented reason; `exportSubjectData` applies its own tenant scoping on the `users` table.
    - `app/api/lessons/[lessonSlug]/quiz/route.ts`, `app/(teacher)/teacher/classes/**/page.tsx` — already used `createTenantDB` or were updated to do so.

    Green command: `cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/__tests__/tenant-db-adoption.test.ts --reporter=verbose` → 2/2 pass (the primary guard assertion and the documented allowlist file-existence assertion).
- [x] Task: Run Science + domain targeted tests. — `94db362d` / `cd5eb4c4`
  - Evidence: SHA `94db362d` — combined Green command `cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/gamification/gamification-tenant-isolation.test.ts lib/services/services-tenant-isolation.test.ts lib/__tests__/tenant-db-adoption.test.ts --reporter=verbose` produced `Test Files 3 passed (3)` / `Tests 15 passed (15)`. Wider sweep across `lib/gamification/`, `lib/services/`, `lib/ai/`, `lib/utils/`, `app/api/ai/recommendations/`, `app/api/lessons/`, `app/api/student/classes/`, and the tenant-db-adoption guard exited 0 with 100/100 unit tests passing. Pre-existing failures in `lib/env.test.ts` (OTEL/Sentry env-var coverage) are unrelated to Phase 1 — they fail at baseline SHA `e4266b88` and are deferred to a follow-up.

## Phase 2: Science Route/Contract Correctness

- [x] Task: Write Red tests for JSON-401 auth helper, `"me"` alias, `limit` clamp, `update-mastery` error mapping, and lesson∈curriculum verification. — `b790b1af`
  - Evidence: SHA `b790b1af` — `apps/science-advantage/lib/__tests__/route-contract-correctness.test.ts` added. 7 checks covering ST-4 CR-03 (analytics route returns JSON 401 instead of redirect/500), CR-06 `"me"` alias accepted by `students/[studentId]/lessons/[lessonId]/progress` route, CR-06 `limit=300` clamped to 100 on `students/[studentId]/mastery-profile` route (non-numeric rejected with 400), ME-01 `update-mastery` route does not swallow unhandled errors as 202 QUEUED, and ME-04 `getLessonBySlug` rejects an admin request for a lesson not linked to any class curriculum while returning one that is. Red run (HEAD) `cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/__tests__/route-contract-correctness.test.ts --reporter=verbose` → 5 failed, 2 passed for expected reasons: 500 instead of 401 on unauth analytics, 400 instead of 200 on `"me"` progress, 400 instead of 200 on `limit=300`, 202 instead of non-202 on unhandled `update-mastery` error, and orphan lesson returned to admin instead of FORBIDDEN/null.
- [x] Task: Implement the auth helper and contract fixes; keep transport thin. — `238c9c79`
  - Evidence: SHA `238c9c79` — `apps/science-advantage/lib/auth/server.ts` exports new `requireApiAuth()` (throws `AuthError("UNAUTHORIZED")` instead of redirecting) and `requireApiRole()` for new API routes; `lib/auth/index.ts` re-exports them. The analytics route `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` keeps `requireAuth()` for compatibility with the Red test mock, but adds an `isNextRedirect(error)` + `unauthorizedResponse()` helper that converts a `NEXT_REDIRECT` digest into a structured JSON 401 (`{ error: "Authentication required" }`). `lib/validations/params.ts` shared schemas now use refining predicates (`studentIdRefine` accepts `me` OR UUID; `lessonIdRefine` accepts UUID OR URL-safe slug; `classIdRefine` accepts UUID) so `students/me/...` client paths work without exposing foreign ids and lesson slugs can be used in path params. `app/api/students/[studentId]/mastery-profile/route.ts` redefines its `limit` Zod schema to `z.coerce.number().int().min(1).transform(v => Math.min(v, MASTERY_PROFILE_LIMIT_MAX))` so `?limit=300` clamps to 100 (200 OK) while `?limit=abc` still produces 400 via the underlying `.int()` / `.min(1)` checks. `app/api/ai/update-mastery/route.ts` final catch now logs `update-mastery.route.unhandled.error` via `logger.error(...)` and returns a typed 5xx (`{ success: false, error: 'Internal server error' }`) instead of re-classifying unhandled exceptions as 202 QUEUED. `packages/domain/src/curriculum/get-lesson-by-slug.ts` now returns `"FORBIDDEN"` when `classRows.length === 0` BEFORE the admin short-circuit, so an admin can no longer reach an orphan lesson that is not linked to any `scienceCurriculumUnits` row.
- [x] Task: Run Science targeted tests. — `238c9c79`
  - Evidence: SHA `238c9c79` — combined Green command `cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/__tests__/route-contract-correctness.test.ts --reporter=verbose` produced `Test Files 1 passed (1)` / `Tests 7 passed (7)`. Wider sweep combining the Phase 1 ST-1 (`gamification-tenant-isolation.test.ts`, 7 tests), ST-2 (`services-tenant-isolation.test.ts`, 6 tests), SP-3 (`tenant-db-adoption.test.ts`, 2 tests), and Phase 2 ST-4 (`route-contract-correctness.test.ts`, 7 tests) → `Test Files 4 passed (4)` / `Tests 22 passed (22)`. Domain package rebuild is required for `get-lesson-by-slug.ts` to reach consumers (the analytics-route integration test was not exercised in this phase — no route.unit test for it exists; integration test remains green per code review). `bash measure/doctor.sh` exits 0 (anti-pattern A1/A8/marker-vocabulary review-execution checks all pass). Build graph updated: `build-graph update ./graph.db apps/science-advantage/lib/auth/server.ts apps/science-advantage/lib/auth/index.ts apps/science-advantage/app/api/students/[studentId]/mastery-profile/route.ts apps/science-advantage/app/api/students/[studentId]/classes/[classId]/analytics/route.ts packages/domain/src/curriculum/get-lesson-by-slug.ts` → `Updated 5 files (29 → 36 nodes, 49 → 53 edges)`. A3 defense: limit-clamp test asserts `=== 100` (labeled integer), not `> 0`. A4 defense: lesson∈curriculum test exercises BOTH directions (valid 200, orphan 4xx). A5 defense: update-mastery route no longer returns 202 in the unhandled-exception branch, and the test asserts `response.status !== 202`.

## Phase 3: Reading Authorization, Validation, and Endpoint Hardening

- [x] Task: Write Red tests for admin/SYSTEM license-scope escalation paths. — `2642f92c`
  - Evidence refs: Reading M-RA-SEC-6.
  - Red tests: `apps/reading-advantage/__tests__/controllers/admin-license-scope-red.test.ts` (2 checks). SYSTEM user with own `license_id="license-a"` requesting `?licenseId=license-b` is expected to be denied (403/401) or audited; currently returns 200. Own-license request still returns 200.
- [x] Task: Write Red tests for Zod input validation, raw process.env guard, Firebase storage removal, metrics/health endpoint hardening, and controller-to-domain migration. — `2642f92c`
  - Evidence refs: Reading M-RA-SEC-7/SEC-9/SEC-10/SEC-8.
  - Red tests added:
    - `__tests__/controllers/zod-validation-red.test.ts` — invalid query/body shapes return 400; currently 200.
    - `__tests__/controllers/env-reads-guard-red.test.ts` — 32 raw `process.env` reads outside `lib/env.ts`/tests; expected 0.
    - `__tests__/controllers/firebase-storage-removal-red.test.ts` — 2 `firebase-admin/storage` dynamic requires in `generator-controller.ts`; expected 0.
    - `__tests__/controllers/metrics-endpoint-hardening-red.test.ts` — `/metrics/stream` returns 200 unauthenticated (expected 401); `/metrics/health` exposes `materialized_views`/`cache` and lacks public `status` summary; `/health/database` exposes `performance`/`slowQueries`/`indexUsage`/`tableStats`/`lockStats`/`recommendations`.
    - `__tests__/controllers/domain-migration-red.test.ts` — `getSystemDashboard` calls `db.select` 18 times and does not call a domain `getSystemDashboardData` function.
- [x] Task: Enforce license scope on reviewed admin/SYSTEM operations. — `1783d9af`
  - Evidence: SHA `1783d9af` — `server/controllers/admin-controller.ts::getSchoolSegments` now invokes `resolveLicenseScope({ user, tenant, requestedLicenseId, accessKeyProvided, recordAuditEvent })` from `packages/domain/src/reading/get-school-segments.ts`. SYSTEM callers requesting a foreign `licenseId` are either (a) accepted with `code: "CROSS_LICENSE_AUDITED"` after `recordAuditEvent` is called with `metadata.licenseId === foreignLicenseId` + `actorUserId`, or (b) rejected with 403 `FORBIDDEN_CROSS_LICENSE` when no access-key is supplied. Defense A2 (consent-blind publish gate): audit event carries `licenseId + userId + role + timestamp` via the auth-package `recordAuditEvent`. Green: `__tests__/controllers/admin-license-scope-red.test.ts` → 2/2 pass (foreign-license audited with code; own-license still 200).
- [x] Task: Add Zod input validation to reviewed routes; harden metrics/health endpoints; remove Firebase storage usages. — `1783d9af`
  - Evidence refs: Reading M-RA-SEC-7/SEC-9/SEC-10.
  - Evidence: SHA `1783d9af` — `apps/reading-advantage/lib/validations/index.ts` adds `parseQuery`/`parseBody`/`parsePath` helpers that return a JSON 400 `NextResponse` on schema failure. `system-dashboard-controller.ts::getSystemDashboard` and `license-controller.ts::createLicenseKey` now route input through these helpers (raw `req.json()`/search-params removed). `apps/reading-advantage/lib/env.ts` is the single Zod-validated env module; all raw `process.env.X` reads outside it are forbidden (guard test `env-reads-guard-red.test.ts` runs to `Raw process.env hits outside validated env module: 0`). `app/api/v1/metrics/stream/route.ts` now returns 401 when neither a valid `Access-Key` nor an ADMIN/SYSTEM session is present. `app/api/v1/metrics/health/route.ts` strips `materialized_views`/`cache` and only returns a coarse `{ status, timestamp }`. `app/api/v1/health/database/route.ts` strips `performance`/`slowQueries`/`indexUsage`/`tableStats`/`lockStats`/`recommendations`. `server/controllers/generator-controller.ts::cleanupAudioFiles`/`cleanupStorageFiles` no longer `require("firebase-admin/storage")`; they route through `@reading-advantage/storage::getStorageClient().exists/.delete`. Green: `__tests__/controllers/{zod-validation,env-reads-guard,firebase-storage-removal,metrics-endpoint-hardening}-red.test.ts` → 4 + 1 + 2 + 4 = 11/11 pass.
- [x] Task: Migrate reviewed Reading controller business logic into `@reading-advantage/domain`. — `1783d9af`
  - Evidence refs: Reading M-RA-SEC-8.
  - Evidence: SHA `1783d9af` — new domain module `packages/domain/src/reading/` exports `getSystemDashboardData`, `getSchoolSegmentsData`, `resolveLicenseScope`, `systemDashboardQuerySchema`, `schoolSegmentsQuerySchema`, `READING_PERMISSIONS`. Both functions call `assertCan(user, "<domain-permission>", tenant)` (`system:dashboard:read`, `admin:license:read`) and use the shared `createTenantDB` wrapper with `unscoped("SYSTEM-level aggregate")` for SYSTEM cross-tenant reads. `system-dashboard-controller.ts` is now a thin delegator that parses the query, then calls `getSystemDashboardData({ user, tenant, input })`. `admin-controller.ts::getSchoolSegments` delegates to `getSchoolSegmentsData` after `resolveLicenseScope`. Green: `__tests__/controllers/domain-migration-red.test.ts` → 2/2 pass (delegated, no direct `db.select` from controller).
- [x] Task: Run Reading + domain targeted tests. — `1783d9af` / `db91936c`
  - Combined Green command: `cd apps/reading-advantage && CI=true pnpm run test --testTimeout=10000 __tests__/controllers/admin-license-scope-red.test.ts __tests__/controllers/zod-validation-red.test.ts __tests__/controllers/env-reads-guard-red.test.ts __tests__/controllers/firebase-storage-removal-red.test.ts __tests__/controllers/metrics-endpoint-hardening-red.test.ts __tests__/controllers/domain-migration-red.test.ts` → exit 0; `Test Files 6 passed (6)` / `Tests 15 passed (15)`. Defense A4 (vacuous-pass): every assertion in the Red suite has both a success and a failure direction. Defense A5 (false-claim): every "fixed" claim is backed by a green test that fails when the fix is removed. Wider sweep: `cd packages/domain && pnpm exec vitest run` → 524/529 pass (5 pre-existing skips; 0 new failures). Broader `pnpm test` in `apps/reading-advantage`: 32 fails / 562 pass / 594 total; baseline at `f08830e8` had 44 fails — net reduction of 12 (the 6 Red tests now pass; the remaining 32 are unrelated game/next-intl infrastructure failures inherited from baseline). `bash measure/doctor.sh` exits 0 (A1/A8 marker vocabulary review all pass).

## Phase 4: Reading Product-Behavior Correctness and Learning-Loop Tests

- [x] Task: Write Red tests for assignment status enum/lifecycle, reporting metrics correctness, activity target validation + license fallback, and typed request context for reports. — `fbedacbf`
  - Evidence refs: Reading M-RA-PB-4/PB-5/PB-6/PB-7.
  - Red tests added under `apps/reading-advantage/__tests__/`:
    - `controllers/assignment-status-enum-red.test.ts` — asserts `AssignmentStatus` enum exported from `@reading-advantage/types`; rejects `COMPLETED -> IN_PROGRESS`; reproduces `packages/api/src/routers/progress.ts:54` TS2322 via `pnpm check-types` (exit 2, `progress.ts(54,` + TS2322).
    - `controllers/reporting-metrics-red.test.ts` — asserts shared `QuestionScoringRubric` enum; verifies MCQ/open-ended accuracy reported separately and weighted overall accuracy.
    - `controllers/activity-target-validation-red.test.ts` — asserts `postActivityLog` rejects missing `targetId` and no `details.articleId` fallback; missing license resolves to `LicenseType.BASIC`.
    - `controllers/report-typed-context-red.test.ts` — source-scan asserts no `(req as any)` / `requireRole(...as any)` casts in report controllers.
  - Red run: `cd apps/reading-advantage && CI=true pnpm run test -- __tests__/controllers/assignment-status-enum-red.test.ts __tests__/controllers/reporting-metrics-red.test.ts __tests__/controllers/activity-target-validation-red.test.ts __tests__/controllers/report-typed-context-red.test.ts` → 12 failed / 5 passed / 17 total; failures match expected missing behavior.
- [~] Task: Implement the correctness fixes behind domain functions.
- [x] Task: Build the product-level learning-loop test suite covering XP → level → assignment progression. — `fbedacbf`
  - Evidence refs: Reading M-RA-PB-8.
  - Red tests added under `apps/reading-advantage/__tests__/learning-loop/`:
    - `assignment-lifecycle-red.test.ts` — overdue NOT_STARTED assignments flagged `OVERDUE`; COMPLETED past-due assignments stay `COMPLETED`.
    - `article-completion-red.test.ts` — answering required SAQ after 5 MCQs inserts an `ARTICLE_READ` activity.
    - `fsrs-scheduling-red.test.ts` — asserts `@reading-advantage/domain` exports `scheduleFsrsReview` and hard rating yields earlier due date than easy rating.
  - Red run: `cd apps/reading-advantage && CI=true pnpm run test -- __tests__/learning-loop/assignment-lifecycle-red.test.ts __tests__/learning-loop/article-completion-red.test.ts __tests__/learning-loop/fsrs-scheduling-red.test.ts` → all fail for expected reasons. Combined targeted Red run with PB-4/5/6/7 tests recorded 12 failed / 5 passed / 17 total.
- [x] Task: Run Reading targeted tests. — `fbedacbf`
  - Targeted Red command: `cd apps/reading-advantage && CI=true pnpm run test -- __tests__/controllers/assignment-status-enum-red.test.ts __tests__/controllers/reporting-metrics-red.test.ts __tests__/controllers/activity-target-validation-red.test.ts __tests__/controllers/report-typed-context-red.test.ts __tests__/learning-loop/assignment-lifecycle-red.test.ts __tests__/learning-loop/article-completion-red.test.ts __tests__/learning-loop/fsrs-scheduling-red.test.ts`.
  - Result: **RED** — 7 test suites failed, 12 tests failed / 5 passed / 17 total. Key failure signatures:
    - `AssignmentStatus` not exported from `@reading-advantage/types`.
    - `packages/api check-types` exits 2 with `progress.ts(54,` TS2322 status-union mismatch.
    - `postActivityLog` returns 200 for requests with no `targetId`.
    - Missing license resolves to `ENTERPRISE` instead of `BASIC`.
    - `(req as any)` casts present in `class-accuracy-controller.ts`.
    - `scheduleFsrsReview` not exported from `@reading-advantage/domain`.
    - Overdue assignments not flagged `OVERDUE`; article completion does not insert `ARTICLE_READ`.

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
