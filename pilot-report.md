# Pilot report: domain coverage tests

## Summary

- Base: commit 8c6d5f22e on branch `pilot/cloud-domain-coverage-tests`.
- Scope: test files under `packages/domain/src/__tests__/`. No source file changed.
- Added 8 test files with 164 tests in 8 commits.
- Domain lines rose from 82.55% to 88.11%. Branches rose from 71.58% to 75.62%.
- Files under 60% line coverage fell from 53 to 26.
- No real defect found. No test uses `it.fails`.
- Tests that need a database or a secret stay out. The 4 suites that skip themselves still skip.

## Order of work

1. Grading and data writes: mastery runs, quiz start and submit.
2. Owner checks and deletes: class writes, joins, roster removals.
3. Review scheduling and XP reads.
4. Workbook approval rules and the in-memory repository.
5. Admin review jobs and domain error classes.

## Coverage per file

Coverage counts only the domain package's own tests.

| File | Lines before | Lines after | Branches before | Branches after |
|---|---:|---:|---:|---:|
| `src/mastery/record-run.ts` | 0 | 97.95 | 0 | 90.76 |
| `src/mastery/legacy.ts` | 0 | 100 | 0 | 100 |
| `src/quiz/submit-attempt.ts` | 39.77 | 100 | 38.33 | 93.33 |
| `src/classes/join-class.ts` | 0 | 100 | 0 | 100 |
| `src/classes/archive-class.ts` | 0 | 100 | 0 | 100 |
| `src/classes/delete-assignment.ts` | 0 | 100 | 0 | 100 |
| `src/classes/update-class.ts` | 0 | 100 | 0 | 100 |
| `src/classes/create-assignment.ts` | 0 | 100 | 0 | 100 |
| `src/classes/get-class-roster.ts` | 0 | 100 | 0 | 100 |
| `src/classes/create-science-class.ts` | 0 | 95.45 | 0 | 100 |
| `src/reading/fsrs-scheduler.ts` | 0 | 100 | 0 | 100 |
| `src/students/get-my-gamification.ts` | 5.88 | 100 | 0 | 100 |
| `src/students/get-student-gamification-profile.ts` | 5.55 | 100 | 0 | 80 |
| `src/workbooks/coverage-record.ts` | 0 | 100 | 0 | 100 |
| `src/workbooks/ai-proposal.ts` | 0 | 100 | 0 | 100 |
| `src/workbooks/in-memory-edition-repository.ts` | 48.43 | 100 | 43.58 | 100 |
| `src/codecamp/review-jobs.ts` | 42.85 | 100 | 11.11 | 100 |
| `src/articles/errors.ts` | 0 | 100 | 100 | 100 |
| `src/assignments/errors.ts` | 0 | 100 | 100 | 100 |
| `src/codecamp/errors.ts` | 0 | 100 | 100 | 100 |
| `src/curriculum/errors.ts` | 0 | 100 | 100 | 100 |
| `src/games/errors.ts` | 0 | 100 | 100 | 100 |
| `src/gamification/errors.ts` | 0 | 100 | 0 | 100 |
| `src/licenses/errors.ts` | 0 | 100 | 100 | 100 |
| `src/progress/errors.ts` | 0 | 100 | 100 | 100 |
| `src/quiz/errors.ts` | 0 | 100 | 100 | 100 |
| `src/reports/errors.ts` | 0 | 100 | 100 | 100 |

The other 26 files under 60% did not change. They include activity persistence, analytics reads, `get-recommendation.ts`, and `list-alerts.ts`.

## Tests added

| Test file | Tests | What the tests check |
|---|---:|---|
| `mastery-record-run.test.ts` | 20 | Role gate, 404/403/409, disabled flag, run states, unique-violation queueing, mastery upserts, metrics, rate limit and window reset, failure upsert, legacy error mapping. |
| `quiz-start-submit.test.ts` | 17 | Start: lesson, enrollment, bank size, zero points, quarter selection, attempt number, completion row. Submit: grading, best score, XP plus streak bonus, profile creation. |
| `classes-writes.test.ts` | 40 | Owner or admin checks before every delete and update, join-code enrollment, duplicate joins, name rules, due dates, roster mapping, join-code retries. |
| `fsrs-scheduler.test.ts` | 18 | Intervals per rating, difficulty bounds, stability floor, rating order, no input change, start from now. |
| `students-gamification.test.ts` | 8 | Own-profile gate, level names, progress cap, top level, profile creation for a student without one. |
| `workbooks-coverage-proposal-repository.test.ts` | 26 | Coverage tenant and edition match, revoked editions, duplicates. Proposal self-approval ban, source drift, review state. Repository conflicts. |
| `codecamp-review-jobs-admin.test.ts` | 8 | Admin gate, paging clamps, column mapping, clean requeue, missing job. |
| `domain-error-classes.test.ts` | 27 | Name, base class, and message for 26 error classes; validation issues; custom XP message. |

## Defects

- No real defect found.
- Note, not a defect: `getStudentGamificationProfile` skips `assertCan` when `studentId` equals the caller id (`src/students/get-student-gamification-profile.ts:33`). Any role can then create its own profile.
- Note, not a defect: `startQuiz` shuffles with `sort(() => Math.random() - 0.5)` (`src/quiz/submit-attempt.ts:73`). This shuffle is not uniform.
- Note, not a defect: `WorkbookCoverageErrorCode` lists `EDITION_NOT_PUBLISHED`, but no code path throws it (`src/workbooks/coverage-record.ts:39`).

## Track ids

- Commits use the track id from each file's git log.
- Some files show no track id in their own log. They came from a commit whose body names the track.
- Class, mastery run, and gamification files: `app_domain_migration_20260603`, from the archive commit 90abb4fc7.
- Error classes: `domain_module_decomposition_20260603`, from commit 4f622f0df.
- Workbook files show no track in git. The `workbook_content_versioning_20260711` spec owns AI proposals and editions. The commit hook needs a track id.

## Commands

Run from the repository root unless a path is shown.

| Command | Exit | Result |
|---|---:|---|
| `git fetch --unshallow` | 0 | Full history fetched. |
| `pnpm install --frozen-lockfile` | 0 | Lockfile unchanged. |
| `./node_modules/.bin/turbo run build --filter=@reading-advantage/domain^...` | 0 | 15 of 15 tasks built. |
| `cd packages/domain && npx vitest run --coverage --coverage.reportOnFailure --coverage.include='src/**/*.ts' --coverage.exclude='**/__tests__/**' --coverage.exclude='**/*.test.ts'` (before) | 0 | 183 files passed, 4 skipped. 2196 tests passed, 18 skipped. |
| `npx vitest run <new test file>` (once per file) | 0 | All new tests passed. |
| `npx eslint <new test file>` (once per file) | 0 | No lint errors. |
| Same coverage command (after) | 0 | 191 files passed, 4 skipped. 2360 tests passed, 18 skipped. |

- Totals before: lines 82.55% (7279/8817), branches 71.58% (5071/7084).
- Totals after: lines 88.11% (7769/8817), branches 75.62% (5357/7084).
- The package `tsc` excludes `src/__tests__`. A separate check of the new files shows only partial `UserContext` objects. Existing tests use the same pattern.
