# Coverage gaps report — commit 01f2acfe8

## Summary

- Scope: 4 packages, 457 source files, 3,450 passing tests, vitest 4.1.8 with `@vitest/coverage-v8` 4.1.8 (already installed).
- domain: 82.55% lines, 71.58% branches. 53 files under 60% (45 at 0%).
- api: 66.93% lines, 56.44% branches. 9 files under 60% (6 at 0%).
- auth: 84.22% lines, 78.14% branches. 3 files under 60%.
- backend: 72.33% lines, 69.72% branches. 8 files under 60% (3 at 0%).
- Total: 73 files under 60% line coverage.
- 22 database suites skipped themselves (no database URL). 2 more backend suites need a database but fail instead of skipping.
- 6 failures do not involve a database: 4 auth git-history tests and 2 backend tests (export list, tsconfig not found).
- Money code is well covered: accounting, finance and licenses are all at or above 85% lines.
- The worst gaps are quiz grading, mastery writes, company admin checks, login rate limits, and class deletes.

## How it ran

- Built workspace dependencies first (`turbo run build`), because packages resolve each other through `dist/`. Changed no source file.
- Command per package: `vitest run --coverage --coverage.reportOnFailure --coverage.include='src/**/*.ts'`, with `__tests__/` and `*.test.ts` excluded.
- Coverage counts only each package's own tests. Tests in `apps/*` that call these packages do not count.

| Package | Lines | Branches | Functions | Files | Tests passed / failed / skipped |
|---|---:|---:|---:|---:|---|
| domain | 82.55% (7279/8817) | 71.58% (5071/7084) | 82.99% | 340 | 2196 / 0 / 18 |
| api | 66.93% (498/744) | 56.44% (289/512) | 72.18% | 31 | 355 / 0 / 0 |
| auth | 84.22% (566/672) | 78.14% (329/421) | 88.88% | 24 | 350 / 4 / 9 |
| backend | 72.33% (2520/3484) | 69.72% (1541/2210) | 71.07% | 62 | 549 / 7 / 51 |

### Skipped: needs a database or a secret

- auth (`DATABASE_URL`): `audit-retention.integration`, `audit-retention-boundary.integration`, `audit-retention-job.integration`.
- domain (`DATABASE_URL`, `RUN_SALES_REAL_DB_TESTS`): `dsar.integration`, `student-login.real-db`, `company-identity-principal.real-db`, `sales-roleplay-concurrency.real-db`.
- backend (`COMPANY_IDENTITY_INTEGRATION_DATABASE_URL`, `DIRECT_DATABASE_URL`): `postgres16-concurrency.red`, `postgres16-enqueue-retry-replay.red`, `postgres16-harness.integration`, `postgres-idempotency.integration`, `postgres-exchange.integration`, `postgres-finance-task3.integration`, `postgres-finance-task3-security-review-v2.red`, `postgres-login-atomic.integration`, `ledger-successor-admission-facade.integration`, `postgres-successor-registry.integration`, `successor-admission-composition.integration`.
- backend, need a database but fail instead of skipping (`COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL`): `postgres-admin-safety.integration` (3 tests), `postgres-company-scope.integration` (2 tests).

### Failures that do not involve a database

- auth `phase-7-closeout.test.ts` (4 tests): reads git history and git notes. A fresh clone has no notes and does not have the expected closeout revision.
- backend `package-scaffold.test.ts`: the package now has 7 export paths, but the test expects 6.
- backend `durable-job-architecture.red.test.ts`: cannot load the tsconfig for `packages/architecture-enforcement/src/ownership-map.ts`.

## Full table: files under 60% line coverage

Rows are sorted by line coverage, lowest first. Line numbers point to each function's start. Small `errors.ts` and type-only files show 0% because no test builds those error classes.

### packages/domain — 53 files under 60%

