# Pilot report: domain coverage tests, pass 2

## Summary

- Base: commit 6d64004c5 on branch `pilot/cloud-domain-coverage-tests`.
- Branch: `pilot/cloud-domain-coverage-tests-2`.
- Scope: test files and test fixtures under `packages/domain`. No source file changed.
- Added 13 test files and 1 test fixture in 15 commits.
- The new files hold 124 tests: 120 pass, and 4 `it.fails` tests mark 1 real defect.
- Domain lines rose from 88.11% to 94.76%. Branches rose from 75.62% to 82.56%.
- Files under 60% line coverage fell from 26 to 0.
- Tests that need a database server or a secret stay out. The 4 suites that skip themselves still skip.
- Database tests use the in-process PGlite harness (`src/__tests__/helpers/testDb.ts`). They need no server and no secret.

## Order of work

1. Data writes: activity batch append, assessment guards, outbox retry.
2. Auth and license scope: school segments, cross-license audit.
3. Owner checks: intervention alerts, class reads, student reads.
4. Grading reads: lesson analytics, mastery profile, AI advice gates.
5. Dashboards, the HTML renderer port, and constant-only files.

## Coverage

Coverage counts only the domain package's own tests.

| Measure | Before | After |
|---|---:|---:|
| Lines | 88.11% (7769/8817) | 94.76% (8355/8817) |
| Branches | 75.62% (5357/7084) | 82.56% (5849/7084) |
| Statements | 85.60% (8714/10179) | 93.01% (9468/10179) |
| Files under 60% lines | 26 | 0 |

## Coverage per file

| File | Lines before | Lines after | Branches before | Branches after |
|---|---:|---:|---:|---:|
| `src/activity/drizzle-activity-persistence.ts` | 55.95 | 96.42 | 52.54 | 86.44 |
| `src/activity/codecamp-activity-service.ts` | 0 | 94.73 | 0 | 100 |
| `src/reading/get-school-segments.ts` | 0 | 98.63 | 0 | 83.92 |
| `src/interventions/list-alerts.ts` | 0 | 100 | 0 | 97.05 |
| `src/ai/get-recommendation.ts` | 0 | 97.72 | 0 | 88.57 |
| `src/classes/get-class.ts` | 0 | 100 | 0 | 100 |
| `src/classes/get-class-detail-with-curriculum.ts` | 0 | 100 | 0 | 75 |
| `src/classes/get-class-curriculum.ts` | 0 | 100 | 0 | 94.11 |
| `src/classes/get-class-analytics-overview.ts` | 0 | 100 | 0 | 83.33 |
| `src/classes/get-class-lesson-analytics.ts` | 0 | 100 | 0 | 66.19 |
| `src/classes/list-assignment.ts` | 0 | 100 | 0 | 90 |
| `src/classes/list-classes-with-counts.ts` | 0 | 100 | 0 | 100 |
| `src/curriculum/get-lesson-by-slug.ts` | 0 | 100 | 0 | 96.66 |
| `src/students/get-student-class-analytics.ts` | 0 | 97.67 | 0 | 80 |
| `src/students/get-student-lesson-analytics.ts` | 0 | 100 | 0 | 69.64 |
| `src/students/get-student-lesson-progress.ts` | 0 | 100 | 0 | 100 |
| `src/students/get-student-mastery-profile.ts` | 3.03 | 100 | 0 | 82.6 |
| `src/students/get-student-achievements.ts` | 0 | 100 | 0 | 100 |
| `src/students/get-student-assignments.ts` | 0 | 100 | 0 | 75 |
| `src/teachers/get-teacher-dashboard.ts` | 0 | 100 | 0 | 72.22 |
| `src/reading/get-system-dashboard.ts` | 0 | 100 | 0 | 88.88 |
| `src/workbooks/html-renderer.ts` | 56.52 | 100 | 66.66 | 100 |
| `src/workbooks/edition-repository-port.ts` | 0 | 100 | 100 | 100 |
| `src/primary-books/contracts.ts` | 0 | 100 | 100 | 100 |
| `src/reading/permissions.ts` | 0 | 100 | 100 | 100 |
| `src/rpg/permissions.ts` | 0 | 100 | 100 | 100 |

## Tests added