| File | Lines % | Lines | Branches % | Untested functions (first 6) |
|---|---:|---:|---:|---|
| `src/activity/codecamp-activity-service.ts` | 0 | 19 | 0 | `requiredTutorialEnvironment`:14, `createCodecampActivityHandlers`:65, `getActivity`:68 |
| `src/ai/get-recommendation.ts` | 0 | 44 | 0 | `loadAttemptWithRelations`:65, `getRecommendation`:251 |
| `src/articles/errors.ts` | 0 | 4 | 100 | `constructor`:5, `constructor_2`:15 |
| `src/assignments/errors.ts` | 0 | 6 | 100 | `constructor`:5, `constructor_2`:15, `constructor_3`:25 |
| `src/classes/archive-class.ts` | 0 | 9 | 0 | `archiveClass`:22 |
| `src/classes/create-assignment.ts` | 0 | 22 | 0 | `createAssignment`:30 |
| `src/classes/create-science-class.ts` | 0 | 22 | 0 | `generateJoinCode`:14, `generateUniqueJoinCode`:25, `createScienceClass`:55 |
| `src/classes/delete-assignment.ts` | 0 | 15 | 0 | `deleteAssignment`:28 |
| `src/classes/get-class-analytics-overview.ts` | 0 | 33 | 0 | `getColorCode`:14, `getClassAnalyticsOverview`:36 |
| `src/classes/get-class-curriculum.ts` | 0 | 27 | 0 | `getClassCurriculum`:29 |
| `src/classes/get-class-detail-with-curriculum.ts` | 0 | 10 | 0 | `getClassDetailWithCurriculum`:19 |
| `src/classes/get-class-lesson-analytics.ts` | 0 | 53 | 0 | `getColorCode`:12, `truncateText`:13, `getClassLessonAnalytics`:22 |
| `src/classes/get-class-roster.ts` | 0 | 21 | 0 | `getClassRoster`:22, `removeStudentFromClass`:72 |
| `src/classes/get-class.ts` | 0 | 9 | 0 | `getClassDetail`:23 |
| `src/classes/join-class.ts` | 0 | 21 | 0 | `constructor`:7, `isUniqueViolation`:13, `joinClass`:42 |
| `src/classes/list-assignment.ts` | 0 | 16 | 0 | `listAssignments`:32 |
| `src/classes/list-classes-with-counts.ts` | 0 | 9 | 0 | `listClassesWithCounts`:23 |
| `src/classes/update-class.ts` | 0 | 15 | 0 | `updateClass`:22 |
| `src/codecamp/errors.ts` | 0 | 12 | 100 | `constructor`:2, `constructor_2`:9, `constructor_3`:16, `constructor_4`:23, `constructor_5`:30, `constructor_6`:37 |
| `src/curriculum/errors.ts` | 0 | 4 | 100 | `constructor`:2, `constructor_2`:9 |
| `src/curriculum/get-lesson-by-slug.ts` | 0 | 17 | 0 | `getLessonBySlug`:23 |
| `src/games/errors.ts` | 0 | 8 | 100 | `constructor`:13, `constructor_2`:26, `constructor_3`:41 |
| `src/gamification/errors.ts` | 0 | 4 | 0 | `constructor`:5, `constructor_2`:15 |
| `src/interventions/list-alerts.ts` | 0 | 45 | 0 | `listAlerts`:86 |
| `src/licenses/errors.ts` | 0 | 4 | 100 | `constructor`:2, `constructor_2`:9 |
| `src/mastery/legacy.ts` | 0 | 12 | 0 | `constructor`:13, `recordRun`:27, `recordRunFailure`:51, `resetRateLimitStore`:57 |
| `src/mastery/record-run.ts` | 0 | 98 | 0 | `constructor`:21, `getPgErrorCode`:30, `assertRateLimit`:40, `serializeRecords`:66, `loadAttemptContext`:75, `recordRun`:148 |
| `src/primary-books/contracts.ts` | 0 | 2 | 100 | no functions (constants/types) |
| `src/progress/errors.ts` | 0 | 4 | 100 | `constructor`:2, `constructor_2`:9 |
| `src/quiz/errors.ts` | 0 | 4 | 100 | `constructor`:2, `constructor_2`:9 |
| `src/reading/fsrs-scheduler.ts` | 0 | 40 | 0 | `clampDifficulty`:59, `scheduleDays`:74, `scheduleFsrsReview`:113, `scheduleFsrsReviewNow`:155 |
| `src/reading/get-school-segments.ts` | 0 | 73 | 0 | `resolveLicenseScope`:91, `getSchoolSegmentsData`:147 |
| `src/reading/get-system-dashboard.ts` | 0 | 22 | 0 | `getSystemDashboardData`:56 |
| `src/reading/permissions.ts` | 0 | 2 | 100 | no functions (constants/types) |
| `src/reports/errors.ts` | 0 | 4 | 100 | `constructor`:2, `constructor_2`:9 |
| `src/rpg/permissions.ts` | 0 | 2 | 100 | no functions (constants/types) |
| `src/students/get-student-achievements.ts` | 0 | 4 | 0 | `getStudentAchievements`:14 |
| `src/students/get-student-assignments.ts` | 0 | 5 | 0 | `getStudentAssignments`:14 |
| `src/students/get-student-class-analytics.ts` | 0 | 43 | 0 | `getColorCode`:11, `getStudentClassAnalytics`:20 |
| `src/students/get-student-lesson-analytics.ts` | 0 | 34 | 0 | `getColorCode`:10, `getStudentLessonAnalytics`:19 |
| `src/students/get-student-lesson-progress.ts` | 0 | 12 | 0 | `getStudentLessonProgress`:18 |
| `src/teachers/get-teacher-dashboard.ts` | 0 | 29 | 0 | `getTeacherDashboard`:16, `computeClassProgress`:33, `countStudentsNeedingAttention`:51, `fetchRecentCompletions`:58 |
| `src/workbooks/ai-proposal.ts` | 0 | 19 | 0 | `constructor`:89, `approveWorkbookProposal`:123 |
| `src/workbooks/coverage-record.ts` | 0 | 17 | 0 | `constructor`:59, `recordWorkbookCoverage`:88 |
| `src/workbooks/edition-repository-port.ts` | 0 | 2 | 100 | no functions (constants/types) |
| `src/students/get-student-mastery-profile.ts` | 3.03 | 33 | 0 | `getMasteryLabel`:8, `getMasteryColorToken`:9, `extractStrandCode`:10, `getStrandTitle`:11, `getStudentMasteryProfile`:20 |
| `src/students/get-student-gamification-profile.ts` | 5.55 | 18 | 0 | `getXpProgress`:12, `getLevelName`:21, `getStudentGamificationProfile`:32 |
| `src/students/get-my-gamification.ts` | 5.88 | 17 | 0 | `getXpProgress`:12, `getLevelName`:21, `getMyGamification`:31 |
| `src/quiz/submit-attempt.ts` | 39.77 | 88 | 38.33 | `startQuiz`:42 |
| `src/codecamp/review-jobs.ts` | 42.85 | 14 | 11.11 | `listDeadReviewJobs`:74 |
| `src/workbooks/in-memory-edition-repository.ts` | 48.43 | 64 | 43.58 | `createDraft`:59, `listDrafts`:71, `findEditionByIdempotencyKey`:89, `nextEditionVersion`:98, `updateDraftStatus`:150, `updateDraftContent`:180 |
| `src/activity/drizzle-activity-persistence.ts` | 55.95 | 84 | 52.54 | `actorMatches`:40, `appendBatch`:115, `getTeacherSummary`:268, `retryPendingActivityMasteryProjections`:300 |
| `src/workbooks/html-renderer.ts` | 56.52 | 23 | 66.66 | `createHtmlWorkbookRenderer`:110, `renderEdition`:112 |

### packages/api — 9 files under 60%

| File | Lines % | Lines | Branches % | Untested functions (first 6) |
|---|---:|---:|---:|---|
| `src/root.ts` | 0 | 2 | 100 | only anonymous callbacks |
| `src/sales-root.ts` | 0 | 1 | 100 | no functions (constants/types) |
| `src/routes/activity/index.ts` | 0 | 9 | 0 | `handleActivityHttpRequest`:42 |
| `src/routes/apk-challenges/index.ts` | 0 | 87 | 0 | `createApkChallengeClassesRoute`:41, `createApkChallengeTeacherClassesRoute`:75, `readCookie`:113, `error`:119, `authenticate`:123, `sameOrigin`:134 |
| `src/routes/auth/logout.ts` | 0 | 6 | 0 | `handleLogout`:12 |
| `src/routes/auth/session.ts` | 0 | 8 | 0 | `handleSession`:14 |
| `src/routes/auth/impersonate.ts` | 21.87 | 32 | 18.75 | only anonymous callbacks |
| `src/routers/reports.ts` | 50 | 4 | 100 | only anonymous callbacks |
| `src/routers/sales.ts` | 55 | 80 | 58.53 | only anonymous callbacks |

### packages/auth — 3 files under 60%

| File | Lines % | Lines | Branches % | Untested functions (first 6) |
|---|---:|---:|---:|---|
| `src/audit-retention.ts` | 13.63 | 22 | 11.76 | `purgeExpiredAuditEvents`:41 |
| `src/audit-retention-job.ts` | 30 | 40 | 46.15 | `tryAcquireAdvisoryLock`:37, `releaseAdvisoryLock`:65, `runPurgeWithLock`:92 |
| `src/permissions.ts` | 54.54 | 11 | 25 | `registerDomainModulePermissions`:25 |