| Test file | Tests | What the tests check |
|---|---:|---|
| `src/activity/__tests__/drizzle-activity-persistence-writes.test.ts` | 13 | Session retention, batch append, replayed batches, stale sequences, owner checks, teacher scope, attempt order, assessment conflicts, outbox retry. |
| `src/activity/__tests__/codecamp-activity-service.test.ts` | 6 | Session start for 3 activities, unknown activity, school and platform summaries, missing secret, worker URL, and token. |
| `src/reading/__tests__/get-school-segments.test.ts` | 14 | Query schema, own-license scope, cross-license denial, access key, audit before return, audit failure, segment math, license filter. |
| `src/interventions/__tests__/list-alerts.test.ts` | 8 | Role gate, 404, 403, empty class, low-mastery filter, cache hit, miss, bypass, severity, since, cursor, limit. |
| `src/classes/__tests__/science-class-reads.test.ts` | 19 | Owner, admin, and student checks; framework and grade unit filter; lesson order; analytics math; question difficulty; paging. |
| `src/students/__tests__/science-student-reads.test.ts` | 24 | Self and teacher access, enrollment checks, latest-attempt standards, attempt history, mastery strands, cursor, pending runs. |
| `src/__tests__/science-teacher-recommendation.test.ts` | 11 | Dashboard progress, low-mastery count, recent completions; advice 404, 409, 403, rate limit, cache, dev impersonation. |
| `src/__tests__/science-lesson-system-dashboard.test.ts` | 10 | Lesson read by id, orphan lesson, access per role; dashboard date range, role gate, failed level count. |
| `src/__tests__/science-lesson-slug-lookup.test.ts` | 4 | Marks the slug lookup defect with `it.fails`. |
| `src/workbooks/html-renderer-port.test.ts` | 7 | HTML escape, paragraph order, format and revoked checks, stored bytes, stable checksum, publication event schema. |
| `src/primary-books/__tests__/import-report-contract.test.ts` | 4 | Import actions, `printed` default, integer lesson numbers, dry-run report. |
| `src/reading/__tests__/reading-permissions.test.ts` | 2 | Registered reading keys match the constant; role checks. |
| `src/rpg/__tests__/rpg-permissions.test.ts` | 2 | Registered rpg keys match the constant; only a student equips. |

The test fixture `src/__tests__/helpers/science-fixture.ts` seeds one science school for 5 test files.

## Defects

- Defect: slug lookups throw a database error. Both queries compare the uuid `id` column with a slug string in one `OR`.
  - `src/curriculum/get-lesson-by-slug.ts:27` — `GET /api/lessons/{lessonSlug}` fails for every slug.
  - `src/students/get-student-lesson-progress.ts:26` — a slug in place of a lesson id fails the same way.
  - Postgres casts the slug to uuid and stops with code 22P02. An unknown slug also throws, so no 404 result is returned.
  - Lookups by uuid still work. 4 `it.fails` tests in `src/__tests__/science-lesson-slug-lookup.test.ts` mark the defect.

## Notes, not defects

- `assertCan` checks the role only and ignores the tenant (`packages/auth/src/assert.ts:18`). `resolveLicenseScope` relies on it.
- `getStudentClassAnalytics` skips `assertCan` for the own id, then rejects every student (`src/students/get-student-class-analytics.ts:26`).
- `getStudentLessonAnalytics` shows the same pattern (`src/students/get-student-lesson-analytics.ts:29`). Students cannot read their own analytics.
- `listAssignments` returns 403 to an ADMIN (`src/classes/list-assignment.ts:64`). `getClassCurriculum` also rejects an ADMIN (`src/classes/get-class-curriculum.ts:46`).
- `getSchoolSegmentsData` lists every school name when no license resolves, because `schools` is EXEMPT (`src/reading/get-school-segments.ts:181`).
- The reading admin route rejects an ADMIN without a license, so that path needs SYSTEM.

## Commands

| Command | Exit code | Result |
|---|---:|---|
| `git fetch --unshallow` | 0 | Full history fetched. |
| `pnpm install --frozen-lockfile` | 0 | Installed. One bin-link warning for `tutorial-check`. |
| `./node_modules/.bin/turbo run build --filter=@reading-advantage/domain^...` | 0 | 15 of 15 dependency builds passed. |
| `vitest run --coverage` in `packages/domain`, before | 0 | 191 files passed, 4 skipped. 2360 tests passed, 18 skipped. |
| `vitest run --coverage` in `packages/domain`, after | 0 | 204 files passed, 4 skipped. 2480 tests passed, 4 expected fail, 18 skipped. |
| `tsc --noEmit -p .` in `packages/domain` | 0 | No type errors. |
| `eslint` on the changed files | 0 | No errors and no warnings. |

- The coverage flags were `--coverage.include='src/**/*.ts'`, with `__tests__/` and `*.test.ts` excluded.
- `@vitest/coverage-v8` 4.1.8 was already installed. No package.json or lockfile changed.

## Track ids

- Commits use the track id from each file's git log.
- Some files show no track id in their own log. They came from an archive or sync commit. These commits follow the base: `app_domain_migration_20260603` and `workbook_content_versioning_20260711`.
- `src/rpg/permissions.ts` has no track id. Its commit uses `primary_reward_pieces_20261006`, the oldest rpg module track.