### packages/backend — 8 files under 60%

| File | Lines % | Lines | Branches % | Untested functions (first 6) |
|---|---:|---:|---:|---|
| `src/kernel/postgres-idempotency.ts` | 0 | 50 | 0 | `tenantKey`:26, `replayOutput`:32, `acquireInTransaction`:43, `createPostgresDurableIdempotencyPort`:153, `acquire`:157, `acquireWithPolicy`:167 |
| `src/modules/company-identity/postgres-rate-limit.ts` | 0 | 17 | 0 | `identifierHash`:7, `createPostgresCompanyLoginRateLimit`:19, `check`:29, `recordFailure`:40, `recordSuccess`:79 |
| `src/modules/company-identity/public-route-adapter.ts` | 0 | 2 | 100 | `createCompanyIdentityRouteAdapter`:21 |
| `src/modules/company-identity/postgres-dev-local-product-access.ts` | 0.98 | 102 | 0 | `asSql`:37, `validateDevLocalProductAccessInput`:73, `preflight`:91, `readCandidates`:118, `readInventory`:169, `readRoleDefinitions`:182 |
| `src/modules/company-identity/postgres-repository.ts` | 6.45 | 248 | 14.47 | `asSql`:25, `normalizeUsername`:29, `digest`:40, `stableJson`:58, `assertCompanyAdmin`:73, `loadEmployee`:121 |
| `src/modules/company-identity/postgres-codecamp-migration.ts` | 11.87 | 160 | 11.42 | `assertDatabaseAndTables`:132, `preflightSource`:156, `preflightTarget`:201, `assertIdentifier`:246, `readOwnership`:255, `readSource`:304 |
| `src/modules/company-identity/dev-local-product-access.ts` | 27.02 | 111 | 0 | `constructor`:79, `deriveDevLocalWorkbooksApplicationId`:261, `normalizeDevLocalUsername`:280, `assertLocalOnlyDatabaseHost`:297, `resolveDevLocalTargetAccount`:325, `resolveAdminRoleKeyForApplication`:370 |
| `src/jobs/adapters/postgres/index.ts` | 55.06 | 158 | 40.19 | `opaqueLeaseToken`:99, `tenantFromRow`:188, `runningEnvelope`:198, `leaseMismatch`:236 |

## Top 10 findings by risk

1. **`packages/domain/src/quiz/submit-attempt.ts:169` — grading.** No test covers the check that stops a student from submitting another student's attempt. No test covers the retake path either: the best-score update at line 216 and the invalid-question return at line 199. Smallest fix: add mock-DB tests for the 403 owner check, a second attempt that keeps the higher best score, and a deleted question.
2. **`packages/domain/src/quiz/submit-attempt.ts:42` — grading, data write.** `startQuiz` has 0% coverage. It runs the enrollment check (line 56), picks questions, and inserts the attempt and the completion row. Smallest fix: add tests for a student who is not enrolled (403), a bank with fewer than 4 questions, and a first start that inserts IN_PROGRESS.
3. **`packages/domain/src/mastery/record-run.ts:132` — grading, data write.** `recordRun` has 0% coverage. It writes mastery records inside a serializable transaction, and its rate limit is an in-process `Map` (line 17), so each container keeps its own count. Smallest fix: test the 403, 409, already-complete and processed branches with the mock DB, and note the per-instance limit in tech debt.
4. **`packages/backend/src/modules/company-identity/postgres-repository.ts:73` — auth.** Line coverage is 6.45%. `assertCompanyAdmin` and the other admin queries run only in database suites, and two of those suites fail without a URL instead of skipping. Smallest fix: wrap both suites in `describe.skipIf(!process.env.COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL)` and run them in a CI job with Postgres.
5. **`packages/backend/src/modules/company-identity/postgres-rate-limit.ts:19` — auth.** The login lockout adapter has 0% coverage. No test checks the key check, the 5-attempt username limit, the 30-attempt IP limit, or the 15-minute window. Smallest fix: add one Postgres integration test that records 5 failures and expects `check` to return false.
6. **`packages/api/src/routes/auth/session.ts:14` and `packages/api/src/routes/auth/logout.ts:12` — auth.** Both handlers have 0% coverage. A regression could return the wrong user's data or leave a session active after logout. Smallest fix: add tests that mock `validateSession` and `deleteSession`, then check a null session and that logout clears the cookie.
7. **`packages/auth/src/audit-retention.ts:41` — destructive data write.** `purgeExpiredAuditEvents` has 13.63% line coverage. It deletes audit rows in a loop, and only database suites test it. Those suites skipped here. Smallest fix: add a unit test with a fake `execute` that returns one full batch and then one short batch, and check the total and the audit event.
8. **`packages/domain/src/reading/get-school-segments.ts:110` — auth, license scope.** `resolveLicenseScope` has 0% coverage. A SYSTEM user who sends an access key reads another license's data with no audit event. Smallest fix: add tests for each of the four branches, and confirm whether the access-key path should skip the audit.
9. **`packages/domain/src/classes/archive-class.ts:38` — destructive data write.** `archiveClass` has 0% coverage. It hard-deletes the class row even though its name says archive, and it writes no audit event. Smallest fix: add tests for the owner, admin and forbidden cases, then decide whether to soft-delete or rename it.
10. **`packages/domain/src/classes/join-class.ts:34` — data write, tenant.** `joinClass` has 0% coverage. It skips the tenant DB on purpose and enrolls across schools by join code. Smallest fix: add tests for an unknown code, a double join (unique violation becomes `AlreadyEnrolledError`), and a check that the inserted `schoolId` is the class's school.

Also untested: `packages/backend/src/kernel/postgres-idempotency.ts:151` (0%, write replay safety), `packages/domain/src/classes/create-assignment.ts` and `delete-assignment.ts` (0%, teacher-owned writes), and `packages/api/src/routes/apk-challenges/index.ts` (0%, cookie auth and same-origin check).
